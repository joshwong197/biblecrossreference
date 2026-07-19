import { useEffect, useMemo, useState } from 'react';
import StatCard from '../components/explore/StatCard';
import ConnectionCard from '../components/explore/ConnectionCard';
import SpotlightCard from '../components/explore/SpotlightCard';
import QuotedOtCard from '../components/explore/QuotedOtCard';
import SynopticCard from '../components/explore/SynopticCard';
import SuperlativeCard from '../components/explore/SuperlativeCard';
import '../explore.css';

const INITIAL_COUNT = 30;
const PAGE_SIZE = 20;

/** Round-robin weave: pull one item from each non-empty queue per cycle so
 * consecutive cards are always of a different kind. Queues are consumed in
 * place. */
function weave(queues) {
  const out = [];
  const live = queues.filter((q) => q.length);
  let i = 0;
  while (live.length) {
    const q = live[i % live.length];
    out.push(q.shift());
    if (!q.length) {
      live.splice(live.indexOf(q), 1);
    } else {
      i += 1;
    }
  }
  return out;
}

/** De-duplicate a list of objects by a key function, keeping the first seen
 * (the data arrives strongest/highest-voted first). */
function dedupe(list, keyFn) {
  const seen = new Set();
  return list.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Interleave two arrays so their sources alternate (a, b, a, b, ...),
 * appending any remainder. */
function zip(a, b) {
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/** Build the ordered feed of typed card descriptors from insights.json. */
function buildFeed(data) {
  const total = data.stats.total;

  const spotlights = data.most_connected_verses.slice(0, 18).map((v, i) => ({
    type: 'spotlight',
    key: `spot-${v.ref}-${i}`,
    props: { ref: v.ref, text: v.text, count: v.count, byTier: v.by_tier, total },
  }));

  const quoted = data.most_quoted_ot.slice(0, 15).map((q, i) => ({
    type: 'quoted',
    key: `quoted-${q.ref}-${i}`,
    props: { ref: q.ref, text: q.text, ntQuotes: q.nt_quotes, quoters: q.quoters, total },
  }));

  const messianic = dedupe(data.messianic_thread, (e) => `${e.ot}|${e.nt}`)
    .slice(0, 16)
    .map((e, i) => ({
      type: 'connection',
      key: `mess-${e.ot}-${e.nt}-${i}`,
      props: {
        fromRef: e.ot, fromText: e.ot_text, toRef: e.nt, toText: e.nt_text,
        tier: e.tier, votes: e.votes, ambiguous: !!e.ambiguous, total,
      },
    }));

  const genrev = dedupe(data.genesis_revelation, (e) => `${e.gen}|${e.rev}`).map((e, i) => ({
    type: 'connection',
    key: `genrev-${e.gen}-${e.rev}-${i}`,
    props: {
      fromRef: e.gen, fromText: e.gen_text, toRef: e.rev, toText: e.rev_text,
      tier: e.tier, votes: e.votes, ambiguous: !!e.ambiguous, total,
    },
  }));

  // One "connection" per weave cycle, sources alternating between the
  // messianic thread and the Genesis->Revelation arc.
  const connections = zip(messianic, genrev);

  const specials = [];
  const sw = data.synoptic_web;
  if (sw) {
    specials.push({
      type: 'synoptic',
      key: 'synoptic',
      props: { pairCounts: sw.pair_counts, densest: sw.densest_parallels.slice(0, 8), total },
    });
  }
  const sup = data.superlatives || {};
  for (const variant of [
    'most_connected_chapter',
    'highest_voted_pair',
    'most_quoting_nt_book',
    'tier1_cross_testament_count',
  ]) {
    if (sup[variant] !== undefined) {
      specials.push({
        type: 'superlative',
        key: `sup-${variant}`,
        props: { variant, data: sup[variant], total },
      });
    }
  }

  const woven = weave([spotlights, connections, quoted, specials]);

  return [
    { type: 'stat', key: 'stat', props: { stats: data.stats } },
    ...woven,
  ];
}

function renderCard(item) {
  switch (item.type) {
    case 'stat':
      return <StatCard {...item.props} />;
    case 'connection':
      return <ConnectionCard {...item.props} />;
    case 'spotlight':
      return <SpotlightCard {...item.props} />;
    case 'quoted':
      return <QuotedOtCard {...item.props} />;
    case 'synoptic':
      return <SynopticCard {...item.props} />;
    case 'superlative':
      return <SuperlativeCard {...item.props} />;
    default:
      return null;
  }
}

export default function ExplorePage() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(INITIAL_COUNT);

  useEffect(() => {
    let alive = true;
    fetch('/data/insights.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!alive) return;
        setData(json);
        setStatus('ready');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  const feed = useMemo(() => (data ? buildFeed(data) : []), [data]);

  return (
    <div className="explore-page">
      <div className="explore-page__inner">
        <header className="explore-head">
          <h1 className="explore-head__title">Explore</h1>
          <p className="explore-head__sub">
            Striking connections across scripture, mined from the reference
            data — one at a time. Every claim is one tap from the verses that
            back it.
          </p>
        </header>

        {status === 'loading' && (
          <p className="explore-note">Gathering connections&hellip;</p>
        )}

        {status === 'error' && (
          <p className="explore-note">
            Couldn&rsquo;t load the insight data just now. Try again in a moment.
          </p>
        )}

        {status === 'ready' && (
          <>
            <div className="explore-feed">
              {feed.slice(0, visible).map((item) => (
                <div key={item.key} className="explore-feed__item" data-type={item.type}>
                  {renderCard(item)}
                </div>
              ))}
            </div>

            {visible < feed.length && (
              <div className="explore-more">
                <button
                  type="button"
                  className="explore-more__btn"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

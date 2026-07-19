import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TIERS } from '../constants/tiers';
import '../about.css';

const STATS_URL = '/data/classification_stats.json';

export default function AboutPage() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(STATS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStatsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recallPct = stats ? (stats.gold_standard.recall * 100).toFixed(1) : null;
  const tier2AmbigPct = stats
    ? Math.round((stats.ambiguous_by_tier['2'] / stats.by_tier['2']) * 100)
    : null;

  return (
    <div className="about-page">
      <div className="about-content">
        <Link to="/" className="about-back">&larr; Back to visualization</Link>

        <h1 className="about-h1">About This Project</h1>

        <section className="about-section">
          <p className="about-p">
            This is an interactive visualization of cross-references within the Bible &mdash;
            connections between passages that quote, echo, parallel, or reference each other.
            The original visualization was created by Chris Harrison and Christoph R&ouml;mhild.
            This project recreates it from open data, adds a rule-based classification system
            with a published, checkable ruleset, and offers several ways to explore the
            connections: a page-per-chapter Reader with references shown inline, an Arc
            Diagram, a book-to-book connection matrix, and a 3D Scroll &mdash; the canon
            coiled into a helix with every cross-reference a chord through its interior.
          </p>
        </section>

        <section className="about-section">
          <p className="eyebrow">Classification</p>
          <h2 className="about-h2">The Five-Tier System</h2>
          <p className="about-p">
            Not all cross-references are equal. A direct quote is fundamentally different from
            two passages that happen to mention the same place name. Every one of the{' '}
            {stats ? stats.total.toLocaleString() : 'roughly 340,000'} cross-references is
            classified into one of five tiers by an automated pipeline &mdash; word-overlap
            formulas and citation-phrase detection, not manual tagging or crowd voting.
          </p>

          <div className="tier-list">
            <TierCard
              tier={1}
              stats={stats}
              description="Either the two verses share a run of five or more identical words across a testament boundary, or the later verse (or the one just before it) carries a citation formula (&ldquo;it is written&rdquo;, &ldquo;which was spoken by the prophet&rdquo;) alongside real word overlap with the earlier verse. Speech-report formulas like &ldquo;thus saith the LORD&rdquo; are deliberately excluded &mdash; they introduce original speech, not a citation of an earlier text."
              example="Matthew 4:4 quoting Deuteronomy 8:3"
            />
            <TierCard
              tier={2}
              stats={stats}
              description="The verse carries a fulfillment formula (&ldquo;that it might be fulfilled&rdquo;) pointing at an earlier passage, without the word-for-word overlap Tier 1 requires."
              example="Matthew 1:22-23 referencing Isaiah 7:14"
            />
            <TierCard
              tier={3}
              stats={stats}
              description="The same event, speech, genealogy, or law recorded independently in two books of the same testament &mdash; including verbatim parallels such as Kings &amp; Chronicles or the Synoptic Gospels, which since the v3 pipeline are routed here rather than counted as quotations. Also includes passages with strong shared vocabulary and shared proper nouns without a verbatim run."
              example="Synoptic Gospel parallels (Matthew/Mark/Luke); 2 Kings 18-20 &amp; Isaiah 36-39"
            />
            <TierCard
              tier={4}
              stats={stats}
              description="Shared theological concepts, imagery, or doctrine without explicit citation or a verbatim run. These calls are more subjective by nature."
              example="&ldquo;Shepherd&rdquo; imagery in Psalm 23, Ezekiel 34, and John 10"
            />
            <TierCard
              tier={5}
              stats={stats}
              description="Two passages share a place name, person name, or common word but have no meaningful narrative or theological connection. This is the default when nothing stronger fires."
              example="1 Samuel 1:1 and Judges 19:1 both mention &ldquo;mount Ephraim&rdquo;"
            />
          </div>
        </section>

        <section className="about-section">
          <p className="eyebrow">Under the hood</p>
          <h2 className="about-h2">How Detection Actually Works</h2>
          <p className="about-p">
            Every reference has a <strong>quoter</strong> side and a <strong>quoted</strong> side.
            The quoter is defined as whichever verse falls later in canonical order (a higher
            book number, then chapter, then verse) &mdash; only the quoter&rsquo;s verse and the
            one immediately before it are scanned for citation formulas, since a formula only
            counts as a citation if it sits on the later side of the pair.
          </p>
          <p className="about-p">
            A separate detector looks for <strong>verbatim runs</strong>: a contiguous stretch
            of identical words (lowercased, punctuation stripped) shared by both verses. The
            minimum run length was tuned empirically against a gold-standard set rather than
            guessed &mdash; lengths 4, 5, and 6 were all tried, and 5 gave the best trade-off
            between catching real quotations and avoiding coincidental overlap.
            {stats && (
              <>
                {' '}At N=5 the pipeline finds {stats.by_tier['1'].toLocaleString()} Tier-1
                quotations; N=4 finds more ({stats.verbatim_run.tuning_table[0].tier1_total.toLocaleString()})
                at the cost of more false positives, and N=6 finds fewer
                ({stats.verbatim_run.tuning_table[2].tier1_total.toLocaleString()}) but misses
                genuine short quotations.
              </>
            )}
          </p>
          <p className="about-p">
            <strong>Corpus routing</strong> decides what a verbatim run means: the same wording
            recorded within the same testament (Kings retelling Chronicles, one Synoptic Gospel
            echoing another) is a parallel record of the same material, so it is routed to Tier
            3. The same wording crossing the Old&ndash;New Testament boundary is treated as an
            actual quotation and stays in Tier 1.
            {stats && (
              <>
                {' '}Of {stats.by_tier['1'].toLocaleString()} Tier-1 references,{' '}
                {stats.tier1_by_corpus.cross_testament.toLocaleString()} are cross-testament and
                the rest ({(stats.tier1_by_corpus.ot_to_ot + stats.tier1_by_corpus.nt_to_nt).toLocaleString()})
                reached Tier 1 through a citation formula despite sitting inside one testament.
              </>
            )}
          </p>
        </section>

        <section className="about-section">
          <p className="eyebrow">Read this before trusting a number</p>
          <h2 className="about-h2">Honesty Notes</h2>

          <div className="honesty-note">
            <h3 className="about-h3">Most references are Tier 4-5</h3>
            <p className="about-p">
              {stats ? (
                <>
                  {stats.by_tier['4'].toLocaleString()} references land in Tier 4 and{' '}
                  {stats.by_tier['5'].toLocaleString()} in Tier 5 &mdash; together over 90% of
                  the total. Most of the cross-reference web is thematic echo or shared
                  vocabulary, not quotation. The tier toggles exist so you can filter these out
                  and see the much smaller, much stronger set of direct quotations and parallels
                  underneath.
                </>
              ) : (
                'The large majority of references are Tier 4 (thematic echo) or Tier 5 (shared vocabulary), not quotation or parallel. The tier toggles exist so you can filter past them.'
              )}
            </p>
          </div>

          <div className="honesty-note">
            <h3 className="about-h3">Most of Tier 2 is flagged ambiguous</h3>
            <p className="about-p">
              {stats ? (
                <>
                  About {tier2AmbigPct}% of Tier 2 ({stats.ambiguous_by_tier['2'].toLocaleString()}{' '}
                  of {stats.by_tier['2'].toLocaleString()}) carries the ambiguous flag. That is
                  by design, not a defect: Tier 2 fires whenever a fulfillment formula is
                  present, but a large share of those pairs have zero shared content words with
                  the specific verse TSK paired them with &mdash; the fulfillment language is
                  real, the textual corroboration for that exact pairing is not.
                </>
              ) : (
                'A large majority of Tier 2 carries the ambiguous flag, because a fulfillment formula can be present with zero textual overlap against the specific paired verse.'
              )}
            </p>
          </div>

          <div className="honesty-note">
            <h3 className="about-h3">What the ambiguous flag means</h3>
            <p className="about-p">
              The flag marks a borderline call &mdash; it never changes the tier a reference is
              assigned, only whether the decision that produced it sat squarely inside its
              category or right at the edge (a jaccard score within 0.05 of a threshold, a
              verbatim run of exactly the minimum length, a formula found only in the verse
              before the quoter). Borderline calls are flagged, not hidden or silently
              reclassified.
            </p>
          </div>

          <div className="honesty-note">
            <h3 className="about-h3">Gold-standard evaluation &amp; why perfect recall is impossible</h3>
            <p className="about-p">
              {stats ? (
                <>
                  The classifier is checked against {stats.gold_standard.gold_total} well-attested
                  New Testament quotations of the Old Testament, drawn from settled NT
                  scholarship. {stats.gold_standard.gold_found_in_data} of those pairs exist in
                  the underlying cross-reference data, and the pipeline currently places{' '}
                  {stats.gold_standard.gold_in_tier1_or_2} of them in Tier 1 or 2 &mdash; a
                  recall of {recallPct}%.
                </>
              ) : (
                'The classifier is checked against 236 well-attested New Testament quotations of the Old Testament.'
              )}
            </p>
            <p className="about-p">
              That recall figure will never reach 100%, and forcing it higher would mean
              gaming the metric rather than describing the text honestly. The KJV New Testament
              frequently quotes the Greek Septuagint, while the KJV Old Testament translates
              the Hebrew Masoretic Text &mdash; where the two diverge, word-for-word English
              overlap can be very low even though the quotation is undisputed. The clearest
              example is a person-shift: Isaiah 53:5 reads <em>&ldquo;with his stripes we are
              healed&rdquo;</em> while 1 Peter 2:24 reads <em>&ldquo;by whose stripes ye were
              healed&rdquo;</em>. Any scholar recognizes the quotation; a token-overlap check
              sees two different pronouns and a different verb form and scores it low. That
              pair classifies poorly here, and we say so rather than quietly special-casing it
              to inflate the number.
            </p>
          </div>
        </section>

        <section className="about-section">
          <p className="eyebrow">Verify it yourself</p>
          <h2 className="about-h2">Methodology &amp; Reproducibility</h2>
          <p className="about-p">
            The whole pipeline is four scripts &mdash; vote-band scoring, directionality and
            formula/verbatim classification, gold-standard evaluation, and export &mdash; plus
            this page&rsquo;s own data source, a published rules JSON that the pipeline
            regenerates every run. Nothing above is hand-tuned prose describing the code from
            memory; it is a rendering of the same rules the classifier reads.
          </p>
          {stats && (
            <dl className="rules-list">
              <div className="rules-row">
                <dt>Pass 1 &mdash; vote bands</dt>
                <dd>{stats.rules.pass1_vote_bands}</dd>
              </div>
              <div className="rules-row">
                <dt>Directionality</dt>
                <dd>{stats.rules.directionality}</dd>
              </div>
              <div className="rules-row">
                <dt>Tier 1 &mdash; direct quotation</dt>
                <dd>{stats.rules.tier1_direct_quotation}</dd>
              </div>
              <div className="rules-row">
                <dt>Verbatim corpus routing</dt>
                <dd>{stats.rules.verbatim_corpus_routing}</dd>
              </div>
              <div className="rules-row">
                <dt>Tier 2 &mdash; fulfillment</dt>
                <dd>{stats.rules.tier2_fulfillment}</dd>
              </div>
              <div className="rules-row">
                <dt>Tier 3 &mdash; parallel passage</dt>
                <dd>{stats.rules.tier3_parallel_passage}</dd>
              </div>
              <div className="rules-row">
                <dt>Tier 4 &mdash; thematic echo</dt>
                <dd>{stats.rules.tier4_thematic_echo}</dd>
              </div>
              <div className="rules-row">
                <dt>Tier 5 &mdash; shared vocabulary</dt>
                <dd>{stats.rules.tier5_shared_vocabulary}</dd>
              </div>
              <div className="rules-row">
                <dt>Ambiguous flag</dt>
                <dd>{stats.rules.ambiguous_flag}</dd>
              </div>
            </dl>
          )}
          {statsError && (
            <p className="stats-unavailable">
              Live statistics are unavailable right now, so the tier counts and rules text above
              are not showing &mdash; the descriptions elsewhere on this page still describe the
              current classifier accurately.
            </p>
          )}
        </section>

        <section className="about-section">
          <p className="eyebrow">Data</p>
          <h2 className="about-h2">Data Sources</h2>
          <p className="about-p">
            The cross-reference data comes from OpenBible.info, which compiled
            ~340,000 references primarily from the Treasury of Scripture Knowledge (a
            public-domain reference work). The community has voted on the relevance of each
            reference, producing the confidence votes the classifier&rsquo;s vote bands are
            built from. The Bible text used is the King James Version (public domain), sourced
            via scrollmapper/bible_databases.
          </p>
        </section>

        <section className="about-section">
          <p className="eyebrow">Navigating</p>
          <h2 className="about-h2">How to Read Each View</h2>
          <table className="views-table">
            <tbody>
              <tr>
                <th scope="row">Reader</th>
                <td>
                  Scripture, chapter by chapter, in serif type. Every verse with
                  cross-references shows a row of small tier-colored chips underneath it;
                  tap one to preview the connected verse without leaving the page.
                </td>
              </tr>
              <tr>
                <th scope="row">Arc Diagram</th>
                <td>
                  The Harrison/R&ouml;mhild layout: the Bible laid out as a single line around
                  the edge, with an arc drawn between every pair of cross-referenced passages.
                  Arc color follows the tier or testament color mode.
                </td>
              </tr>
              <tr>
                <th scope="row">Connections (Grid)</th>
                <td>
                  A book&times;book matrix &mdash; every cell is a pair of books, shaded by how
                  many cross-references connect them.
                </td>
              </tr>
              <tr>
                <th scope="row">Scroll</th>
                <td>
                  The 1,189-chapter canon coiled into a 3D helix &mdash; Genesis at the
                  top, Revelation at the bottom &mdash; with every cross-reference drawn
                  as a chord through the open interior. Side-on it echoes the Arc; down
                  the axis the chords form a rose window.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="about-section">
          <p className="eyebrow">Why it matters</p>
          <h2 className="about-h2">Why Do Cross-References Matter?</h2>
          <p className="about-p">
            The Bible was written by approximately 40 different authors over roughly 1,500
            years, in three languages, across multiple continents. Despite this, the
            cross-reference web shows that later authors consistently engage with earlier
            texts &mdash; quoting them, fulfilling their predictions, echoing their imagery,
            and recording the same events.
          </p>
          <p className="about-p">
            This density of intentional, verifiable internal cross-referencing is a
            distinguishing feature of the Bible compared to other compiled anthologies. The
            visualization makes this pattern visible in a way that text alone cannot.
          </p>
        </section>

        <section className="about-section">
          <p className="eyebrow">Credits</p>
          <h2 className="about-h2">Credits</h2>
          <ul className="about-list">
            <li>Chris Harrison / Christoph R&ouml;mhild for the original visualization concept</li>
            <li>OpenBible.info for the cross-reference dataset</li>
            <li>Treasury of Scripture Knowledge (R.A. Torrey) as the underlying reference work</li>
            <li>scrollmapper/bible_databases for the structured data</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function TierCard({ tier, stats, description, example }) {
  const meta = TIERS[tier];
  const count = stats ? stats.by_tier[String(tier)] : null;
  const ambiguous = stats ? stats.ambiguous_by_tier[String(tier)] : null;
  return (
    <div className="tier-card">
      <div className="tier-card-header">
        <span className="tier-swatch" style={{ backgroundColor: `var(${meta.cssVar})` }} />
        <strong className="tier-card-name">Tier {tier} &mdash; {meta.label}</strong>
        {stats && (
          <span className="tier-card-count">
            {count.toLocaleString()} <span className="tier-card-count-label">refs</span>
          </span>
        )}
      </div>
      <p className="tier-desc">{description}</p>
      <p className="tier-example">Example: {example}</p>
      {stats && ambiguous > 0 && (
        <p className="tier-ambig">
          {Math.round((ambiguous / count) * 100)}% flagged ambiguous ({ambiguous.toLocaleString()})
        </p>
      )}
    </div>
  );
}

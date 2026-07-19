import CardShell from './CardShell';
import MethodNote from './MethodNote';
import RefLink from './RefLink';

/**
 * The synoptic web: how densely Matthew, Mark and Luke overlap. Pair totals
 * up top, then the densest chapter-to-chapter parallels as tappable rows —
 * each chapter deep-links into the Reader.
 */
export default function SynopticCard({ pairCounts, densest, total }) {
  return (
    <CardShell eyebrow="The Synoptic Web">
      <p className="xcard__lede">
        Matthew, Mark and Luke retell the same events again and again. These
        are the chapters that overlap most.
      </p>

      <div className="xsyn__pairs">
        {Object.entries(pairCounts).map(([pair, count]) => (
          <div key={pair} className="xsyn__pair">
            <span className="xsyn__pair-name">{pair.replace('-', ' · ')}</span>
            <span className="xsyn__pair-count">{count.toLocaleString('en-US')}</span>
          </div>
        ))}
      </div>

      <ul className="xsyn__rows">
        {densest.map((row) => (
          <li key={`${row.a}-${row.b}`} className="xsyn__row">
            <span className="xsyn__row-refs">
              <RefLink refStr={row.a} variant="chip" />
              <span className="xsyn__row-amp" aria-hidden="true">&harr;</span>
              <RefLink refStr={row.b} variant="chip" />
            </span>
            <span className="xsyn__row-count">{row.count} shared</span>
          </li>
        ))}
      </ul>

      <MethodNote total={total} />
    </CardShell>
  );
}

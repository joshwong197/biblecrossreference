import CardShell from './CardShell';
import TierBreakdown from './TierBreakdown';
import MethodNote from './MethodNote';
import RefLink from './RefLink';

/**
 * The most-connected verses: the verse text set large in serif, its total
 * connection count, and the per-tier mini-breakdown of where those links
 * fall. The ref deep-links into the Reader.
 */
export default function SpotlightCard({ ref: refStr, text, count, byTier, total }) {
  return (
    <CardShell eyebrow="Most Connected">
      <div className="xspot__head">
        <RefLink refStr={refStr} variant="head" />
        <span className="xspot__count">
          <span className="xspot__count-num">{count.toLocaleString('en-US')}</span>
          <span className="xspot__count-label">connections</span>
        </span>
      </div>

      <p className="xscripture xscripture--lg">{text}</p>

      <TierBreakdown byTier={byTier} />

      <MethodNote total={total} />
    </CardShell>
  );
}

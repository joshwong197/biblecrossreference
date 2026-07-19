import CardShell from './CardShell';
import TierBreakdown from './TierBreakdown';
import MethodNote from './MethodNote';

/**
 * Opening card: the shape of the whole dataset. Total classified references,
 * the tier distribution, and the cross-testament / approximate counts —
 * every figure straight from stats, nothing invented.
 */
export default function StatCard({ stats }) {
  return (
    <CardShell eyebrow="The Cross-Reference Map">
      <p className="xstat__headline">
        <span className="xstat__big">
          {stats.total.toLocaleString('en-US')}
        </span>
        <span className="xstat__big-label">classified references</span>
      </p>
      <p className="xstat__lede">
        Every link between two passages, sorted into five tiers by how
        strongly they connect. This feed surfaces the most striking of them,
        one at a time.
      </p>

      <TierBreakdown byTier={stats.by_tier} />

      <div className="xstat__footrow">
        <div className="xstat__cell">
          <span className="xstat__cell-num">
            {stats.cross_testament.toLocaleString('en-US')}
          </span>
          <span className="xstat__cell-label">cross-testament</span>
        </div>
        <div className="xstat__cell">
          <span className="xstat__cell-num">
            {stats.ambiguous_total.toLocaleString('en-US')}
          </span>
          <span className="xstat__cell-label">flagged approximate</span>
        </div>
      </div>

      <MethodNote total={stats.total} />
    </CardShell>
  );
}

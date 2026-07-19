import useAppStore from '../../stores/useAppStore';
import { TIERS, TIER_IDS } from '../../constants/tiers';

/** Sticky pill row at the top of the Reader. Reuses the existing app-wide
 * tier visibility state (shared with the viz pages) — filtered-out tiers
 * disappear from ref lines and counts everywhere, per DESIGN.md. */
export default function TierFilterPills() {
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const toggleTier = useAppStore((s) => s.toggleTier);

  return (
    <div className="reader-tier-pills" role="group" aria-label="Filter cross-reference tiers">
      {TIER_IDS.map((id) => {
        const tier = TIERS[id];
        const on = tierVisibility[id];
        return (
          <button
            key={id}
            type="button"
            className="reader-tier-pill"
            data-off={!on}
            aria-pressed={on}
            onClick={() => toggleTier(id)}
          >
            <span className="reader-tier-pill__dot" style={{ backgroundColor: `var(${tier.cssVar})` }} />
            {tier.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

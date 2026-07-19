import useAppStore from '../../stores/useAppStore';
import { TIERS, TIER_IDS } from '../../constants/tiers';

export default function TierToggle() {
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const toggleTier = useAppStore((s) => s.toggleTier);
  const references = useAppStore((s) => s.references);

  const tierCounts = {};
  if (references) {
    for (const tier of TIER_IDS) {
      tierCounts[tier] = references.filter((r) => r.tier === tier).length;
    }
  }

  return (
    <div className="tier-toggle">
      <div className="viz-label">Tiers</div>
      {TIER_IDS.map((id) => {
        const tier = TIERS[id];
        const checked = tierVisibility[id];
        const count = tierCounts[id] || 0;

        return (
          <label key={id} className="tier-toggle__item" data-off={checked ? undefined : 'true'}>
            <input
              type="checkbox"
              className="tier-toggle__native visually-hidden"
              checked={checked}
              onChange={() => toggleTier(id)}
            />
            <span
              className="tier-toggle__dot"
              style={{
                backgroundColor: checked ? `var(${tier.cssVar})` : 'transparent',
                borderColor: `var(${tier.cssVar})`,
              }}
            />
            <span className="tier-toggle__name">
              {id}. {tier.shortLabel}
            </span>
            <span className="tier-toggle__count">
              {count.toLocaleString()}
            </span>
          </label>
        );
      })}
    </div>
  );
}

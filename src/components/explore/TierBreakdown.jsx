import { TIERS, TIER_IDS } from '../../constants/tiers';

/**
 * Per-tier mini-breakdown: one row per tier present, with the tier dot, its
 * short label, a proportional bar, and a tabular-nums count. Used by the
 * opening stat card and the spotlight cards. Renders only tiers with a count.
 */
export default function TierBreakdown({ byTier }) {
  const max = Math.max(1, ...TIER_IDS.map((id) => byTier[id] || 0));

  return (
    <ul className="xtiers">
      {TIER_IDS.map((id) => {
        const count = byTier[id] || 0;
        if (!count) return null;
        const tier = TIERS[id];
        return (
          <li key={id} className="xtiers__row">
            <span
              className="xtiers__dot"
              style={{ backgroundColor: `var(${tier.cssVar})` }}
            />
            <span className="xtiers__label">{tier.shortLabel}</span>
            <span className="xtiers__bar">
              <span
                className="xtiers__bar-fill"
                style={{
                  width: `${(count / max) * 100}%`,
                  backgroundColor: `var(${tier.cssVar})`,
                }}
              />
            </span>
            <span className="xtiers__count">{count.toLocaleString('en-US')}</span>
          </li>
        );
      })}
    </ul>
  );
}

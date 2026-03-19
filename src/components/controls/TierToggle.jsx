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
    <div style={styles.container}>
      <div style={styles.label}>Tiers</div>
      {TIER_IDS.map((id) => {
        const tier = TIERS[id];
        const checked = tierVisibility[id];
        const count = tierCounts[id] || 0;

        return (
          <label key={id} style={styles.item}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleTier(id)}
              style={{ display: 'none' }}
            />
            <span
              style={{
                ...styles.checkbox,
                backgroundColor: checked ? `var(${tier.cssVar})` : 'transparent',
                borderColor: `var(${tier.cssVar})`,
              }}
            />
            <span style={styles.tierLabel}>
              {id}. {tier.shortLabel}
            </span>
            <span style={styles.count}>
              {count.toLocaleString()}
            </span>
          </label>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '8px 12px',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    marginBottom: 4,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '3px 0',
    cursor: 'pointer',
    fontSize: 13,
  },
  checkbox: {
    display: 'inline-block',
    width: 14,
    height: 14,
    borderRadius: 3,
    border: '2px solid',
    flexShrink: 0,
    transition: 'background-color 0.15s ease',
  },
  tierLabel: {
    color: 'var(--text-primary)',
    flex: 1,
  },
  count: {
    color: 'var(--text-muted)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
};

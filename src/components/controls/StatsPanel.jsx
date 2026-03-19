import { useMemo } from 'react';
import useAppStore from '../../stores/useAppStore';
import { TIERS, TIER_IDS } from '../../constants/tiers';
import { BOOKS } from '../../constants/books';

export default function StatsPanel() {
  const references = useAppStore((s) => s.references);
  const metadata = useAppStore((s) => s.metadata);
  const tierVisibility = useAppStore((s) => s.tierVisibility);

  const stats = useMemo(() => {
    if (!references || !metadata) return null;

    const visible = references.filter((r) => tierVisibility[r.tier]);
    const crossTestament = visible.filter((r) => {
      const fromOT = r.fromBook <= 39;
      const toOT = r.toBook <= 39;
      return fromOT !== toOT;
    });

    // Most connected books
    const bookCounts = {};
    for (const ref of visible) {
      bookCounts[ref.fromBook] = (bookCounts[ref.fromBook] || 0) + 1;
      bookCounts[ref.toBook] = (bookCounts[ref.toBook] || 0) + 1;
    }

    const topBooks = Object.entries(bookCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bookNum, count]) => ({
        name: BOOKS[parseInt(bookNum) - 1]?.abbrev || bookNum,
        count,
      }));

    return {
      total: visible.length,
      crossTestament: crossTestament.length,
      topBooks,
    };
  }, [references, metadata, tierVisibility]);

  if (!stats) return null;

  return (
    <div style={styles.container}>
      <div style={styles.label}>Statistics</div>

      <div style={styles.stat}>
        <span style={styles.statLabel}>Visible refs</span>
        <span style={styles.statValue}>{stats.total.toLocaleString()}</span>
      </div>

      <div style={styles.stat}>
        <span style={styles.statLabel}>Cross-testament</span>
        <span style={styles.statValue}>{stats.crossTestament.toLocaleString()}</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.subLabel}>Most Connected</div>
      {stats.topBooks.map((book) => (
        <div key={book.name} style={styles.stat}>
          <span style={styles.statLabel}>{book.name}</span>
          <span style={styles.statValue}>{book.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    padding: '8px 12px',
    borderTop: '1px solid var(--border)',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: 4,
    marginTop: 4,
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
    fontSize: 12,
  },
  statLabel: {
    color: 'var(--text-secondary)',
  },
  statValue: {
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--border)',
    margin: '6px 0',
  },
};

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
    <div className="stats-panel">
      <div className="viz-label">Statistics</div>

      <div className="stats-panel__stat">
        <span className="stats-panel__stat-label">Visible refs</span>
        <span className="stats-panel__stat-value">{stats.total.toLocaleString()}</span>
      </div>

      <div className="stats-panel__stat">
        <span className="stats-panel__stat-label">Cross-testament</span>
        <span className="stats-panel__stat-value">{stats.crossTestament.toLocaleString()}</span>
      </div>

      <div className="stats-panel__divider" />

      <div className="stats-panel__sublabel">Most Connected</div>
      {stats.topBooks.map((book) => (
        <div key={book.name} className="stats-panel__stat">
          <span className="stats-panel__stat-label">{book.name}</span>
          <span className="stats-panel__stat-value">{book.count.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

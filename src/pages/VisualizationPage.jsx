import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import useAppStore from '../stores/useAppStore';
import { TIERS, TIER_IDS } from '../constants/tiers';
import { TOTAL_CHAPTERS } from '../constants/books';
import SearchBar from '../components/controls/SearchBar';
import TierToggle from '../components/controls/TierToggle';
import ColorModeToggle from '../components/controls/ColorModeToggle';
import StatsPanel from '../components/controls/StatsPanel';
import ReferencePanel from '../components/detail/ReferencePanel';
import './viz-shell.css';
import '../viz-chrome.css';

const ArcDiagram = lazy(() => import('../components/visualizations/ArcDiagram/ArcDiagram'));
const GridView = lazy(() => import('../components/visualizations/GridView/GridView'));
const ScrollView = lazy(() => import('../components/visualizations/ScrollView/ScrollView'));

function VizFallback() {
  return <div className="viz-shell__loading">Loading visualization...</div>;
}

/** Full control stack — desktop sidebar and mobile slide-up sheet share it. */
function VizControls() {
  return (
    <>
      <SearchBar />
      <TierToggle />
      <ColorModeToggle />
      <StatsPanel />
      <ReferencePanel />
    </>
  );
}

export default function VisualizationPage() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setSelectedChapter = useAppStore((s) => s.setSelectedChapter);
  const tierVisibility = useAppStore((s) => s.tierVisibility);
  const toggleTier = useAppStore((s) => s.toggleTier);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Routes /arc, /grid, /scroll drive the view directly — keep the store in
  // sync so any other consumer of activeView stays correct.
  useEffect(() => {
    const view = location.pathname.slice(1);
    if (['arc', 'grid', 'scroll'].includes(view)) {
      setActiveView(view);
    }
  }, [location.pathname, setActiveView]);

  // Deep link: ?ch={globalChapterIndex} (0-based, matching
  // bible_metadata.json chapterDetails[].globalIndex) selects that chapter
  // in the store, so the arc arrives highlighted and ReferencePanel opens.
  // Without ?ch nothing is touched — an unselected /arc stays unhighlighted.
  useEffect(() => {
    const raw = searchParams.get('ch');
    if (raw == null) return;
    const ch = Number(raw);
    if (Number.isInteger(ch) && ch >= 0 && ch < TOTAL_CHAPTERS) {
      setSelectedChapter(ch);
    }
  }, [searchParams, setSelectedChapter]);

  // Close the mobile sheet when the route (view) changes — state adjusted
  // during render (the React-recommended alternative to a setState effect).
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setSheetOpen(false);
  }

  return (
    <div className="viz-shell">
      <aside className="viz-shell__sidebar">
        <VizControls />
      </aside>

      <main className="viz-shell__canvas">
        <Suspense fallback={<VizFallback />}>
          {activeView === 'arc' && <ArcDiagram />}
          {activeView === 'grid' && <GridView />}
          {activeView === 'scroll' && <ScrollView />}
        </Suspense>
      </main>

      {/* Mobile control strip — sits above the bottom tab bar (<900px). */}
      <div className="viz-shell__strip">
        {TIER_IDS.map((id) => {
          const tier = TIERS[id];
          const on = tierVisibility[id];
          return (
            <button
              key={id}
              type="button"
              className="viz-shell__pill"
              data-off={on ? undefined : 'true'}
              aria-pressed={on}
              aria-label={`Tier ${id}: ${tier.shortLabel}`}
              onClick={() => toggleTier(id)}
            >
              <span
                className="viz-shell__pill-dot"
                style={{ backgroundColor: on ? `var(${tier.cssVar})` : 'transparent', borderColor: `var(${tier.cssVar})` }}
              />
              {id}
            </button>
          );
        })}
        <button
          type="button"
          className="viz-shell__more"
          aria-label="More controls"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          &#8943;
        </button>
      </div>

      {/* Mobile slide-up sheet with the full control stack. */}
      {sheetOpen && (
        <div className="viz-shell__overlay" onClick={() => setSheetOpen(false)}>
          <div
            className="viz-shell__sheet"
            role="dialog"
            aria-label="Visualization controls"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="viz-shell__sheet-header">
              <span className="viz-shell__sheet-title">Controls</span>
              <button
                type="button"
                className="viz-shell__sheet-close"
                onClick={() => setSheetOpen(false)}
                aria-label="Close controls"
              >
                &times;
              </button>
            </div>
            <div className="viz-shell__sheet-body">
              <VizControls />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

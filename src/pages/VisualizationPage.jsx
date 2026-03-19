import { lazy, Suspense } from 'react';
import useAppStore from '../stores/useAppStore';
import SearchBar from '../components/controls/SearchBar';
import TierToggle from '../components/controls/TierToggle';
import ColorModeToggle from '../components/controls/ColorModeToggle';
import StatsPanel from '../components/controls/StatsPanel';
import ReferencePanel from '../components/detail/ReferencePanel';

const ArcDiagram = lazy(() => import('../components/visualizations/ArcDiagram/ArcDiagram'));
const GridView = lazy(() => import('../components/visualizations/GridView/GridView'));
const GlobeView = lazy(() => import('../components/visualizations/GlobeView/GlobeView'));

function VizFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      Loading visualization...
    </div>
  );
}

export default function VisualizationPage() {
  const activeView = useAppStore((s) => s.activeView);

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <SearchBar />
        <TierToggle />
        <ColorModeToggle />
        <StatsPanel />
        <ReferencePanel />
      </aside>
      <main style={styles.main}>
        <Suspense fallback={<VizFallback />}>
          {activeView === 'arc' && <ArcDiagram />}
          {activeView === 'grid' && <GridView />}
          {activeView === 'globe' && <GlobeView />}
        </Suspense>
      </main>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: 200,
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    backgroundColor: 'var(--panel-bg)',
    overflowY: 'auto',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
};

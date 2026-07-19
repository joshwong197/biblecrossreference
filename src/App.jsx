import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/layout/Header';
import BottomTabBar from './components/layout/BottomTabBar';
import LoadingScreen from './components/layout/LoadingScreen';
import useTheme from './hooks/useTheme';
import useDataLoader from './hooks/useDataLoader';

const VisualizationPage = lazy(() => import('./pages/VisualizationPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const ReaderRedirect = lazy(() => import('./pages/ReaderRedirect'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const BookPage = lazy(() => import('./pages/BookPage'));

/**
 * App shell: Header (desktop nav) + bottom tab bar (mobile nav), shared by
 * every route. Rendered once, outside the viz loading gate, so the Reader
 * never waits on the ~15MB viz dataset.
 */
function AppShell() {
  return (
    <>
      <Header />
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
      <BottomTabBar />
    </>
  );
}

/**
 * Gate for the visualization routes ONLY (/arc, /grid, /scroll). Loads the
 * ~15MB viz dataset via the existing useDataLoader hook. Reader/Explore/About
 * routes never mount this, so they never trigger or wait on that fetch.
 */
function VizGate() {
  const loading = useDataLoader();
  if (loading) {
    return <LoadingScreen />;
  }
  return <Outlet />;
}

export default function App() {
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/read" replace />} />
          <Route path="/read" element={<ReaderRedirect />} />
          <Route path="/read/:book/:chapter" element={<ReaderPage />} />
          <Route path="/book/:slug" element={<BookPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route element={<VizGate />}>
            <Route path="/arc" element={<VisualizationPage />} />
            <Route path="/grid" element={<VisualizationPage />} />
            <Route path="/scroll" element={<VisualizationPage />} />
          </Route>
          <Route path="/globe" element={<Navigate to="/scroll" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

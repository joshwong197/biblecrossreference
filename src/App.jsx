import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import LoadingScreen from './components/layout/LoadingScreen';
import useTheme from './hooks/useTheme';
import useDataLoader from './hooks/useDataLoader';

const VisualizationPage = lazy(() => import('./pages/VisualizationPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

export default function App() {
  useTheme();
  const loading = useDataLoader();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Header />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<VisualizationPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

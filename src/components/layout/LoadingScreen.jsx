import useAppStore from '../../stores/useAppStore';
// LoadingScreen renders app-wide (Suspense/viz gate fallback), not just on the
// viz page, so it imports the chrome stylesheet itself. Vite dedupes.
import '../../viz-chrome.css';

export default function LoadingScreen() {
  const progress = useAppStore((s) => s.loadingProgress);

  return (
    <div className="loading-screen">
      <div className="loading-screen__content">
        <div className="loading-screen__label">Bible Cross-References</div>
        <div className="loading-screen__dots" aria-hidden="true">
          <span className="loading-screen__dot" />
          <span className="loading-screen__dot" />
          <span className="loading-screen__dot" />
        </div>
        <p className="loading-screen__status">{progress}</p>
      </div>
    </div>
  );
}

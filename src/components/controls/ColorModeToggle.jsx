import useAppStore from '../../stores/useAppStore';

export default function ColorModeToggle() {
  const colorMode = useAppStore((s) => s.colorMode);
  const setColorMode = useAppStore((s) => s.setColorMode);

  return (
    <div className="color-mode">
      <div className="viz-label">Color By</div>
      <div className="color-mode__buttons">
        <button
          type="button"
          className={`color-mode__btn${colorMode === 'tier' ? ' is-active' : ''}`}
          aria-pressed={colorMode === 'tier'}
          onClick={() => setColorMode('tier')}
        >
          Tier
        </button>
        <button
          type="button"
          className={`color-mode__btn${colorMode === 'testament' ? ' is-active' : ''}`}
          aria-pressed={colorMode === 'testament'}
          onClick={() => setColorMode('testament')}
        >
          Testament
        </button>
      </div>
    </div>
  );
}

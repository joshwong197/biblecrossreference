import useAppStore from '../../stores/useAppStore';

const VIEWS = [
  { id: 'arc', label: 'Arc Diagram' },
  { id: 'grid', label: 'Connections' },
  { id: 'globe', label: 'Globe View' },
];

export default function ViewSwitcher() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <div style={styles.container}>
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => setActiveView(view.id)}
          style={{
            ...styles.button,
            ...(activeView === view.id ? styles.active : {}),
          }}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: 2,
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 6,
    padding: 2,
  },
  button: {
    padding: '4px 12px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  },
  active: {
    backgroundColor: 'var(--button-active)',
    color: 'var(--accent)',
    border: '1px solid var(--button-active-border)',
  },
};

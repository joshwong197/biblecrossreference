import useAppStore from '../../stores/useAppStore';

export default function ColorModeToggle() {
  const colorMode = useAppStore((s) => s.colorMode);
  const setColorMode = useAppStore((s) => s.setColorMode);

  return (
    <div style={styles.container}>
      <div style={styles.label}>Color By</div>
      <div style={styles.buttons}>
        <button
          onClick={() => setColorMode('tier')}
          style={{
            ...styles.button,
            ...(colorMode === 'tier' ? styles.active : {}),
          }}
        >
          Tier
        </button>
        <button
          onClick={() => setColorMode('testament')}
          style={{
            ...styles.button,
            ...(colorMode === 'testament' ? styles.active : {}),
          }}
        >
          Testament
        </button>
        <button
          onClick={() => setColorMode('group')}
          style={{
            ...styles.button,
            ...(colorMode === 'group' ? styles.active : {}),
          }}
        >
          Book Group
        </button>
      </div>
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
  buttons: {
    display: 'flex',
    gap: 4,
  },
  button: {
    flex: 1,
    padding: '4px 8px',
    fontSize: 12,
    border: '1px solid var(--border)',
    borderRadius: 4,
    cursor: 'pointer',
    backgroundColor: 'var(--button-bg)',
    color: 'var(--text-secondary)',
  },
  active: {
    backgroundColor: 'var(--button-active)',
    color: 'var(--accent)',
    borderColor: 'var(--button-active-border)',
  },
};

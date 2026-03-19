import useAppStore from '../../stores/useAppStore';

export default function LoadingScreen() {
  const progress = useAppStore((s) => s.loadingProgress);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h2 style={styles.title}>Bible Cross-References</h2>
        <p style={styles.subtitle}>Loading visualization data...</p>
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>
        <p style={styles.status}>{progress}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  content: {
    textAlign: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: 'var(--accent)',
    borderRadius: 2,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  status: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
};

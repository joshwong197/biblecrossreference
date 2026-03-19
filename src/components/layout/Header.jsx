import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '../controls/ThemeToggle';
import ViewSwitcher from './ViewSwitcher';

export default function Header() {
  const location = useLocation();
  const isVizPage = location.pathname === '/';

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <Link to="/" style={styles.logo}>
          <h1 style={styles.title}>Bible Cross-References</h1>
        </Link>
      </div>

      {isVizPage && (
        <div style={styles.center}>
          <ViewSwitcher />
        </div>
      )}

      <div style={styles.right}>
        <Link to="/about" style={styles.navLink}>About</Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 52,
    backgroundColor: 'var(--header-bg)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  center: {
    display: 'flex',
    alignItems: 'center',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    textDecoration: 'none',
    color: 'inherit',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    whiteSpace: 'nowrap',
  },
  navLink: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: 4,
  },
};

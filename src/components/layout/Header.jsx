import { Link, NavLink } from 'react-router-dom';
import ThemeToggle from '../controls/ThemeToggle';
import './nav.css';

const DESTINATIONS = [
  { to: '/read', label: 'Read' },
  { to: '/explore', label: 'Explore' },
  { to: '/arc', label: 'Arc' },
  { to: '/grid', label: 'Grid' },
  { to: '/scroll', label: 'Scroll' },
];

export default function Header() {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <Link to="/read" className="app-header__logo">
          <h1 className="app-header__title">Bible Cross-References</h1>
        </Link>
      </div>

      <nav className="app-header__nav" aria-label="Primary">
        {DESTINATIONS.map((dest) => (
          <NavLink
            key={dest.to}
            to={dest.to}
            className={({ isActive }) => `app-header__nav-link${isActive ? ' is-active' : ''}`}
          >
            {dest.label}
          </NavLink>
        ))}
        <NavLink
          to="/about"
          className={({ isActive }) => `app-header__nav-link${isActive ? ' is-active' : ''}`}
        >
          About
        </NavLink>
      </nav>

      <div className="app-header__right">
        <Link to="/about" className="app-header__info-btn" aria-label="About this project">
          i
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

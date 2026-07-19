import { NavLink } from 'react-router-dom';
import './nav.css';

const TABS = [
  {
    to: '/read',
    label: 'Read',
    icon: (
      <path d="M4 4.5C4 3.7 4.7 3 5.5 3H12v18H5.5C4.7 21 4 20.3 4 19.5v-15zM12 3h6.5c.8 0 1.5.7 1.5 1.5v15c0 .8-.7 1.5-1.5 1.5H12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    ),
  },
  {
    to: '/explore',
    label: 'Explore',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15 9l-2 5-5 2 2-5z" fill="currentColor" />
      </>
    ),
  },
  {
    to: '/arc',
    label: 'Arc',
    icon: (
      <path d="M3 18c4-11 14-11 18 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    ),
  },
  {
    to: '/grid',
    label: 'Grid',
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3.5" y="3.5" width="7" height="7" />
        <rect x="13.5" y="3.5" width="7" height="7" />
        <rect x="3.5" y="13.5" width="7" height="7" />
        <rect x="13.5" y="13.5" width="7" height="7" />
      </g>
    ),
  },
  {
    to: '/scroll',
    label: 'Scroll',
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M7 4c4 1.5 4 4.5 0 6s-4 4.5 0 6 4 4.5 0 4" />
        <path d="M17 4c-4 1.5-4 4.5 0 6s4 4.5 0 6-4 4.5 0 4" />
      </g>
    ),
  },
];

export default function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar" aria-label="Primary">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `bottom-tab-bar__item${isActive ? ' is-active' : ''}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{tab.icon}</svg>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

import { useState, useEffect } from 'react';

/**
 * Sample the live CSS design tokens (viz-bg, tier/testament palettes, ink,
 * accent, chord base opacity) straight from :root so the scroll obeys
 * DESIGN.md — no hardcoded colors in the component. A MutationObserver on the
 * `data-theme` attribute re-reads them whenever the theme flips (that attribute
 * is what useTheme toggles), so both themes look intentional. The observer is
 * attached once; the initial useState covers first paint.
 */
export default function useVizTokens() {
  const [tokens, setTokens] = useState(readTokens);

  useEffect(() => {
    const obs = new MutationObserver(() => setTokens(readTokens()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return tokens;
}

function readTokens() {
  const s = getComputedStyle(document.documentElement);
  const g = (name, fallback) => {
    const v = s.getPropertyValue(name).trim();
    return v || fallback;
  };
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  return {
    isDark,
    vizBg: g('--viz-bg', isDark ? '#0D1117' : '#FAFAFA'),
    tier: {
      1: g('--tier-1', '#FFD700'),
      2: g('--tier-2', '#FF6B35'),
      3: g('--tier-3', '#4ECDC4'),
      4: g('--tier-4', '#9B8EC4'),
      5: g('--tier-5', '#555555'),
    },
    testament: {
      'OT-OT': g('--ot-ot', '#4A90D9'),
      'NT-NT': g('--nt-nt', '#E8675A'),
      cross: g('--cross-testament', '#C8A2E8'),
    },
    ot: g('--ot-ot', '#4A90D9'),
    nt: g('--nt-nt', '#E8675A'),
    line: g('--line', isDark ? '#2A2A27' : '#EBEBE8'),
    ink2: g('--ink-2', isDark ? '#98968F' : '#6E6E73'),
    ink3: g('--ink-3', isDark ? '#5A5954' : '#B0B0B5'),
    accent: g('--accent-reader', isDark ? '#D4AF37' : '#8A6A0B'),
    baseOpacity: parseFloat(s.getPropertyValue('--arc-base-opacity')) || (isDark ? 0.25 : 0.35),
  };
}

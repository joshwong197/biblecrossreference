export function getTierColor(tier) {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue(`--tier-${tier}`).trim();
}

export function getTestamentColor(fromTestament, toTestament) {
  const style = getComputedStyle(document.documentElement);
  if (fromTestament === 'OT' && toTestament === 'OT') {
    return style.getPropertyValue('--ot-ot').trim();
  }
  if (fromTestament === 'NT' && toTestament === 'NT') {
    return style.getPropertyValue('--nt-nt').trim();
  }
  return style.getPropertyValue('--cross-testament').trim();
}

export function getArcBaseOpacity() {
  const style = getComputedStyle(document.documentElement);
  return parseFloat(style.getPropertyValue('--arc-base-opacity').trim()) || 0.25;
}

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const TIER_COLORS_DARK = {
  1: '#FFD700',
  2: '#FF6B35',
  3: '#4ECDC4',
  4: '#9B8EC4',
  5: '#555555',
};

export const TIER_COLORS_LIGHT = {
  1: '#B8860B',
  2: '#CC4E1B',
  3: '#1A8A7D',
  4: '#6B5B95',
  5: '#AAAAAA',
};

export const TESTAMENT_COLORS_DARK = {
  'OT-OT': '#4A90D9',
  'NT-NT': '#E8675A',
  'cross': '#C8A2E8',
};

export const TESTAMENT_COLORS_LIGHT = {
  'OT-OT': '#2B5C8A',
  'NT-NT': '#B84A3E',
  'cross': '#8B5DAA',
};

export function getTestamentPairKey(fromBook, toBook) {
  const fromOT = fromBook <= 39;
  const toOT = toBook <= 39;
  if (fromOT && toOT) return 'OT-OT';
  if (!fromOT && !toOT) return 'NT-NT';
  return 'cross';
}

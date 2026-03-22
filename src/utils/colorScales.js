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

// Book group color mode (10 groups)
const BOOK_GROUP_RANGES = [
  { key: 'pentateuch',     min: 1,  max: 5  },
  { key: 'historical',     min: 6,  max: 17 },
  { key: 'wisdom',         min: 18, max: 22 },
  { key: 'major-prophets', min: 23, max: 27 },
  { key: 'minor-prophets', min: 28, max: 39 },
  { key: 'gospels',        min: 40, max: 43 },
  { key: 'acts',           min: 44, max: 44 },
  { key: 'pauline',        min: 45, max: 57 },
  { key: 'general',        min: 58, max: 65 },
  { key: 'revelation',     min: 66, max: 66 },
];

export function getBookGroupKey(bookNum) {
  for (const range of BOOK_GROUP_RANGES) {
    if (bookNum >= range.min && bookNum <= range.max) return range.key;
  }
  return 'pentateuch';
}

export const GROUP_COLORS_DARK = {
  'pentateuch':     '#3A7CB8',
  'historical':     '#38A090',
  'wisdom':         '#B8A03A',
  'major-prophets': '#A050A0',
  'minor-prophets': '#A05078',
  'gospels':        '#B84A38',
  'acts':           '#B88A38',
  'pauline':        '#4A70B0',
  'general':        '#4A8888',
  'revelation':     '#B03850',
};

export const GROUP_COLORS_LIGHT = {
  'pentateuch':     '#2D5F8A',
  'historical':     '#2A8A72',
  'wisdom':         '#8A7A2D',
  'major-prophets': '#7A3D7A',
  'minor-prophets': '#7A3D5A',
  'gospels':        '#B84A38',
  'acts':           '#8A6A2D',
  'pauline':        '#3A5A8A',
  'general':        '#3A6A6A',
  'revelation':     '#A03050',
};

export const GROUP_LABELS = {
  'pentateuch':     'Pentateuch',
  'historical':     'Historical',
  'wisdom':         'Wisdom & Poetry',
  'major-prophets': 'Major Prophets',
  'minor-prophets': 'Minor Prophets',
  'gospels':        'Gospels',
  'acts':           'Acts',
  'pauline':        'Pauline Epistles',
  'general':        'General Epistles',
  'revelation':     'Revelation',
};

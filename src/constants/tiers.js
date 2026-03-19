export const TIERS = {
  1: {
    id: 1,
    label: 'Direct Quotation',
    shortLabel: 'Quote',
    cssVar: '--tier-1',
    description: 'The later text explicitly quotes the earlier text, often with an introductory formula.',
    example: 'Matthew 4:4 quoting Deuteronomy 8:3',
  },
  2: {
    id: 2,
    label: 'Allusion / Fulfillment',
    shortLabel: 'Allusion',
    cssVar: '--tier-2',
    description: 'The author clearly references an earlier passage without a word-for-word quote.',
    example: 'Matthew 1:22-23 referencing Isaiah 7:14',
  },
  3: {
    id: 3,
    label: 'Parallel Passage',
    shortLabel: 'Parallel',
    cssVar: '--tier-3',
    description: 'The same event, speech, genealogy, or law recorded in multiple books.',
    example: 'Synoptic Gospel parallels (Matthew/Mark/Luke)',
  },
  4: {
    id: 4,
    label: 'Thematic Echo',
    shortLabel: 'Thematic',
    cssVar: '--tier-4',
    description: 'Shared theological concepts, imagery, or doctrine without explicit citation.',
    example: '"Shepherd" imagery in Psalm 23, Ezekiel 34, and John 10',
  },
  5: {
    id: 5,
    label: 'Shared Vocabulary',
    shortLabel: 'Vocabulary',
    cssVar: '--tier-5',
    description: 'Two passages share a place name, person name, or common word but have no meaningful connection.',
    example: '1 Samuel 1:1 and Judges 19:1 both mention "mount Ephraim"',
  },
};

export const TIER_IDS = [1, 2, 3, 4, 5];

export const COLOR_MODES = {
  tier: 'tier',
  testament: 'testament',
};

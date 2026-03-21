import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Theme
  theme: localStorage.getItem('bible-crossref-theme') || 'dark',
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('bible-crossref-theme', next);
      return { theme: next };
    }),

  // Active visualization view
  activeView: 'arc', // 'arc' | 'grid' | 'globe'
  setActiveView: (view) => set({ activeView: view }),

  // Tier visibility toggles
  tierVisibility: { 1: true, 2: true, 3: true, 4: true, 5: false },
  toggleTier: (tier) =>
    set((state) => ({
      tierVisibility: {
        ...state.tierVisibility,
        [tier]: !state.tierVisibility[tier],
      },
    })),
  setTierVisibility: (tierVisibility) => set({ tierVisibility }),

  // Color mode for arcs
  colorMode: 'tier', // 'tier' | 'testament'
  setColorMode: (colorMode) => set({ colorMode }),

  // Selection & hover state
  selectedChapter: null,
  selectedVerse: null,
  hoveredChapter: null,
  searchQuery: '',
  setSelectedChapter: (ch, verse) => set({ selectedChapter: ch, selectedVerse: verse || null }),
  setHoveredChapter: (ch) => set({ hoveredChapter: ch }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Data (loaded at startup)
  references: null,
  metadata: null,
  bibleText: null,
  loading: true,
  loadingProgress: '',
  setData: (references, metadata, bibleText) => set((state) => ({
    references,
    metadata,
    bibleText: bibleText !== undefined ? bibleText : state.bibleText,
    loading: false,
  })),
  setLoading: (loading) => set({ loading }),
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),

  // KJV verse text cache
  verseText: null,
  verseTextLoading: false,
  loadVerseText: async () => {
    const state = get();
    if (state.verseText || state.verseTextLoading) return;
    set({ verseTextLoading: true });
    try {
      const res = await fetch('/data/kjv.json');
      const data = await res.json();
      set({ verseText: data, verseTextLoading: false });
    } catch (err) {
      console.error('Failed to load KJV text:', err);
      set({ verseTextLoading: false });
    }
  },
}));

export default useAppStore;

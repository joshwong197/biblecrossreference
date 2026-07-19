import { useEffect } from 'react';
import useAppStore from '../stores/useAppStore';
import { normalizeReferences } from '../utils/dataTransform';

// Module-level flags: the dataset is static, so survive VizGate remounts
// (navigating /read ↔ /arc) without refetching or double-appending.
let baseRequested = false;
let t5Requested = false;

export default function useDataLoader() {
  const setData = useAppStore((s) => s.setData);
  const setLoadingProgress = useAppStore((s) => s.setLoadingProgress);
  const loading = useAppStore((s) => s.loading);
  const tier5Visible = useAppStore((s) => s.tierVisibility[5]);
  const hasReferences = useAppStore((s) => !!s.references);

  useEffect(() => {
    if (baseRequested) return;
    baseRequested = true;

    async function loadData() {
      try {
        setLoadingProgress('Loading Bible metadata...');
        const [metaRes, refsRes] = await Promise.all([
          fetch('/data/bible_metadata.json'),
          fetch('/data/references_t1t2t3.json'),
        ]);
        if (!metaRes.ok) throw new Error('Failed to load metadata');
        if (!refsRes.ok) throw new Error('Failed to load references');
        const metadata = await metaRes.json();
        const refsHigh = normalizeReferences(await refsRes.json());

        // Set initial data — app becomes interactive
        setData(refsHigh, metadata);

        // Load tier 4 in background (visible by default)
        try {
          const t4Res = await fetch('/data/references_t4.json');
          if (t4Res.ok) {
            const refsT4 = normalizeReferences(await t4Res.json());
            const store = useAppStore.getState();
            setData([...store.references, ...refsT4], store.metadata);
          }
        } catch {
          // Tier 4 data not yet available
        }
      } catch (err) {
        console.error('Data loading error:', err);
        baseRequested = false; // allow retry on next mount
        setLoadingProgress('Error loading data. Please refresh.');
      }
    }

    loadData();
  }, [setData, setLoadingProgress]);

  // Tier 5 is 12.7MB and off by default — fetch it only when first toggled on
  useEffect(() => {
    if (!tier5Visible || !hasReferences || t5Requested) return;
    t5Requested = true;

    (async () => {
      try {
        const t5Res = await fetch('/data/references_t5.json');
        if (t5Res.ok) {
          const refsT5 = normalizeReferences(await t5Res.json());
          const store = useAppStore.getState();
          setData([...store.references, ...refsT5], store.metadata);
        } else {
          t5Requested = false;
        }
      } catch {
        t5Requested = false; // network hiccup — allow retry on next toggle
      }
    })();
  }, [tier5Visible, hasReferences, setData]);

  return loading;
}

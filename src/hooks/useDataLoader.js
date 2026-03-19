import { useEffect } from 'react';
import useAppStore from '../stores/useAppStore';
import { normalizeReferences } from '../utils/dataTransform';

export default function useDataLoader() {
  const setData = useAppStore((s) => s.setData);
  const setLoadingProgress = useAppStore((s) => s.setLoadingProgress);
  const loading = useAppStore((s) => s.loading);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoadingProgress('Loading Bible metadata...');
        const metaRes = await fetch('/data/bible_metadata.json');
        if (!metaRes.ok) throw new Error('Failed to load metadata');
        const metadata = await metaRes.json();

        if (cancelled) return;

        setLoadingProgress('Loading cross-references (Tiers 1-3)...');
        const refsRes = await fetch('/data/references_t1t2t3.json');
        if (!refsRes.ok) throw new Error('Failed to load references');
        const refsHigh = normalizeReferences(await refsRes.json());

        if (cancelled) return;

        // Set initial data — app becomes interactive
        setData(refsHigh, metadata);

        // Load remaining tiers in background
        try {
          const t4Res = await fetch('/data/references_t4.json');
          if (t4Res.ok && !cancelled) {
            const refsT4 = normalizeReferences(await t4Res.json());
            const store = useAppStore.getState();
            setData([...store.references, ...refsT4], store.metadata);
          }
        } catch {
          // Tier 4 data not yet available
        }

        try {
          const t5Res = await fetch('/data/references_t5.json');
          if (t5Res.ok && !cancelled) {
            const refsT5 = normalizeReferences(await t5Res.json());
            const store = useAppStore.getState();
            setData([...store.references, ...refsT5], store.metadata);
          }
        } catch {
          // Tier 5 data not yet available
        }
      } catch (err) {
        console.error('Data loading error:', err);
        if (!cancelled) {
          setLoadingProgress('Error loading data. Please refresh.');
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [setData, setLoadingProgress]);

  return loading;
}

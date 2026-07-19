import { useEffect, useState } from 'react';

/**
 * Attempts to preload an optional per-book art asset from /art/{abbrev}{suffix}.webp
 * (see public/art/README.md for the naming convention). Resolves via a plain
 * JS Image() probe rather than rendering an <img> speculatively, so a missing
 * file never produces a broken-image flash or a layout shift — callers should
 * only render the image once status === 'loaded'.
 *
 * Result is keyed by the src it resolved for (same pattern as
 * useTargetVerse), so a stale 'loaded' status is never shown for a
 * different book while the new probe is still in flight — checked at read
 * time rather than via a resetting setState call in the effect body.
 *
 * Returns { status, src } where status is 'loading' | 'loaded' | 'absent'.
 */
export function useArtImage(abbrev, suffix = '') {
  const src = abbrev ? `/art/${abbrev}${suffix}.webp` : null;
  const [result, setResult] = useState(() => ({ src: null, status: 'absent' }));

  useEffect(() => {
    if (!src) return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setResult({ src, status: 'loaded' });
    };
    img.onerror = () => {
      if (!cancelled) setResult({ src, status: 'absent' });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) return { status: 'absent', src: null };
  return result.src === src ? result : { status: 'loading', src };
}

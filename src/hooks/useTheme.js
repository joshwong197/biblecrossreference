import { useLayoutEffect } from 'react';
import useAppStore from '../stores/useAppStore';

export default function useTheme() {
  const theme = useAppStore((s) => s.theme);

  // Layout effect, not passive: canvas renderers (Arc, Grid) sample CSS
  // tokens via getComputedStyle in their own useEffects, and all layout
  // effects flush before any passive effect — otherwise they'd paint one
  // theme behind after every toggle.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return theme;
}

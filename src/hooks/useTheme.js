import { useEffect } from 'react';
import useAppStore from '../stores/useAppStore';

export default function useTheme() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return theme;
}

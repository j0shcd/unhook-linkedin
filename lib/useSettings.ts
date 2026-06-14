import { useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  patchSettings,
  watchSettings,
  type Settings,
} from './settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSettings().then((s) => {
      if (!mounted) return;
      setSettings(s);
      setLoaded(true);
    });
    const unwatch = watchSettings((next) => {
      if (mounted) setSettings(next);
    });
    return () => {
      mounted = false;
      unwatch();
    };
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    void patchSettings(patch);
  };

  return { settings, update, loaded };
}

export function useResolvedTheme(theme: Settings['theme']): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (theme === 'system') return systemDark ? 'dark' : 'light';
  return theme;
}

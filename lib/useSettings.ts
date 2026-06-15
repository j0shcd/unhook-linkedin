import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  setSettings,
  watchSettings,
  type Settings,
} from './settings';

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const writeQueue = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    getSettings().then((s) => {
      if (!mounted) return;
      setSettingsState(s);
      setLoaded(true);
    });
    const unwatch = watchSettings((next) => {
      if (mounted) setSettingsState(next);
    });
    return () => {
      mounted = false;
      unwatch();
    };
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      writeQueue.current = writeQueue.current
        .catch(() => undefined)
        .then(() => setSettings(next))
        .catch(async () => {
          const stored = await getSettings();
          setSettingsState(stored);
        });
      return next;
    });
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

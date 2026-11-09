import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  mergeSettings,
  setSettings,
  watchSettings,
  type Settings,
} from './settings';

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const desired = useRef(DEFAULT_SETTINGS);
  const dirty = useRef(false);
  const mounted = useRef(false);
  const revision = useRef(0);
  const writeQueue = useRef(Promise.resolve());

  const load = async () => {
    if (dirty.current) return;
    const request = ++revision.current;
    setError(null);
    try {
      const next = await getSettings();
      if (!mounted.current || request !== revision.current) return;
      desired.current = next;
      setSettingsState(next);
      setLoaded(true);
    } catch {
      if (mounted.current && request === revision.current) setError('load');
    }
  };

  useEffect(() => {
    mounted.current = true;
    // A notification is a signal to read current storage, not a snapshot to
    // apply: an earlier write's notification may arrive after a newer edit.
    const unwatch = watchSettings(() => { void load(); });
    void load();
    return () => {
      mounted.current = false;
      revision.current++;
      unwatch();
    };
  }, []);

  const update = (patch: Partial<Settings>) => {
    const next = mergeSettings(desired.current, patch);
    const request = ++revision.current;
    desired.current = next;
    dirty.current = true;
    setSettingsState(next);
    setError(null);
    // Persistence belongs to the event, never a replayable React updater.
    writeQueue.current = writeQueue.current.then(async () => {
      try {
        await setSettings(next);
        if (request === revision.current) dirty.current = false;
      } catch {
        if (mounted.current && request === revision.current) setError('save');
      }
    });
  };

  const retry = () => dirty.current ? update({}) : void load();
  return { settings, update, loaded, error, retry };
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

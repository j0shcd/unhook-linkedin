import { storage } from 'wxt/storage';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  enabled: boolean;
  blockFeed: boolean;
  redirectMessages: boolean;
  redirectJobs: boolean;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  blockFeed: true,
  redirectMessages: false,
  redirectJobs: false,
  theme: 'system',
};

const settingsItem = storage.defineItem<Partial<Settings>>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});

export async function getSettings(): Promise<Settings> {
  const stored = await settingsItem.getValue();
  return normalizeSettings(stored);
}

export async function setSettings(next: Settings): Promise<void> {
  await settingsItem.setValue(normalizeSettings(next));
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...patch });
  await setSettings(next);
  return next;
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  return settingsItem.watch((newValue) => {
    cb(normalizeSettings(newValue));
  });
}

function normalizeSettings(value: Partial<Settings> | null | undefined): Settings {
  const source = value ?? {};

  return {
    enabled: booleanOrDefault(source.enabled, DEFAULT_SETTINGS.enabled),
    blockFeed: booleanOrDefault(source.blockFeed, DEFAULT_SETTINGS.blockFeed),
    redirectMessages: booleanOrDefault(source.redirectMessages, DEFAULT_SETTINGS.redirectMessages),
    redirectJobs: booleanOrDefault(source.redirectJobs, DEFAULT_SETTINGS.redirectJobs),
    theme: isTheme(source.theme) ? source.theme : DEFAULT_SETTINGS.theme,
  };
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
}

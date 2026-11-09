import { storage } from 'wxt/utils/storage';

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
  const next = mergeSettings(current, patch);
  await setSettings(next);
  return next;
}

export function mergeSettings(current: Settings, patch: Partial<Settings>): Settings {
  const next = { ...current, ...patch };
  if (patch.redirectMessages === true) next.redirectJobs = false;
  else if (patch.redirectJobs === true) next.redirectMessages = false;
  return normalizeSettings(next);
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  return settingsItem.watch((newValue) => {
    cb(normalizeSettings(newValue));
  });
}

function normalizeSettings(value: Partial<Settings> | null | undefined): Settings {
  const source = value ?? {};
  const redirectMessages = booleanOrDefault(source.redirectMessages, DEFAULT_SETTINGS.redirectMessages);

  return {
    enabled: booleanOrDefault(source.enabled, DEFAULT_SETTINGS.enabled),
    blockFeed: booleanOrDefault(source.blockFeed, DEFAULT_SETTINGS.blockFeed),
    redirectMessages,
    redirectJobs: !redirectMessages && booleanOrDefault(source.redirectJobs, DEFAULT_SETTINGS.redirectJobs),
    theme: isTheme(source.theme) ? source.theme : DEFAULT_SETTINGS.theme,
  };
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
}

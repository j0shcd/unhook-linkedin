import { storage } from 'wxt/storage';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  enabled: boolean;
  blockFeed: boolean;
  redirectMessages: boolean;
  redirectJobs: boolean;
  hideComments: boolean;
  hideFollowSuggestions: boolean;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  blockFeed: true,
  redirectMessages: false,
  redirectJobs: false,
  hideComments: false,
  hideFollowSuggestions: true,
  theme: 'system',
};

const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});

export async function getSettings(): Promise<Settings> {
  const stored = await settingsItem.getValue();
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSettings(next: Settings): Promise<void> {
  await settingsItem.setValue(next);
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await setSettings(next);
  return next;
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  return settingsItem.watch((newValue) => {
    cb({ ...DEFAULT_SETTINGS, ...(newValue ?? DEFAULT_SETTINGS) });
  });
}

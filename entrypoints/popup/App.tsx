import { useEffect } from 'react';
import { Toggle } from '@/components/Toggle';
import { useResolvedTheme, useSettings } from '@/lib/useSettings';
import type { Theme } from '@/lib/settings';

const SUPPORT_LINKS = [
  { label: 'Donate', href: 'https://ko-fi.com/joshcd' },
  { label: 'Request feature', href: 'mailto:jcohendumani7@gmail.com?subject=Unhook%20for%20LinkedIn%20feature%20request' },
  { label: 'Support', href: 'mailto:jcohendumani7@gmail.com?subject=Unhook%20for%20LinkedIn%20support' },
];

export function App() {
  const { settings, update, loaded } = useSettings();
  const resolved = useResolvedTheme(settings.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  if (!loaded) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  }

  const off = !settings.enabled;

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-sky-600 text-white grid place-items-center text-sm font-bold">
            U
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Unhook for LinkedIn</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {settings.enabled ? 'On' : 'Paused'}
            </div>
          </div>
        </div>
        <PowerButton
          enabled={settings.enabled}
          onToggle={() => update({ enabled: !settings.enabled })}
        />
      </header>

      <section className="divide-y divide-slate-100 px-4 dark:divide-slate-800">
        <Toggle
          label="Block home feed"
          description="Hide the LinkedIn feed at linkedin.com/feed/"
          checked={settings.blockFeed}
          disabled={off}
          onChange={(v) => update({ blockFeed: v })}
        />
        <div className="pl-7">
          <Toggle
            label="Redirect to messages"
            checked={settings.redirectMessages}
            disabled={off || !settings.blockFeed}
            onChange={(v) =>
              update({ redirectMessages: v, ...(v ? { redirectJobs: false } : {}) })
            }
          />
          <Toggle
            label="Redirect to jobs"
            checked={settings.redirectJobs}
            disabled={off || !settings.blockFeed}
            onChange={(v) =>
              update({ redirectJobs: v, ...(v ? { redirectMessages: false } : {}) })
            }
          />
        </div>
        <Toggle
          label="Hide comments"
          checked={settings.hideComments}
          disabled={off}
          onChange={(v) => update({ hideComments: v })}
        />
        <Toggle
          label="Hide follow suggestions"
          checked={settings.hideFollowSuggestions}
          disabled={off}
          onChange={(v) => update({ hideFollowSuggestions: v })}
        />
      </section>

      <section className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Theme
        </div>
        <ThemePicker value={settings.theme} onChange={(t) => update({ theme: t })} />
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="grid grid-cols-3 gap-2">
          {SUPPORT_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {l.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function PowerButton({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={enabled ? 'Pause Unhook' : 'Resume Unhook'}
      title={enabled ? 'Pause Unhook' : 'Resume Unhook'}
      className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
        enabled
          ? 'bg-sky-600 text-white hover:bg-sky-700'
          : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v10" />
        <path d="M5.5 7.5a8 8 0 1 0 13 0" />
      </svg>
    </button>
  );
}

function ThemePicker({ value, onChange }: { value: Theme; onChange: (t: Theme) => void }) {
  const opts: { v: Theme; label: string }[] = [
    { v: 'system', label: 'System' },
    { v: 'light', label: 'Light' },
    { v: 'dark', label: 'Dark' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1 dark:bg-slate-800">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            value === o.v
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

import { useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { Toggle } from '@/components/Toggle';
import { useResolvedTheme, useSettings } from '@/lib/useSettings';
import type { Theme } from '@/lib/settings';

export function App() {
  const { settings, update, loaded } = useSettings();
  const resolved = useResolvedTheme(settings.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  if (!loaded) {
    return <div className="p-6 text-sm text-muted">Loading…</div>;
  }

  const off = !settings.enabled;

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between border-b border-ink/10 px-4 py-3 dark:border-paper/15">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-7 text-ink dark:text-paper" />
          <div>
            <div className="text-sm font-semibold leading-tight">Unhook for LinkedIn</div>
            <div className="text-[11px] text-muted dark:text-paper/60">
              {settings.enabled ? 'On' : 'Paused'}
            </div>
          </div>
        </div>
        <PowerButton
          enabled={settings.enabled}
          onToggle={() => update({ enabled: !settings.enabled })}
        />
      </header>

      <section className="divide-y divide-ink/10 px-4 dark:divide-paper/10">
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
      </section>

      <section className="border-t border-ink/10 px-4 py-3 dark:border-paper/15">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-muted dark:text-paper/60">
          Theme
        </div>
        <ThemePicker value={settings.theme} onChange={(t) => update({ theme: t })} />
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
          ? 'bg-ink text-paper hover:bg-ink/90 dark:bg-paper dark:text-ink dark:hover:bg-paper/90'
          : 'bg-ink/10 text-muted hover:bg-ink/20 dark:bg-paper/15 dark:text-paper/60 dark:hover:bg-paper/25'
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
    <div className="grid grid-cols-3 gap-1 rounded-md bg-ink/5 p-1 dark:bg-paper/10">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            value === o.v
              ? 'bg-paper text-ink shadow-sm dark:bg-paper/20 dark:text-paper'
              : 'text-muted hover:text-ink dark:text-paper/60 dark:hover:text-paper'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

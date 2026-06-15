import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useResolvedTheme, useSettings } from '@/lib/useSettings';
import '@/assets/tailwind.css';

function Welcome() {
  const { settings } = useSettings();
  const resolved = useResolvedTheme(settings.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-600 text-xl font-bold text-white">
          U
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Hi 👋</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Thank you for installing Unhook for LinkedIn.
          </p>
        </div>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Getting started</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Click the Unhook icon in your browser's toolbar to choose what to hide on
          LinkedIn. If you don't see the icon, click the puzzle piece next to the URL
          bar and pin Unhook.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          This page will only be shown once.
        </p>
      </Card>

      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Enjoy browsing LinkedIn in peace 🧘
      </p>
    </main>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Welcome />
  </React.StrictMode>,
);

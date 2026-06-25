import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useResolvedTheme, useSettings } from '@/lib/useSettings';
import { Logo } from '@/components/Logo';
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
        <Logo className="h-12 w-12 text-ink dark:text-paper" />
        <div>
          <h1 className="text-2xl font-semibold">Welcome 👋</h1>
          <p className="text-sm text-muted dark:text-paper/60">
            Thank you for installing Unhook for LinkedIn.
          </p>
        </div>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Getting started</h2>
        <p className="mt-2 text-sm leading-6 text-ink/80 dark:text-paper/80">
          Click the Unhook icon in your browser's toolbar to choose what to hide on
          LinkedIn. If you don't see the icon, click the puzzle piece next to the URL
          bar and pin Unhook.
        </p>
        <p className="mt-2 text-sm leading-6 text-ink/80 dark:text-paper/80">
          You can safely close this page now.
        </p>
      </Card>

      <p className="mt-8 text-center text-sm text-muted dark:text-paper/60">
        Enjoy browsing LinkedIn in peace 🧘
      </p>
    </main>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-ink/10 bg-white p-5 shadow-sm dark:border-paper/15 dark:bg-paper/5 ${className}`}
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

import { defineContentScript } from 'wxt/utils/define-content-script';
import { DEFAULT_SETTINGS, getSettings, watchSettings, type Settings } from '@/lib/settings';
import './style.css';

const FEED_TARGET_ATTR = 'data-unhook-feed-target';

const MAIN_FEED_SELECTORS = [
  '[data-testid="mainFeed"]',
  '[componentkey="container-update-list_mainFeed-lazy-container"]',
];

export default defineContentScript({
  matches: ['https://www.linkedin.com/*'],
  runAt: 'document_start',
  cssInjectionMode: 'manifest',
  async main() {
    applyEarlyFeedGate(DEFAULT_SETTINGS);
    let current = DEFAULT_SETTINGS;
    let receivedSettings = false;
    let applyTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleApply = () => {
      if (applyTimer) return;
      applyTimer = setTimeout(() => {
        applyTimer = undefined;
        apply(current);
      }, 300);
    };

    watchSettings((next) => {
      receivedSettings = true;
      current = next;
      scheduleApply();
    });

    document.addEventListener(
      'click',
      (event) => {
        if (isHomeNavigationClick(event)) {
          applyEarlyFeedGate(current, true);
        }
      },
      true,
    );

    // LinkedIn is a SPA — re-evaluate on URL changes so the on-feed flag and
    // redirects stay in sync with client-side navigation.
    let lastUrl = location.href;
    const onUrlChange = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        apply(current);
        return true;
      }
      return false;
    };
    const mo = new MutationObserver(() => {
      const changedUrl = onUrlChange();
      if (!changedUrl && shouldManageFeedTargets(current)) {
        scheduleApply();
      }
    });
    // Wait for body before observing.
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        mo.observe(document.body, { childList: true, subtree: true });
        if (shouldManageFeedTargets(current)) {
          scheduleApply();
        }
      });
    }
    window.addEventListener('popstate', onUrlChange);
    window.setInterval(onUrlChange, 500);

    // Subscribe before reading so a newer notification cannot be overwritten
    // by the startup snapshot. A failed read must not abort the listeners.
    try {
      const initial = await getSettings();
      if (!receivedSettings) current = initial;
    } catch {
      if (!receivedSettings) current = { ...DEFAULT_SETTINGS, enabled: false };
    }
    apply(current);
  },
});

function apply(s: Settings) {
  const root = document.documentElement;
  const shouldBlockFeed = s.enabled && s.blockFeed;
  const onFeed = isOnFeed();
  setFlag(root, 'data-unhook-block-feed', shouldBlockFeed);
  setFlag(root, 'data-unhook-on-feed', onFeed);
  if (shouldBlockFeed && onFeed) {
    markFeedTargets();
  } else {
    clearFeedTargets();
  }
  maybeRedirect(s);
}

function applyEarlyFeedGate(s: Settings, onFeed = isOnFeed()) {
  const shouldBlockFeed = s.enabled && s.blockFeed;
  setFlag(document.documentElement, 'data-unhook-block-feed', shouldBlockFeed);
  setFlag(document.documentElement, 'data-unhook-on-feed', onFeed);
}

function setFlag(el: HTMLElement, attr: string, on: boolean) {
  if (on) el.setAttribute(attr, '1');
  else el.removeAttribute(attr);
}

function isOnFeed(): boolean {
  return isFeedPath(location.pathname);
}

function isFeedPath(pathname: string): boolean {
  return pathname === '/' || /^\/feed(?:\/foryou)?\/?$/.test(pathname);
}

function isHomeNavigationClick(event: MouseEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;

  const link = target.closest('a[href]');
  if (link instanceof HTMLAnchorElement && isLinkedInHomeUrl(link.href)) {
    return true;
  }

  const button = target.closest('button[aria-label]');
  const label = button?.getAttribute('aria-label') ?? '';
  return /^Home(?:,|$)/i.test(label);
}

function isLinkedInHomeUrl(href: string): boolean {
  try {
    const url = new URL(href, location.href);
    const isLinkedInHost =
      url.hostname === 'linkedin.com' || url.hostname === 'www.linkedin.com';
    return isLinkedInHost && isFeedPath(url.pathname);
  } catch {
    return false;
  }
}

function shouldManageFeedTargets(s: Settings): boolean {
  return s.enabled && s.blockFeed && isOnFeed();
}

function markFeedTargets() {
  const targets = new Set<Element>();
  const mainFeeds = getMainFeeds();

  mainFeeds.forEach((feed) => {
    Array.from(feed.children).forEach((item) => {
      if (!isComposerItem(item)) {
        targets.add(item);
      }
    });

  });

  document.querySelectorAll(`[${FEED_TARGET_ATTR}]`).forEach((el) => {
    if (!targets.has(el)) {
      el.removeAttribute(FEED_TARGET_ATTR);
    }
  });

  targets.forEach((el) => {
    if (!el.hasAttribute(FEED_TARGET_ATTR)) {
      el.setAttribute(FEED_TARGET_ATTR, '1');
    }
  });
}

function getMainFeeds(): Element[] {
  return Array.from(document.querySelectorAll(MAIN_FEED_SELECTORS.join(',')));
}

function isComposerItem(el: Element): boolean {
  return Boolean(
    el.querySelector(
      [
        '[aria-label="Start a post" i]',
        '[componentkey="shareboxProfilePictureComponentRef"]',
      ].join(','),
    ),
  );
}

function clearFeedTargets() {
  document.querySelectorAll(`[${FEED_TARGET_ATTR}]`).forEach((el) => {
    el.removeAttribute(FEED_TARGET_ATTR);
  });
}

function maybeRedirect(s: Settings) {
  if (!s.enabled || !s.blockFeed) return;
  if (!isOnFeed()) return;
  if (s.redirectMessages) {
    location.replace('https://www.linkedin.com/messaging/');
  } else if (s.redirectJobs) {
    location.replace('https://www.linkedin.com/jobs/');
  }
}

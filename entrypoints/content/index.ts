import { defineContentScript } from 'wxt/utils/define-content-script';
import { DEFAULT_SETTINGS, getSettings, watchSettings, type Settings } from '@/lib/settings';
import './style.css';

const FEED_TARGET_ATTR = 'data-unhook-feed-target';

const MAIN_FEED_SELECTORS = [
  '[data-testid="mainFeed"]',
  '[componentkey="container-update-list_mainFeed-lazy-container"]',
];

const FEED_POST_SELECTORS = [
  '.fie-impression-container',
  '.feed-shared-update-v2',
  '.feed-shared-update-v2__update',
  '[data-view-name="feed-full-update"]',
  '[data-view-name="feed-update"]',
  '[data-finite-scroll-hotkey-item]',
  '[componentkey^="feed-commentary_"]',
  '[aria-label^="Open control menu for post by" i]',
  '[aria-label^="Hide post by" i]',
  '[aria-label^="Post impressions" i]',
  '[aria-label^="Reaction button state:" i]',
  '.feed-shared-social-action-bar',
  '.social-details-social-counts',
  '.update-components-actor',
  'div[data-urn^="urn:li:activity"]',
  'article[data-urn^="urn:li:activity"]',
  '[data-id^="urn:li:activity"]',
  '[data-activity-urn^="urn:li:activity"]',
];

export default defineContentScript({
  matches: ['https://www.linkedin.com/*'],
  runAt: 'document_start',
  cssInjectionMode: 'manifest',
  async main() {
    applyEarlyFeedGate(DEFAULT_SETTINGS);
    let current = await getSettings();
    let applyTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleApply = () => {
      if (applyTimer) return;
      applyTimer = setTimeout(() => {
        applyTimer = undefined;
        apply(current);
      }, 300);
    };

    apply(current);

    watchSettings((next) => {
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
  return location.pathname === '/' || /^\/feed\/?$/.test(location.pathname);
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
    return isLinkedInHost && (url.pathname === '/' || /^\/feed\/?$/.test(url.pathname));
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

    feed.querySelectorAll(FEED_POST_SELECTORS.join(',')).forEach((el) => {
      const item = findMainFeedItem(el, feed);
      if (item && !isComposerItem(item)) {
        targets.add(item);
      }
    });

    feed.querySelectorAll('button, a').forEach((el) => {
      if (!isPostAction(el)) return;
      const item = findMainFeedItem(el, feed);
      if (item && !isComposerItem(item)) {
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

function isPostAction(el: Element): boolean {
  const label = el.getAttribute('aria-label') ?? '';
  return (
    /^Open control menu for post by/i.test(label) ||
    /^Hide post by/i.test(label) ||
    /^Post impressions/i.test(label) ||
    /^Reaction button state:/i.test(label) ||
    /^Comment$/i.test(label) ||
    /^Repost$/i.test(label) ||
    /^Send$/i.test(label)
  );
}

function findMainFeedItem(el: Element, feed: Element): Element | null {
  let current: Element | null = el;

  while (current?.parentElement && current.parentElement !== feed) {
    current = current.parentElement;
  }

  return current?.parentElement === feed ? current : null;
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

import { defineContentScript } from 'wxt/sandbox';
import { getSettings, watchSettings, type Settings } from '@/lib/settings';
import './style.css';

export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  runAt: 'document_start',
  cssInjectionMode: 'manifest',
  async main() {
    let current = await getSettings();
    apply(current);

    watchSettings((next) => {
      current = next;
      apply(current);
    });

    // LinkedIn is a SPA — re-evaluate redirects on URL changes.
    let lastUrl = location.href;
    const onUrlChange = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        maybeRedirect(current);
      }
    };
    const mo = new MutationObserver(onUrlChange);
    // Wait for body before observing.
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        mo.observe(document.body, { childList: true, subtree: true });
      });
    }
    window.addEventListener('popstate', onUrlChange);
  },
});

function apply(s: Settings) {
  const root = document.documentElement;
  const active = s.enabled;
  setFlag(root, 'data-unhook-block-feed', active && s.blockFeed);
  setFlag(root, 'data-unhook-hide-comments', active && s.hideComments);
  setFlag(root, 'data-unhook-hide-follow-suggestions', active && s.hideFollowSuggestions);
  setFlag(root, 'data-unhook-on-feed', isOnFeed());
  maybeRedirect(s);
}

function setFlag(el: HTMLElement, attr: string, on: boolean) {
  if (on) el.setAttribute(attr, '1');
  else el.removeAttribute(attr);
}

function isOnFeed(): boolean {
  return /^\/feed\/?$/.test(location.pathname);
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

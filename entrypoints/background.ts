import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      const url = browser.runtime.getURL('/welcome.html');
      await browser.tabs.create({ url });
    }
  });
});

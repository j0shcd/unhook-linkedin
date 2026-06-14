import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Unhook for LinkedIn',
    description: 'Take back control of LinkedIn. Hide the feed, comments, and follow suggestions.',
    permissions: ['storage'],
    host_permissions: ['*://*.linkedin.com/*'],
    action: {
      default_title: 'Unhook for LinkedIn',
    },
    browser_specific_settings: {
      gecko: {
        id: 'unhook-linkedin@joshcohendumani.dev',
        strict_min_version: '109.0',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Unhook for LinkedIn: Hide the Feed',
    description: 'Hide your LinkedIn feed and get your work done without distraction. Fully private, no tracking.',
    permissions: ['storage'],
    host_permissions: ['https://www.linkedin.com/*'],
    action: {
      default_title: 'Unhook for LinkedIn: Hide the Feed',
    },
    browser_specific_settings: {
      gecko: {
        id: '{3f0c9b31-5e8b-4a96-9d21-2c7d42aa44d8}',
        strict_min_version: '121.0',
        // Newer AMO data-consent key, not yet in WXT's manifest types.
        // @ts-expect-error - data_collection_permissions is a valid gecko key
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
  vite: () => ({
    cacheDir: '.vite.nosync',
    plugins: [tailwindcss()],
  }),
});

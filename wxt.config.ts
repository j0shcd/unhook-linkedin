import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Unhook for LinkedIn',
    description: 'Take back control of LinkedIn. Hide or redirect the home feed with no tracking.',
    permissions: ['storage'],
    host_permissions: ['https://www.linkedin.com/*'],
    action: {
      default_title: 'Unhook for LinkedIn',
    },
    browser_specific_settings: {
      gecko: {
        id: '{3f0c9b31-5e8b-4a96-9d21-2c7d42aa44d8}',
        strict_min_version: '121.0',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

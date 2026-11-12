import type { WxtViteConfig } from 'wxt';

// One session shared by WXT's live server, entrypoint importer and dev builds.
// Importer/build config resolution creates unrelated Vite tokens; only the
// actual listening server may select the credential used by reload clients.
export function createDevSecurity() {
  let socketUrl: string | undefined;

  return function devSecurity(): NonNullable<WxtViteConfig['plugins']>[number] {
    return {
      name: 'unhook:dev-security',
      enforce: 'post',
      config() {
        // WXT sets the legacy bypass in its base config before plugin hooks.
        return { define: {}, legacy: { skipWebSocketTokenCheck: false } };
      },
      configureServer(server) {
        const origin = server.config.server.origin;
        const token = server.config.webSocketToken;
        if (!origin || !token || !server.config.define) throw new Error('Missing authenticated dev-server configuration');
        const url = new URL(origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.searchParams.set('token', token);
        socketUrl = url.href;
        server.config.define.__DEV_SERVER_ORIGIN__ = JSON.stringify(socketUrl);
        for (const environment of Object.values(server.environments)) {
          (environment.config.define ??= {}).__DEV_SERVER_ORIGIN__ = JSON.stringify(socketUrl);
        }

        // Registered before Vite's own editor middleware. No browser request
        // should open an app or replace a terminal editor child process.
        server.middlewares.use('/__open-in-editor', (_req, res) => {
          res.statusCode = 403;
          res.end('Editor launch is disabled');
        });
      },
      configResolved(config) {
        if (!socketUrl) return;
        if (!config.define) throw new Error('Missing dev-client defines');
        config.define.__DEV_SERVER_ORIGIN__ = JSON.stringify(socketUrl);
        for (const environment of Object.values(config.environments)) {
          (environment.define ??= {}).__DEV_SERVER_ORIGIN__ = JSON.stringify(socketUrl);
        }
      },
    };
  };
}

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, symlink, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer, request } from 'node:http';
import { test } from 'node:test';
import { createServer } from 'wxt';

const root = fileURLToPath(new URL('../', import.meta.url));
// Even when the guard is deliberately removed for a negative control, an
// editor request must never open a real app. This process is test-file-local.
process.env.LAUNCH_EDITOR = '/usr/bin/true';

async function unusedPort() {
  const server = createHttpServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function handshake(url) {
  return new Promise((resolve, reject) => {
    const req = request(url.replace(/^ws:/, 'http:'), {
      headers: {
        Origin: 'http://untrusted.invalid',
        Connection: 'Upgrade', Upgrade: 'websocket',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Protocol': 'vite-hmr',
      },
    });
    req.setTimeout(5000, () => req.destroy(new Error('handshake timed out')));
    req.on('error', reject);
    req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode); });
    req.on('response', (res) => { res.resume(); resolve(res.statusCode); });
    req.end();
  });
}

function socketUrl(code) {
  const match = code.match(/(?:const|let|var) serverUrl = ["'](ws[^"']+)["']/);
  assert.ok(match, 'real WXT reload client contains its connection URL');
  const url = new URL(match[1]);
  assert.ok(url.searchParams.get('token'), 'reload client carries a session token');
  return url;
}

async function htmlSocketUrl(output) {
  const html = await readFile(join(output, 'popup.html'), 'utf8');
  const scripts = [...html.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
  const bundle = scripts.find((path) => path.startsWith('/chunks/') || path.startsWith('./chunks/'));
  assert.ok(bundle, 'built popup actually references its reload bundle');
  const code = await readFile(join(output, bundle.replace(/^\.?\//, '')), 'utf8');
  assert.match(code, /wxt:reload-page/, 'the bundle contains the actual HTML reload client');
  assert.match(code, /new WebSocket\(serverUrl, "vite-hmr"\)/);
  return socketUrl(code);
}

for (const browser of ['chrome', 'firefox']) {
  test(`${browser}: real WXT reload clients authenticate; HTTP editor requests are denied`, { timeout: 60000 }, async () => {
    const scratch = await realpath(await mkdtemp(join(tmpdir(), 'unhook-dev-security-')));
    let server;
    try {
      await mkdir(join(scratch, 'scripts'));
      await mkdir(join(scratch, 'entrypoints/popup'), { recursive: true });
      await cp(join(root, 'wxt.config.ts'), join(scratch, 'wxt.config.ts'));
      await cp(join(root, 'scripts/dev-security.ts'), join(scratch, 'scripts/dev-security.ts'));
      await symlink(join(root, 'node_modules'), join(scratch, 'node_modules'), 'dir');
      await writeFile(join(scratch, 'package.json'), '{"name":"dev-security-fixture","version":"0.0.0","type":"module"}');
      await writeFile(join(scratch, 'entrypoints/background.ts'),
        "import { defineBackground } from 'wxt/utils/define-background'; export default defineBackground(() => {});");
      await writeFile(join(scratch, 'entrypoints/popup/index.html'),
        '<html><head><title>Dummy fixture</title></head><body><script type="module" src="./main.ts"></script></body></html>');
      await writeFile(join(scratch, 'entrypoints/popup/main.ts'), 'console.log("dummy fixture");');
      const port = await unusedPort();
      server = await createServer({
        root: scratch, browser, webExt: { disabled: true },
        dev: { server: { host: '127.0.0.1', port, origin: `http://127.0.0.1:${port}` } },
      });
      await server.start();
      const output = join(scratch, '.output', browser === 'chrome' ? 'chrome-mv3-dev' : 'firefox-mv2-dev');
      const background = socketUrl(await readFile(join(output, 'background.js'), 'utf8'));
      const htmlReload = await htmlSocketUrl(output);
      assert.equal(htmlReload.href, background.href, 'both custom clients use the listening server token');
      assert.equal(await handshake(background.href), 101, 'valid credential reaches the real server');
      const missing = new URL(background);
      missing.search = '';
      assert.notEqual(await handshake(missing.href), 101, 'foreign-origin browser without token is rejected');
      missing.searchParams.set('token', 'wrong-session');
      assert.notEqual(await handshake(missing.href), 101, 'incorrect token is rejected');

      for (const path of ['/__open-in-editor', '/__open-in-editor/']) {
        const url = new URL(path, server.origin);
        url.searchParams.set('file', join(scratch, 'package.json'));
        for (const method of ['GET', 'POST']) {
          const denied = await fetch(url, { method, headers: { Origin: 'http://untrusted.invalid' } });
          assert.equal(denied.status, 403, `${method} ${path} cannot reach the launcher`);
        }
      }

      // A server restart selects a new token. The previous credential must fail.
      const oldToken = background.searchParams.get('token');
      await server.restart();
      const restarted = socketUrl(await readFile(join(output, 'background.js'), 'utf8'));
      assert.notEqual(restarted.searchParams.get('token'), oldToken);
      assert.equal(await handshake(restarted.href), 101);
      assert.notEqual(await handshake(background.href), 101);
    } finally {
      await server?.stop();
      await rm(scratch, { recursive: true, force: true });
    }
  });
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, existsSync, rmSync, symlinkSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t, { installed = true } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), 'unhook-reinstall-test-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, 'project with spaces $(touch surprise) `touch surprise`');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  const script = join(root, 'scripts/install-nosync.sh');
  cpSync(new URL('../scripts/install-nosync.sh', import.meta.url), script);
  writeFileSync(join(root, 'package.json'), '{"name":"original"}\n');
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'original-lock\n');
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'original-workspace\n');
  writeFileSync(join(root, 'unrelated.tmp'), 'user file');
  if (installed) {
    mkdirSync(join(root, 'node_modules')); writeFileSync(join(root, 'node_modules/old'), 'old');
    mkdirSync(join(root, '.wxt')); writeFileSync(join(root, '.wxt/old'), 'old');
  }
  const bin = join(temporary, 'bin'); mkdirSync(bin);
  writeFileSync(join(bin, 'pnpm'), `#!/bin/bash
set -eu
case "$1" in
  install)
    mkdir node_modules
    echo candidate > node_modules/new
    echo '{"name":"candidate"}' > package.json
    echo candidate-lock > pnpm-lock.yaml
    [ "$FAIL_STAGE" != install ] || exit 16
    ;;
  rebuild)
    [ "$FAIL_STAGE" != rebuild ] || exit 17
    ;;
  exec)
    mkdir -p .wxt
    echo candidate > .wxt/new
    case "$FAIL_STAGE" in
      prepare) exit 18;;
      term) kill -TERM "$PPID";;
      int) kill -INT "$PPID";;
      kill) kill -KILL "$PPID";;
    esac
    ;;
  *) exit 99;;
esac
`, { mode: 0o755 });
  return {
    root,
    run(fail = '', args = [], lock = false) {
      const command = lock ? ['-c', `
        exec 9> .reinstall.lock
        if command -v lockf >/dev/null; then lockf -s -t 0 9; else flock -n 9; fi
        bash "$@"
      `, 'lock-holder', script, ...args] : [script, ...args];
      return spawnSync('bash', command, {
        cwd: root, env: { ...process.env, TMPDIR: temporary, PATH: bin + ':' + process.env.PATH, FAIL_STAGE: fail },
        encoding: 'utf8', timeout: 10000,
      });
    },
    assertRestored() {
      assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), '{"name":"original"}\n');
      assert.equal(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'), 'original-lock\n');
      assert.equal(existsSync(join(root, 'node_modules/old')), installed);
      assert.equal(existsSync(join(root, '.wxt/old')), installed);
      assert.equal(existsSync(join(root, 'node_modules/new')), false);
      assert.equal(existsSync(join(root, '.wxt/new')), false);
      assert.equal(readFileSync(join(root, 'unrelated.tmp'), 'utf8'), 'user file');
      assert.equal(existsSync(join(root, '.reinstall-backup')), false);
      assert.equal(existsSync(join(root, 'surprise')), false);
    },
  };
}

for (const stage of ['install', 'rebuild', 'prepare', 'term', 'int']) {
  test(`reinstall restores dependencies, manifests and generated state after ${stage} failure`, t => {
    const h = fixture(t);
    const result = h.run(stage);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    h.assertRestored();
    assert.equal(h.run().status, 0, 'a rolled-back installation can be retried');
  });
}

test('successful reinstall promotes one complete generation and removes backups', t => {
  const h = fixture(t);
  const result = h.run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(existsSync(join(h.root, 'node_modules/new')), true);
  assert.equal(existsSync(join(h.root, '.wxt/new')), true);
  assert.equal(existsSync(join(h.root, 'node_modules/old')), false);
  assert.equal(existsSync(join(h.root, '.reinstall-backup')), false);
  assert.equal(readFileSync(join(h.root, 'package.json'), 'utf8'), '{"name":"candidate"}\n');
  assert.equal(h.run().status, 0, 'repeated installs succeed');
});

test('an uncatchable interruption preserves recovery data and supports explicit recovery', t => {
  const h = fixture(t);
  const interrupted = h.run('kill');
  assert.equal(interrupted.signal, 'SIGKILL');
  assert.equal(existsSync(join(h.root, '.reinstall-backup/node_modules/old')), true);
  assert.notEqual(h.run().status, 0, 'normal reinstall cannot overwrite recovery data');
  const result = h.run('', ['--recover']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  h.assertRestored();
  assert.equal(h.run().status, 0);
});

test('failed first install restores the absence of generated directories', t => {
  const h = fixture(t, { installed: false });
  assert.notEqual(h.run('prepare').status, 0);
  h.assertRestored();
});

test('reinstall refuses symlinked dependencies without modifying their target', t => {
  const h = fixture(t, { installed: false });
  const foreign = join(h.root, 'foreign'); mkdirSync(foreign);
  writeFileSync(join(foreign, 'keep'), 'user file');
  symlinkSync(foreign, join(h.root, 'node_modules'));
  assert.notEqual(h.run().status, 0);
  assert.equal(readFileSync(join(foreign, 'keep'), 'utf8'), 'user file');
  assert.equal(readFileSync(join(h.root, 'package.json'), 'utf8'), '{"name":"original"}\n');
});

test('reinstall refuses an unrecognized recovery directory', t => {
  const h = fixture(t);
  mkdirSync(join(h.root, '.reinstall-backup'));
  writeFileSync(join(h.root, '.reinstall-backup/user-file'), 'keep');
  assert.notEqual(h.run().status, 0);
  assert.notEqual(h.run('', ['--recover']).status, 0);
  assert.equal(readFileSync(join(h.root, '.reinstall-backup/user-file'), 'utf8'), 'keep');
});

test('recovery refuses to interfere with an active reinstall', t => {
  const h = fixture(t);
  mkdirSync(join(h.root, '.reinstall-backup'));
  writeFileSync(join(h.root, '.reinstall-backup/owner'), 'unhook-linkedin-reinstall-v1\n');
  writeFileSync(join(h.root, '.reinstall-backup/pid'), String(process.pid));
  assert.notEqual(h.run('', ['--recover']).status, 0);
  assert.equal(existsSync(join(h.root, 'node_modules/old')), true);
});

test('recovery never writes through a pre-existing temporary-file symlink', t => {
  const h = fixture(t);
  assert.equal(h.run('kill').signal, 'SIGKILL');
  const foreign = join(h.root, 'foreign-user-file');
  writeFileSync(foreign, 'keep');
  symlinkSync(foreign, join(h.root, '.reinstall-backup/restore-package.json'));
  const result = h.run('', ['--recover']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(readFileSync(foreign, 'utf8'), 'keep');
  assert.equal(lstatSync(join(h.root, 'package.json')).isSymbolicLink(), false);
  h.assertRestored();
});

test('recovery refuses a second recovery before changing the checkout', t => {
  const h = fixture(t);
  assert.equal(h.run('kill').signal, 'SIGKILL');
  assert.notEqual(h.run('', ['--recover'], true).status, 0);
  assert.equal(existsSync(join(h.root, '.reinstall-backup/node_modules/old')), true);
  assert.equal(existsSync(join(h.root, 'node_modules/new')), true);
});

test('install and recovery share the same operating-system lock', t => {
  const h = fixture(t);
  assert.notEqual(h.run('', [], true).status, 0);
  h.assertRestored();
  assert.equal(h.run().status, 0);
});

test('the persistent lock preserves existing contents and refuses symlinks', t => {
  const h = fixture(t);
  const lock = join(h.root, '.reinstall.lock');
  writeFileSync(lock, 'keep');
  assert.equal(h.run().status, 0);
  assert.equal(readFileSync(lock, 'utf8'), 'keep');
  rmSync(lock);
  const foreign = join(h.root, 'foreign-lock'); writeFileSync(foreign, 'user file');
  symlinkSync(foreign, lock);
  assert.notEqual(h.run().status, 0);
  assert.equal(readFileSync(foreign, 'utf8'), 'user file');
});

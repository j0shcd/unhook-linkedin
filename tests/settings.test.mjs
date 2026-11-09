import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSettingsHarness, tick } from './settings-harness.mjs';

test('older storage echoes cannot erase a newer theme during queued writes', async () => {
  const h = await createSettingsHarness();
  h.mount(); await tick();
  h.hook.update({ enabled: false });
  h.hook.update({ theme: 'dark' });
  await tick();
  assert.equal(h.writes.length, 1, 'writes are serialized; updater replay adds none');
  await h.completeWrite(0);
  assert.equal(h.hook.settings.theme, 'dark');
  h.hook.update({ enabled: true });
  await h.completeWrite(1);
  await h.completeWrite(2);
  assert.equal(h.stored.theme, 'dark');
  assert.equal(h.stored.enabled, true);
  h.echo(h.writes[0].next); await tick();
  assert.equal(h.hook.settings.theme, 'dark', 'late echo re-reads current storage');
});

test('a failed write retains the requested settings and can be retried', async () => {
  const h = await createSettingsHarness();
  h.mount(); await tick();
  h.hook.update({ theme: 'dark' }); await tick();
  await h.completeWrite(0, { fail: true });
  assert.equal(h.hook.settings.theme, 'dark');
  assert.equal(h.hook.error, 'save');
  h.hook.retry(); await tick();
  await h.completeWrite(1);
  assert.equal(h.stored.theme, 'dark');
  assert.equal(h.hook.error, null);
});

test('a failed earlier write does not discard a newer successful choice', async () => {
  const h = await createSettingsHarness();
  h.mount(); await tick();
  h.hook.update({ enabled: false });
  h.hook.update({ theme: 'dark' }); await tick();
  await h.completeWrite(0, { fail: true });
  await h.completeWrite(1);
  assert.equal(h.stored.theme, 'dark');
  assert.equal(h.stored.enabled, false);
  assert.equal(h.hook.error, null);
});

for (const recovery of ['retry', 'notification']) {
  test(`initial read failure recovers through ${recovery}`, async () => {
    const h = await createSettingsHarness({ enabled: false }, { readFailures: 1 });
    h.mount(); await tick();
    assert.equal(h.hook.loaded, false);
    assert.equal(h.hook.error, 'load');
    if (recovery === 'retry') h.hook.retry();
    else h.notify({ enabled: false, theme: 'dark' });
    await tick();
    assert.equal(h.hook.loaded, true);
    assert.equal(h.hook.settings.enabled, false);
    assert.equal(h.hook.error, null);
  });
}

test('a stale initial read cannot replace a newer notification', async () => {
  const h = await createSettingsHarness({ theme: 'light' });
  h.deferReads(); h.mount();
  h.notify({ theme: 'dark' });
  h.completeRead(1); await tick();
  h.completeRead(0); await tick();
  assert.equal(h.hook.settings.theme, 'dark');
});

test('cleanup prevents an obsolete read from changing a remounted hook', async () => {
  const h = await createSettingsHarness({ theme: 'light' });
  h.deferReads(); h.mount(); h.unmount();
  h.notify({ theme: 'dark' }); h.mount();
  h.completeRead(1); await tick();
  h.completeRead(0); await tick();
  assert.equal(h.hook.settings.theme, 'dark');
});

test('redirect exclusivity is enforced at reads, writes and notifications', async () => {
  const h = await createSettingsHarness({ redirectMessages: true, redirectJobs: true });
  const loaded = await h.api.getSettings();
  assert.equal(loaded.redirectMessages, true);
  assert.equal(loaded.redirectJobs, false, 'existing Messages priority is retained');
  const saving = h.api.setSettings({ ...loaded, redirectJobs: true }); await tick();
  await h.completeWrite(0); await saving;
  assert.equal(h.stored.redirectJobs, false);
  let observed;
  h.api.watchSettings(next => { observed = next; });
  h.notify({ redirectMessages: true, redirectJobs: true });
  assert.equal(observed.redirectJobs, false);
});

test('choosing either redirect replaces the other at the shared patch boundary', async () => {
  const h = await createSettingsHarness({ redirectMessages: true });
  h.mount(); await tick();
  h.hook.update({ redirectJobs: true }); await tick();
  assert.equal(h.hook.settings.redirectMessages, false);
  assert.equal(h.hook.settings.redirectJobs, true);
  await h.completeWrite(0);
  h.hook.update({ redirectMessages: true }); await tick();
  assert.equal(h.hook.settings.redirectMessages, true);
  assert.equal(h.hook.settings.redirectJobs, false);
  await h.completeWrite(1);
});

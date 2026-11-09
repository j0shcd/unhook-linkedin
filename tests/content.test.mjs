import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createContentHarness } from './content-harness.mjs';

const feedRoutes = ['/', '/feed', '/feed/', '/feed?trk=home#top', '/feed/foryou', '/feed/foryou/', '/feed/foryou/?trk=home#top'];
const otherRoutes = ['/messaging/', '/jobs/', '/in/example/', '/feed/update/urn:li:activity:123/', '/feed/foryou/post/', '/feed/foryouish/', '/feed/following/'];

function assertBlocked(harness, blocked) {
  assert.equal(harness.root.getAttribute('data-unhook-block-feed'), '1');
  assert.equal(harness.root.getAttribute('data-unhook-on-feed'), blocked ? '1' : null);
  assert.equal(harness.post.getAttribute('data-unhook-feed-target'), blocked ? '1' : null);
  assert.equal(harness.composer.hasAttribute('data-unhook-feed-target'), false);
}

for (const route of feedRoutes) {
  test(`blocks ${route} at startup and after settings load`, async () => {
    const harness = await createContentHarness(route);
    const started = harness.start();
    assert.equal(harness.root.getAttribute('data-unhook-on-feed'), '1', 'early CSS gate');
    await started;
    assertBlocked(harness, true);
    assert.deepEqual(harness.redirects, []);
    assert.equal(harness.insertPost().getAttribute('data-unhook-feed-target'), '1');
  });

  for (const [setting, destination] of [['redirectMessages', 'messaging'], ['redirectJobs', 'jobs']]) {
    test(`redirects ${route} to ${destination}`, async () => {
      const harness = await createContentHarness(route, { [setting]: true });
      await harness.start();
      assert.deepEqual(harness.redirects, [`https://www.linkedin.com/${destination}/`]);
    });
  }

  for (const setting of ['enabled', 'blockFeed']) {
    test(`${setting}=false disables blocking and redirects on ${route}`, async () => {
      const harness = await createContentHarness(route, { [setting]: false, redirectMessages: true, redirectJobs: true });
      await harness.start();
      assert.equal(harness.root.hasAttribute('data-unhook-block-feed'), false);
      assert.equal(harness.post.hasAttribute('data-unhook-feed-target'), false);
      assert.deepEqual(harness.redirects, []);
    });
  }
}

for (const route of otherRoutes) {
  test(`leaves ${route} visible and does not redirect`, async () => {
    const harness = await createContentHarness(route, { redirectMessages: true, redirectJobs: true });
    await harness.start();
    assertBlocked(harness, false);
    assert.deepEqual(harness.redirects, []);
  });
}

for (const route of ['/feed/', '/feed/foryou/']) {
  test(`applies the early gate when clicking ${route}`, async () => {
    const harness = await createContentHarness('/jobs/');
    await harness.start();
    harness.click(route);
    assert.equal(harness.root.getAttribute('data-unhook-on-feed'), '1');
  });

  test(`settings changes reapply blocking and redirects on ${route}`, async () => {
    const harness = await createContentHarness(route);
    await harness.start();
    harness.updateSettings({ enabled: false });
    assert.equal(harness.post.hasAttribute('data-unhook-feed-target'), false);
    harness.updateSettings({ enabled: true });
    assertBlocked(harness, true);
    harness.updateSettings({ redirectJobs: true });
    assert.deepEqual(harness.redirects, ['https://www.linkedin.com/jobs/']);
  });

  for (const event of ['popstate', 'poll', 'mutation']) {
    test(`${event} navigation blocks ${route} and clears blocking after leaving`, async () => {
      const harness = await createContentHarness('/jobs/');
      await harness.start();
      harness.navigate(route, event);
      assertBlocked(harness, true);
      harness.navigate('/in/example/', event);
      assertBlocked(harness, false);
    });

    for (const [setting, destination] of [['redirectMessages', 'messaging'], ['redirectJobs', 'jobs']]) {
      test(`${event} navigation redirects ${route} to ${destination}`, async () => {
        const harness = await createContentHarness('/in/example/', { [setting]: true });
        await harness.start();
        harness.navigate(route, event);
        assert.deepEqual(harness.redirects, [`https://www.linkedin.com/${destination}/`]);
      });
    }
  }
}

test('external and individual-post links do not activate the early gate', async () => {
  for (const href of ['https://example.com/feed/foryou/', 'https://www.linkedin.com.evil.example/feed/foryou/', '/feed/update/urn:li:activity:123/']) {
    const harness = await createContentHarness('/jobs/');
    await harness.start();
    harness.click(href);
    assert.equal(harness.root.hasAttribute('data-unhook-on-feed'), false, href);
  }
});

test('initial storage failure keeps navigation and settings recovery working', async () => {
  const harness = await createContentHarness('/feed/', {}, {
    getValue: () => Promise.reject(new Error('storage unavailable')),
  });
  await harness.start();
  assert.equal(harness.root.hasAttribute('data-unhook-block-feed'), false, 'unknown preferences leave the page usable');
  harness.navigate('/jobs/');
  harness.updateSettings({ enabled: true });
  harness.navigate('/feed/foryou/');
  assertBlocked(harness, true);
  harness.updateSettings({ enabled: false });
  assert.equal(harness.post.hasAttribute('data-unhook-feed-target'), false);
});

test('a settings notification during startup wins over the older initial read', async () => {
  let resolveRead;
  const harness = await createContentHarness('/feed/', {}, {
    getValue: () => new Promise(resolve => { resolveRead = resolve; }),
  });
  const started = harness.start();
  harness.updateSettings({ enabled: false });
  resolveRead({ enabled: true });
  await started;
  assert.equal(harness.root.hasAttribute('data-unhook-block-feed'), false);
  assert.equal(harness.post.hasAttribute('data-unhook-feed-target'), false);
});

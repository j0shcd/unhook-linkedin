import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

// Only the DOM methods used by the content script are modeled here. Browser
// layout and LinkedIn's current markup still need a manual release check.
class Element {
  attributes = new Map();
  children = [];

  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
}

class HTMLAnchorElement extends Element {
  constructor(href) {
    super();
    this.href = href;
  }

  closest(selector) { return selector === 'a[href]' ? this : null; }
}

export async function createContentHarness(path, settings = {}, { getValue } = {}) {
  const root = new Element();
  const post = new Element();
  const composer = new Element();
  composer.querySelector = () => new Element();
  const feed = new Element();
  feed.children = [composer, post];
  const listeners = new Map();
  const timers = [];
  const redirects = [];
  let watchSettings;
  let pollUrl;
  let observeMutation;
  let url = new URL(path, 'https://www.linkedin.com');

  const context = createContext({
    URL, Element, HTMLAnchorElement,
    location: {
      get href() { return url.href; },
      get pathname() { return url.pathname; },
      replace(href) { redirects.push(href); },
    },
    document: {
      documentElement: root,
      body: new Element(),
      addEventListener(name, callback) { listeners.set(name, callback); },
      querySelectorAll(selector) {
        if (selector === '[data-unhook-feed-target]') {
          return feed.children.filter(el => el.hasAttribute('data-unhook-feed-target'));
        }
        if (selector.includes('[data-testid="mainFeed"]')) return [feed];
        throw new Error(`Unexpected document selector: ${selector}`);
      },
    },
    window: {
      addEventListener(name, callback) { listeners.set(name, callback); },
      setInterval(callback) { pollUrl = callback; },
    },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    MutationObserver: class {
      constructor(callback) { observeMutation = callback; }
      observe() {}
    },
  });

  function moduleFromFile(path) {
    return new SourceTextModule(stripTypeScriptTypes(readFileSync(new URL(path, import.meta.url), 'utf8')), {
      context, identifier: path,
    });
  }

  function mockModule(exports) {
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  }

  const settingsModule = moduleFromFile('../lib/settings.ts');
  const contentModule = moduleFromFile('../entrypoints/content/index.ts');
  const modules = {
    'wxt/utils/define-content-script': mockModule({ defineContentScript: config => config }),
    '@/lib/settings': settingsModule,
    './style.css': mockModule({}),
    'wxt/utils/storage': mockModule({
      storage: {
        defineItem() {
          return {
            async getValue() { return getValue ? getValue() : settings; },
            watch(callback) { watchSettings = callback; return () => {}; },
          };
        },
      },
    }),
  };
  await contentModule.link(specifier => {
    if (!(specifier in modules)) throw new Error(`Unexpected import: ${specifier}`);
    return modules[specifier];
  });
  await contentModule.evaluate();

  function flushTimers() {
    while (timers.length) timers.shift()();
  }

  return {
    root, post, composer, redirects,
    start: () => contentModule.namespace.default.main(),
    click(href) { listeners.get('click')({ target: new HTMLAnchorElement(new URL(href, url).href) }); },
    navigate(path, event = 'popstate') {
      url = new URL(path, url);
      if (event === 'poll') pollUrl();
      else if (event === 'mutation') observeMutation();
      else listeners.get(event)();
    },
    updateSettings(next) { settings = { ...settings, ...next }; watchSettings?.(settings); flushTimers(); },
    insertPost() {
      const next = new Element();
      feed.children.push(next);
      observeMutation();
      flushTimers();
      return next;
    },
  };
}

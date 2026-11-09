import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

export const tick = () => new Promise(setImmediate);

// Run the real storage boundary and hook; control storage completion order.
// The hook fixture models re-renders, cleanup and Strict Mode updater replay.
export async function createSettingsHarness(initial = {}, { readFailures = 0 } = {}) {
  const context = createContext({});
  let stored = initial;
  const watchers = new Set();
  const writes = [];
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  let effect;
  let cleanup;
  let rendering = false;
  let reads = 0;
  const pendingReads = [];
  let deferReads = false;

  const mock = (values) => new SyntheticModule(Object.keys(values), function () {
    for (const [name, value] of Object.entries(values)) this.setExport(name, value);
  }, { context });

  const storageModule = mock({ storage: { defineItem: () => ({
    getValue() {
      reads++;
      if (readFailures-- > 0) return Promise.reject(new Error('storage unavailable'));
      if (deferReads) return new Promise(resolve => pendingReads.push({ resolve, value: stored }));
      return Promise.resolve(stored);
    },
    setValue(next) {
      return new Promise((resolve, reject) => writes.push({ next, resolve, reject }));
    },
    watch(callback) { watchers.add(callback); return () => watchers.delete(callback); },
  }) } });
  const reactModule = mock({
    useState(initialValue) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initialValue;
      return [states[index], value => {
        if (typeof value === 'function') {
          value(states[index]); // Strict Mode discards the first updater result.
          states[index] = value(states[index]);
        } else states[index] = value;
      }];
    },
    useRef(initialValue) {
      const index = refIndex++;
      return refs[index] ??= { current: initialValue };
    },
    useEffect(callback) { if (!rendering) effect = callback; },
  });
  const source = (path) => new SourceTextModule(
    stripTypeScriptTypes(readFileSync(new URL(path, import.meta.url), 'utf8')), { context },
  );
  const settings = source('../lib/settings.ts');
  await settings.link(() => storageModule);
  await settings.evaluate();
  const hook = source('../lib/useSettings.ts');
  await hook.link(name => name === 'react' ? reactModule : settings);
  await hook.evaluate();

  const render = () => {
    stateIndex = refIndex = 0;
    const result = hook.namespace.useSettings();
    rendering = true;
    return result;
  };
  render();

  return {
    api: settings.namespace, writes,
    get stored() { return stored; },
    get hook() { return render(); },
    get reads() { return reads; },
    mount() { cleanup = effect(); },
    unmount() { cleanup(); },
    notify(next) { stored = next; for (const watch of watchers) watch(next); },
    echo(next) { for (const watch of watchers) watch(next); },
    deferReads() { deferReads = true; },
    completeRead(index = 0) { pendingReads[index].resolve(pendingReads[index].value); },
    async completeWrite(index, { fail = false } = {}) {
      const write = writes[index];
      if (fail) write.reject(new Error('write failed'));
      else {
        stored = write.next;
        for (const watch of watchers) watch(stored);
        write.resolve();
      }
      await tick();
    },
  };
}

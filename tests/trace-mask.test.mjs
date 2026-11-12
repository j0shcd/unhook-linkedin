import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

async function loadTrace(Potrace) {
  const context = vm.createContext({ Buffer });
  const module = new vm.SourceTextModule(
    await readFile(new URL('../scripts/trace-mask.mjs', import.meta.url), 'utf8'), { context },
  );
  await module.link((name) => {
    // This boundary must never need filesystem or temporary-directory access.
    assert.equal(name, 'potrace');
    return new vm.SyntheticModule(['default'], function () {
      this.setExport('default', { Potrace });
    }, { context });
  });
  await module.evaluate();
  return module.namespace.tracePath;
}

test('concurrent equal-length masks reach the decoder as their original buffers', async () => {
  const pending = [];
  const tracePath = await loadTrace(class {
    loadImage(input, callback) { pending.push({ input, callback }); }
    getSVG() { return '<svg><path d="M0 0"/><path d="L1 1"/></svg>'; }
  });
  const first = Buffer.from('mask-a');
  const second = Buffer.from('mask-b');
  const results = [tracePath(first), tracePath(second)];
  assert.strictEqual(pending[0].input, first);
  assert.strictEqual(pending[1].input, second);
  pending[1].callback(null);
  pending[0].callback(null);
  assert.deepEqual(await Promise.all(results), ['M0 0 L1 1', 'M0 0 L1 1']);
});

test('decoder failures reject without needing temporary-file cleanup', async () => {
  const failure = new Error('invalid fixture');
  const tracePath = await loadTrace(class {
    loadImage(input, callback) { callback(failure); }
    getSVG() { assert.fail('failed decoding must not produce output'); }
  });
  await assert.rejects(tracePath(Buffer.from('broken')), (error) => error === failure);
});

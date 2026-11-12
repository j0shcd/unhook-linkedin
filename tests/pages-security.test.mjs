import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm, link, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');

test('Pages artifact upload has no mutable nested composite dependency', () => {
  const actions = [...workflow.matchAll(/^\s+uses:\s+(\S+)/gm)].map((match) => match[1]);
  assert.equal(actions.length, 4, 'every external action is inspected');
  for (const action of actions) assert.match(action, /^actions\/[\w-]+@[a-f0-9]{40}$/);
  assert.ok(actions.some((action) => action.startsWith('actions/upload-artifact@')));
  assert.ok(!actions.some((action) => action.startsWith('actions/upload-pages-artifact@')));
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /name: github-pages\n\s+path: \$\{\{ runner.temp \}\}\/artifact.tar\n\s+archive: true\n\s+retention-days: 1\n\s+if-no-files-found: error/);
});

test('the actual workflow archive step retains the Pages tar layout', async () => {
  const block = workflow.match(/      - name: Archive Pages\n        shell: bash\n        run: \|\n((?:(?:          .*|)(?:\n|$))+)/);
  assert.ok(block, 'archive command is extracted from the real workflow');
  const command = block[1].replace(/^          /gm, '');
  const scratch = await mkdtemp(join(tmpdir(), 'unhook-pages-'));
  try {
    await mkdir(join(scratch, 'docs/.git'), { recursive: true });
    await mkdir(join(scratch, 'docs/.github'));
    await mkdir(join(scratch, 'output'));
    await writeFile(join(scratch, 'docs/index.html'), 'index fixture');
    await writeFile(join(scratch, 'docs/privacy.html'), 'privacy fixture');
    await link(join(scratch, 'docs/index.html'), join(scratch, 'docs/hard-link.html'));
    await symlink('privacy.html', join(scratch, 'docs/symbolic-link.html'));
    await writeFile(join(scratch, 'docs/.git/config'), 'excluded fixture');
    await writeFile(join(scratch, 'docs/.github/workflow.yml'), 'excluded fixture');
    execFileSync('/bin/bash', ['-euc', command], {
      cwd: scratch,
      env: { PATH: '/usr/bin:/bin', RUNNER_TEMP: join(scratch, 'output') },
      timeout: 5000,
    });
    const entries = JSON.parse(execFileSync('python3', ['-c',
      'import json, sys, tarfile; a = tarfile.open(sys.argv[1]); print(json.dumps({e.name: {"regular": e.isfile(), "text": a.extractfile(e).read().decode() if e.isfile() else None} for e in a}))',
      join(scratch, 'output/artifact.tar'),
    ], { encoding: 'utf8', timeout: 5000 }));
    assert.equal(entries['./index.html'].text, 'index fixture');
    assert.equal(entries['./privacy.html'].text, 'privacy fixture');
    assert.deepEqual(entries['./hard-link.html'], { regular: true, text: 'index fixture' });
    assert.deepEqual(entries['./symbolic-link.html'], { regular: true, text: 'privacy fixture' });
    assert.ok(Object.keys(entries).every((name) => !name.includes('.git')));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isDirectRun, resolveCliOptions, runDemo } from '../src/demo/demo-runner.mjs';

test('demo runner executes miss then hit and returns exported files', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-demo-'));
  try {
    const result = await runDemo({ workspace });

    assert.equal(result.first.cacheStatus, 'miss');
    assert.equal(result.second.cacheStatus, 'hit');
    assert.equal(result.first.exportRefs.length, 1);
    assert.deepEqual(result.second.exportRefs, result.first.exportRefs);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('direct run detection works with Windows paths containing non-ASCII characters', () => {
  assert.equal(
    isDirectRun('file:///E:/%E4%B8%83%E7%89%9B%E4%BA%91/src/demo/demo-runner.mjs', 'E:\\七牛云\\src\\demo\\demo-runner.mjs'),
    true,
  );
});

test('cli options can select an isolated workspace', () => {
  assert.deepEqual(
    resolveCliOptions(['node', 'src/demo/demo-runner.mjs', '--workspace', 'demo-workspace']),
    { workspace: 'demo-workspace' },
  );
});

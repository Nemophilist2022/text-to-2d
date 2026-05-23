import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runAssetJob } from '../src/core/orchestrator.mjs';
import { createPrebuiltBackend } from '../src/backends/prebuilt-backend.mjs';

const request = {
  assetId: 'hero-idle',
  assetType: 'character',
  backendId: 'prebuilt',
  parameters: {
    name: 'Hero',
    style: 'pixel',
    size: { width: 64, height: 64 },
    view: 'front',
    frames: [{ id: 'idle-0', order: 0 }],
    promptHints: ['blue cloak'],
  },
  postprocessSpec: { version: 'mvp-1', operations: ['copy'] },
  exportSpec: { format: 'image-directory', version: 'mvp-1' },
  forceRegenerate: false,
};

test('first run produces visible exports and observable cache miss state', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const result = await runAssetJob(request, {
      workspace,
      backends: { prebuilt: createPrebuiltBackend() },
    });

    assert.equal(result.status, 'success');
    assert.equal(result.cacheStatus, 'miss');
    assert.equal(result.backendId, 'prebuilt');
    assert.equal(result.events.includes('cache.miss'), true);
    assert.equal(result.events.includes('backend.generate'), true);
    assert.equal(result.events.includes('postprocess.copy'), true);
    assert.equal(result.events.includes('export.write'), true);
    assert.equal(result.exportRefs.length, 1);

    const exported = await readFile(result.exportRefs[0], 'utf8');
    assert.match(exported, /<svg/);
    assert.match(exported, /data-postprocessed="true"/);

    const metadata = JSON.parse(await readFile(result.metadataRef, 'utf8'));
    assert.equal(metadata.assetId, 'hero-idle');
    assert.equal(metadata.cacheStatus, 'miss');
    assert.equal(metadata.exportRefs.length, 1);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('second run with same request reuses cache and still exports visible output', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const options = { workspace, backends: { prebuilt: createPrebuiltBackend() } };

    const first = await runAssetJob(request, options);
    const second = await runAssetJob(request, options);

    assert.equal(first.cacheStatus, 'miss');
    assert.equal(second.cacheStatus, 'hit');
    assert.equal(second.events.includes('cache.hit'), true);
    assert.equal(second.events.includes('backend.generate'), false);
    assert.equal(second.cacheKey, first.cacheKey);

    const metadata = JSON.parse(await readFile(second.metadataRef, 'utf8'));
    assert.equal(metadata.cacheStatus, 'hit');
    assert.equal(metadata.cacheKey, first.cacheKey);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

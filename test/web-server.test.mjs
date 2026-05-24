import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { createWorkbenchServer } from '../src/server/app-server.mjs';

async function listen(server) {
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) {
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
}

test('web server generates a codex-local asset from page request and serves outputs', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-web-'));
  const server = createWorkbenchServer({
    workspace,
    uiRoot: resolve('ui'),
    defaultBackendId: 'codex-local',
  });

  try {
    const baseUrl = await listen(server);

    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).defaultBackendId, 'codex-local');

    const html = await fetch(`${baseUrl}/`);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /Generate Asset/);

    const first = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: '像素风宝石道具',
        assetType: 'item',
        style: 'pixel',
        size: '32x32',
        backendId: 'codex-local',
      }),
    });
    assert.equal(first.status, 200);
    const firstBody = await first.json();

    assert.equal(firstBody.status, 'success');
    assert.equal(firstBody.cacheStatus, 'miss');
    assert.equal(firstBody.assetId, 'gem-idle');
    assert.equal(firstBody.recipe.presetId, 'gem_item');
    assert.equal(firstBody.generationPacket.presetId, 'gem_item');
    assert.ok(firstBody.outputUrls.frame.endsWith('/frames/idle_0.svg'));
    assert.ok(firstBody.outputUrls.spritesheet.endsWith('/spritesheet.svg'));
    assert.ok(Array.isArray(firstBody.qualityReports));

    const frame = await fetch(`${baseUrl}${firstBody.outputUrls.frame}`);
    assert.equal(frame.status, 200);
    assert.match(await frame.text(), /<svg/);

    const second = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: '像素风宝石道具',
        assetType: 'item',
        style: 'pixel',
        size: '32x32',
        backendId: 'codex-local',
      }),
    });
    assert.equal(second.status, 200);
    const secondBody = await second.json();
    assert.equal(secondBody.cacheStatus, 'hit');
    assert.equal(secondBody.cacheKey, firstBody.cacheKey);
  } finally {
    await close(server);
    await rm(workspace, { recursive: true, force: true });
  }
});

test('web server returns structured errors instead of crashing when backend is unavailable', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-web-'));
  const server = createWorkbenchServer({ workspace, uiRoot: resolve('ui'), defaultBackendId: 'codex-local' });

  try {
    const baseUrl = await listen(server);
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: '像素风骑士角色',
        assetType: 'character',
        style: 'pixel',
        size: '64x64',
        backendId: 'not-installed',
      }),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.status, 'failed');
    assert.match(body.error.message, /Backend not found/);
    assert.equal(body.fallbackBackendId, 'codex-local');
  } finally {
    await close(server);
    await rm(workspace, { recursive: true, force: true });
  }
});

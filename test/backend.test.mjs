import test from 'node:test';
import assert from 'node:assert/strict';

import { createPrebuiltBackend } from '../src/backends/prebuilt-backend.mjs';
import { createMockAiBackend } from '../src/backends/mock-ai-backend.mjs';
import { createCodexLocalBackend } from '../src/backends/codex-local-backend.mjs';
import { createApiBackendPlaceholder } from '../src/backends/api-backend-placeholder.mjs';
import { createGenerationPacket } from '../src/generation/generation-packet.mjs';

const request = {
  assetId: 'hero-idle',
  variantId: 'idle',
  parameters: {
    size: { width: 64, height: 64 },
    palette: 'blue',
    style: 'pixel',
    direction: 'front',
    seed: 'demo-seed',
    frameCount: 4,
    frameLabels: ['idle_0', 'idle_1', 'idle_2', 'idle_3'],
  },
};

const packet = createGenerationPacket({
  text: '生成一个像素风骑士角色',
  assetId: 'knight-idle',
  assetType: 'character',
  subject: 'knight',
  style: 'pixel',
  size: { width: 64, height: 64 },
  animation: 'idle',
  frameCount: 4,
  frameLabels: ['idle_0', 'idle_1', 'idle_2', 'idle_3'],
  direction: 'front',
  palette: 'blue',
  seed: 'demo-seed',
});

test('prebuilt backend returns ordered deterministic frame collection', async () => {
  const result = await createPrebuiltBackend().generate({ request });
  assert.equal(result.backendId, 'prebuilt');
  assert.equal(result.backendVersion, 'mvp-plus-1');
  assert.deepEqual(result.frames.map((frame) => frame.frameId), ['idle_0', 'idle_1', 'idle_2', 'idle_3']);
  assert.deepEqual(result.frames.map((frame) => frame.order), [0, 1, 2, 3]);
  assert.match(result.frames[0].content, /palette-blue/);
});

test('mock ai backend exposes distinct backend identity with same frame contract', async () => {
  const result = await createMockAiBackend().generate({ request });
  assert.equal(result.backendId, 'mock-ai');
  assert.equal(result.backendVersion, 'mvp-plus-1');
  assert.equal(result.frames.length, 4);
  assert.match(result.frames[0].content, /mock-ai/);
});

test('codex local backend consumes generation packet and returns frame contract', async () => {
  const result = await createCodexLocalBackend().generate({ request, packet });
  assert.equal(result.backendId, 'codex-local');
  assert.equal(result.backendVersion, 'mvp-api-ready-1');
  assert.equal(result.frames.length, 4);
  assert.match(result.frames[0].content, /codex-local/);
  assert.match(result.frames[0].content, /knight/);
});

test('api backend placeholder refuses real generation with clear configuration error', async () => {
  await assert.rejects(
    () => createApiBackendPlaceholder().generate({ request, packet }),
    /Real API backend is not configured. Use codex-local\/prebuilt\/mock-ai for MVP validation./,
  );
});

test('prebuilt mock-ai and codex-local share GenerateResult frame contract', async () => {
  const backends = [createPrebuiltBackend(), createMockAiBackend(), createCodexLocalBackend()];
  for (const backend of backends) {
    const result = await backend.generate({ request, packet });
    assert.equal(typeof result.backendId, 'string');
    assert.equal(typeof result.backendVersion, 'string');
    assert.equal(result.frames.length, 4);
    assert.deepEqual(Object.keys(result.frames[0]).sort(), ['content', 'fileName', 'frameId', 'mediaType', 'order']);
  }
});

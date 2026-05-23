import test from 'node:test';
import assert from 'node:assert/strict';

import { createPrebuiltBackend } from '../src/backends/prebuilt-backend.mjs';
import { createMockAiBackend } from '../src/backends/mock-ai-backend.mjs';

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

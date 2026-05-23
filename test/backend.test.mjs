import test from 'node:test';
import assert from 'node:assert/strict';

import { createPrebuiltBackend } from '../src/backends/prebuilt-backend.mjs';
import { createMockAiBackend } from '../src/backends/mock-ai-backend.mjs';
import { createCodexLocalBackend } from '../src/backends/codex-local-backend.mjs';
import { createApiBackendPlaceholder } from '../src/backends/api-backend-placeholder.mjs';
import { createImageApiBackend, loadImageApiConfig } from '../src/backends/image-api-backend.mjs';
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

test('image api config reads endpoint model and key from environment without hardcoding secrets', () => {
  const config = loadImageApiConfig({
    IMAGE_API_BASE_URL: 'https://api.vip1129.cc/',
    IMAGE_API_KEY: 'test-key',
    IMAGE_API_MODEL: 'image2',
  });

  assert.equal(config.baseUrl, 'https://api.vip1129.cc');
  assert.equal(config.apiKey, 'test-key');
  assert.equal(config.model, 'image2');
});

test('image api backend converts OpenAI-compatible b64 response into svg frame contract', async () => {
  const calls = [];
  const backend = createImageApiBackend({
    config: {
      baseUrl: 'https://api.example.test',
      apiKey: 'test-key',
      model: 'image2',
      requestSize: '1024x1024',
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        async json() {
          return { data: [{ b64_json: Buffer.from('fake-png').toString('base64') }] };
        },
      };
    },
  });

  const result = await backend.generate({ request, packet });

  assert.equal(result.backendId, 'image-api');
  assert.equal(result.backendVersion, 'image2');
  assert.equal(result.frames.length, 4);
  assert.match(result.frames[0].content, /data:image\/png;base64/);
  assert.equal(calls.length, 4);
  assert.equal(calls[0].url, 'https://api.example.test/v1/images/generations');
  assert.equal(JSON.parse(calls[0].options.body).model, 'image2');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
});

test('image api backend fails clearly when api key is missing', async () => {
  await assert.rejects(
    () => createImageApiBackend({
      config: { baseUrl: 'https://api.example.test', model: 'image2', requestSize: '1024x1024' },
      fetchImpl: async () => ({ ok: true, json: async () => ({ data: [] }) }),
    }).generate({ request, packet }),
    /IMAGE_API_KEY is required/,
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

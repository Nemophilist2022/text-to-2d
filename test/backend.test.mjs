import test from 'node:test';
import assert from 'node:assert/strict';

import { createPrebuiltBackend } from '../src/backends/prebuilt-backend.mjs';
import { createMockAiBackend } from '../src/backends/mock-ai-backend.mjs';
import { createCodexLocalBackend } from '../src/backends/codex-local-backend.mjs';
import { createApiBackendPlaceholder } from '../src/backends/api-backend-placeholder.mjs';
import { createChatSvgBackend, loadChatSvgConfig } from '../src/backends/chat-svg-backend.mjs';
import { createImageApiBackend, loadImageApiConfig } from '../src/backends/image-api-backend.mjs';
import { createGenerationPacket } from '../src/generation/generation-packet.mjs';
import { compileAssetRecipe } from '../src/input/asset-recipe.mjs';
import { validateSvgQuality } from '../src/quality/svg-quality-gate.mjs';

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

test('chat svg config reads chat model from environment without hardcoding secrets', () => {
  const config = loadChatSvgConfig({
    CHAT_API_BASE_URL: 'https://api.vip1129.cc/',
    CHAT_API_KEY: 'test-key',
    CHAT_API_MODEL: 'gpt-5.5',
  });

  assert.equal(config.baseUrl, 'https://api.vip1129.cc');
  assert.equal(config.apiKey, 'test-key');
  assert.equal(config.model, 'gpt-5.5');
});

test('chat svg backend parses strict json frames from chat completions', async () => {
  const calls = [];
  const backend = createChatSvgBackend({
    config: {
      baseUrl: 'https://api.example.test',
      apiKey: 'test-key',
      model: 'gpt-5.5',
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  frames: packet.frameLabels.map((frameId) => ({
                    frameId,
                    svg: `<svg xmlns="http://www.w3.org/2000/svg"><rect data-frame="${frameId}"/></svg>`,
                  })),
                }),
              },
            }],
          };
        },
      };
    },
  });

  const result = await backend.generate({ request, packet });

  assert.equal(result.backendId, 'chat-svg');
  assert.equal(result.backendVersion, 'gpt-5.5');
  assert.equal(result.frames.length, 4);
  assert.match(result.frames[0].content, /data-frame="idle_0"/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.example.test/v1/chat/completions');
  assert.equal(JSON.parse(calls[0].options.body).model, 'gpt-5.5');
});

test('chat svg request body includes gem visual preset constraints', async () => {
  const gemPacket = createGenerationPacket(compileAssetRecipe({
    text: '\u751f\u6210\u4e00\u4e2a\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177',
    selections: { assetType: 'item', style: 'pixel', size: '32x32' },
  }));
  const calls = [];
  const backend = createChatSvgBackend({
    config: {
      baseUrl: 'https://api.example.test',
      apiKey: 'test-key',
      model: 'gpt-5.5',
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  frames: [{
                    frameId: 'idle_0',
                    svg: '<svg width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges"><polygon points="16,2 28,14 16,30 4,14" fill="#55aaff"/><path d="M16 2 L22 14 L16 30 L10 14 Z" fill="#2277cc"/><polygon points="10,8 14,6 13,10" fill="#fff"/></svg>',
                  }],
                }),
              },
            }],
          };
        },
      };
    },
  });

  await backend.generate({ request, packet: gemPacket });

  const body = JSON.parse(calls[0].options.body);
  const serializedMessages = JSON.stringify(body.messages);
  assert.match(serializedMessages, /faceted_crystal/);
  assert.match(serializedMessages, /diamond or hexagonal crystal outline/);
  assert.match(serializedMessages, /angular polygon facets/);
  assert.match(serializedMessages, /No lantern/);
  assert.match(serializedMessages, /shape-rendering=.*crispEdges/);
});

test('gem svg quality gate rejects lantern-like black background output', () => {
  const gemPacket = createGenerationPacket(compileAssetRecipe({
    text: '\u751f\u6210\u4e00\u4e2a\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177',
    selections: { assetType: 'item', style: 'pixel', size: '32x32' },
  }));

  assert.throws(
    () => validateSvgQuality({
      svg: '<svg width="32" height="32"><rect width="32" height="32" fill="#000"/><text>lantern handle base</text><rect x="8" y="4" width="16" height="24" fill="#ffaa00"/></svg>',
      packet: gemPacket,
      frameId: 'idle_0',
    }),
    /quality gate failed/,
  );
});

test('gem svg quality gate accepts transparent faceted polygon output', () => {
  const gemPacket = createGenerationPacket(compileAssetRecipe({
    text: '\u751f\u6210\u4e00\u4e2a\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177',
    selections: { assetType: 'item', style: 'pixel', size: '32x32' },
  }));

  assert.doesNotThrow(() => validateSvgQuality({
    svg: '<svg width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges"><polygon points="16,2 28,14 16,30 4,14" fill="#55aaff"/><path d="M16 2 L22 14 L16 30 L10 14 Z" fill="#2277cc"/><polygon points="10,8 14,6 13,10" fill="#fff"/></svg>',
    packet: gemPacket,
    frameId: 'idle_0',
  }));
});

test('chat svg backend fails clearly when api key is missing', async () => {
  await assert.rejects(
    () => createChatSvgBackend({
      config: { baseUrl: 'https://api.example.test', model: 'gpt-5.5' },
      fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [] }) }),
    }).generate({ request, packet }),
    /CHAT_API_KEY or IMAGE_API_KEY is required/,
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

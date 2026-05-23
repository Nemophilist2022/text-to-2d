import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runAssetJob } from '../src/core/orchestrator.mjs';
import { createPrebuiltBackend } from '../src/backends/prebuilt-backend.mjs';
import { createMockAiBackend } from '../src/backends/mock-ai-backend.mjs';
import { createCodexLocalBackend } from '../src/backends/codex-local-backend.mjs';
import { buildAssetRequestFromRecipe, compileAssetRecipe } from '../src/input/asset-recipe.mjs';

const request = {
  assetId: 'hero-idle',
  assetType: 'character',
  variantId: 'idle',
  backendId: 'prebuilt',
  parameters: {
    style: 'pixel',
    size: { width: 64, height: 64 },
    direction: 'front',
    palette: 'blue',
    seed: 'demo-seed',
    frameCount: 4,
    frameLabels: ['idle_0', 'idle_1', 'idle_2', 'idle_3'],
  },
  postprocessSpec: {
    version: 'mvp-plus-1',
    trimTransparent: false,
    normalizeFrameSize: true,
    pivot: { x: 0.5, y: 1 },
  },
  exportSpec: { version: 'mvp-plus-1', formats: ['frames', 'spritesheet', 'atlas-json'] },
  forceRegenerate: false,
};

test('first run produces multi-frame exports and observable cache miss state', async () => {
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
    assert.equal(result.events.includes('postprocess.frames'), true);
    assert.equal(result.events.includes('export.write'), true);
    assert.equal(result.exportRefs.frames.length, 4);

    await stat(join(workspace, 'exports', 'hero-idle', 'frames', 'idle_0.svg'));
    await stat(join(workspace, 'exports', 'hero-idle', 'spritesheet.svg'));
    await stat(join(workspace, 'exports', 'hero-idle', 'atlas.json'));
    await stat(join(workspace, 'exports', 'hero-idle', 'run.json'));
    await stat(join(workspace, 'cache', 'exports', result.cacheKey, 'spritesheet.svg'));

    const exported = await readFile(join(workspace, 'exports', 'hero-idle', 'frames', 'idle_0.svg'), 'utf8');
    assert.match(exported, /data-postprocessed="true"/);

    const metadata = JSON.parse(await readFile(result.metadataRef, 'utf8'));
    assert.equal(metadata.assetId, 'hero-idle');
    assert.equal(metadata.cacheStatus, 'miss');
    assert.equal(metadata.outputFiles.frames.length, 4);
    assert.equal(metadata.events.includes('export.write'), true);

    const atlas = JSON.parse(await readFile(join(workspace, 'exports', 'hero-idle', 'atlas.json'), 'utf8'));
    assert.deepEqual(atlas.frameSize, { width: 64, height: 64 });
    assert.deepEqual(atlas.sheetSize, { width: 256, height: 64 });
    assert.deepEqual(atlas.frames.map((frame) => frame.x), [0, 64, 128, 192]);
    assert.equal(atlas.frames[0].id, 'idle_0');

    const processedManifest = JSON.parse(await readFile(join(workspace, 'cache', 'processed', result.cacheKey, 'frames.json'), 'utf8'));
    assert.equal(processedManifest.frames.length, 4);
    assert.deepEqual(processedManifest.frames[0].bounds, { x: 0, y: 0, w: 64, h: 64 });
    assert.deepEqual(processedManifest.frames[0].pivot, { x: 0.5, y: 1 });
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

test('strong parameter and backend changes produce different cache keys', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const options = {
      workspace,
      backends: {
        prebuilt: createPrebuiltBackend(),
        'mock-ai': createMockAiBackend(),
      },
    };
    const first = await runAssetJob(request, options);
    const paletteChanged = await runAssetJob({
      ...request,
      parameters: { ...request.parameters, palette: 'red' },
    }, options);
    const backendChanged = await runAssetJob({ ...request, backendId: 'mock-ai' }, options);
    const postprocessChanged = await runAssetJob({
      ...request,
      postprocessSpec: { ...request.postprocessSpec, version: 'mvp-plus-2' },
    }, options);

    assert.equal(first.cacheStatus, 'miss');
    assert.equal(paletteChanged.cacheStatus, 'miss');
    assert.equal(backendChanged.cacheStatus, 'miss');
    assert.equal(postprocessChanged.cacheStatus, 'miss');
    assert.notEqual(paletteChanged.cacheKey, first.cacheKey);
    assert.notEqual(backendChanged.cacheKey, first.cacheKey);
    assert.notEqual(postprocessChanged.cacheKey, first.cacheKey);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('forceRegenerate bypasses cache', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const options = { workspace, backends: { prebuilt: createPrebuiltBackend() } };
    await runAssetJob(request, options);
    const regenerated = await runAssetJob({ ...request, forceRegenerate: true }, options);
    assert.equal(regenerated.cacheStatus, 'bypassed');
    assert.equal(regenerated.events.includes('cache.bypassed'), true);
    assert.equal(regenerated.events.includes('backend.generate'), true);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('codex-local request created from text input hits cache on second run', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const recipe = compileAssetRecipe({
      text: '生成一个像素风骑士角色',
      selections: { assetType: 'character', style: 'pixel', size: '64x64' },
    });
    const textRequest = buildAssetRequestFromRecipe(recipe, { backendId: 'codex-local' });
    const options = { workspace, backends: { 'codex-local': createCodexLocalBackend() } };

    const first = await runAssetJob(textRequest, options);
    const second = await runAssetJob(textRequest, options);

    assert.equal(first.cacheStatus, 'miss');
    assert.equal(second.cacheStatus, 'hit');
    assert.equal(first.exportRefs.frames.length, 4);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('changing text subject style size or backend changes cache identity', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const options = {
      workspace,
      backends: {
        'codex-local': createCodexLocalBackend(),
        'mock-ai': createMockAiBackend(),
      },
    };
    const knightRecipe = compileAssetRecipe({
      text: '生成一个像素风骑士角色',
      selections: { assetType: 'character', style: 'pixel', size: '64x64' },
    });
    const slimeRecipe = compileAssetRecipe({
      text: '生成一个像素风史莱姆怪物',
      selections: { assetType: 'monster', style: 'pixel', size: '64x64' },
    });
    const darkRecipe = compileAssetRecipe({
      text: '生成一个像素风骑士角色',
      selections: { assetType: 'character', style: 'dark', size: '64x64' },
    });
    const smallRecipe = compileAssetRecipe({
      text: '生成一个像素风骑士角色',
      selections: { assetType: 'character', style: 'pixel', size: '32x32' },
    });

    const first = await runAssetJob(buildAssetRequestFromRecipe(knightRecipe, { backendId: 'codex-local' }), options);
    const textChanged = await runAssetJob(buildAssetRequestFromRecipe(slimeRecipe, { backendId: 'codex-local' }), options);
    const styleChanged = await runAssetJob(buildAssetRequestFromRecipe(darkRecipe, { backendId: 'codex-local' }), options);
    const sizeChanged = await runAssetJob(buildAssetRequestFromRecipe(smallRecipe, { backendId: 'codex-local' }), options);
    const backendChanged = await runAssetJob(buildAssetRequestFromRecipe(knightRecipe, { backendId: 'mock-ai' }), options);

    assert.notEqual(textChanged.cacheKey, first.cacheKey);
    assert.notEqual(styleChanged.cacheKey, first.cacheKey);
    assert.notEqual(sizeChanged.cacheKey, first.cacheKey);
    assert.notEqual(backendChanged.cacheKey, first.cacheKey);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('preset prompt compiler and quality gate versions participate in cache identity', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const options = { workspace, backends: { 'codex-local': createCodexLocalBackend() } };
    const recipe = compileAssetRecipe({
      text: '\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177',
      selections: { assetType: 'item', style: 'pixel', size: '32x32' },
    });
    const baseRequest = buildAssetRequestFromRecipe(recipe, { backendId: 'codex-local' });
    const presetChanged = {
      ...baseRequest,
      parameters: { ...baseRequest.parameters, presetId: 'generic_item' },
    };
    const promptCompilerChanged = {
      ...baseRequest,
      generationPacket: { ...baseRequest.generationPacket, promptCompilerVersion: 'prompt-compiler-test' },
    };
    const qualityGateChanged = {
      ...baseRequest,
      generationPacket: { ...baseRequest.generationPacket, qualityGateVersion: 'quality-gate-test' },
    };

    const first = await runAssetJob(baseRequest, options);
    const preset = await runAssetJob(presetChanged, options);
    const prompt = await runAssetJob(promptCompilerChanged, options);
    const quality = await runAssetJob(qualityGateChanged, options);

    assert.notEqual(preset.cacheKey, first.cacheKey);
    assert.notEqual(prompt.cacheKey, first.cacheKey);
    assert.notEqual(quality.cacheKey, first.cacheKey);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('run metadata preserves backend quality reports through processed cache', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-mvp-'));
  try {
    const qualityBackend = {
      backendId: 'quality-backend',
      version: 'test-1',
      async generate(input) {
        const frameId = input.packet.frameLabels[0];
        return {
          backendId: 'quality-backend',
          backendVersion: 'test-1',
          frames: [{
            frameId,
            order: 0,
            fileName: `${frameId}.svg`,
            mediaType: 'image/svg+xml',
            content: '<svg width="32" height="32" viewBox="0 0 32 32"><path d="M0 0H1V1Z"/></svg>',
          }],
          metadata: {
            qualityReports: [{ frameId, passed: true, errors: [], warnings: ['weak silhouette'], checks: [] }],
          },
        };
      },
    };
    const recipe = compileAssetRecipe({
      text: '\u7ea2\u5fc3 UI \u56fe\u6807',
      selections: { assetType: 'ui-icon', style: 'pixel', size: '32x32' },
    });
    const request = buildAssetRequestFromRecipe(recipe, { backendId: 'quality-backend' });

    const first = await runAssetJob(request, { workspace, backends: { 'quality-backend': qualityBackend } });
    const second = await runAssetJob(request, { workspace, backends: { 'quality-backend': qualityBackend } });

    const firstRun = JSON.parse(await readFile(first.metadataRef, 'utf8'));
    const secondRun = JSON.parse(await readFile(second.metadataRef, 'utf8'));
    assert.deepEqual(firstRun.qualityReports[0].warnings, ['weak silhouette']);
    assert.deepEqual(secondRun.qualityReports[0].warnings, ['weak silhouette']);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

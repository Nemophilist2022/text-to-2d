import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAssetRequestFromRecipe, compileAssetRecipe } from '../src/input/asset-recipe.mjs';
import { createGenerationPacket } from '../src/generation/generation-packet.mjs';
import { compilePrompt, PROMPT_COMPILER_VERSION } from '../src/generation/prompt-compiler.mjs';
import { visualPresets } from '../src/visual/visual-presets.mjs';

test('text input compiles into a stable asset recipe', () => {
  const recipe = compileAssetRecipe({
    text: '生成一个像素风骑士角色',
    selections: {
      assetType: 'character',
      style: 'pixel',
      size: '64x64',
    },
  });

  assert.equal(recipe.subject, 'knight');
  assert.equal(recipe.assetType, 'character');
  assert.equal(recipe.style, 'pixel');
  assert.deepEqual(recipe.size, { width: 64, height: 64 });
  assert.equal(recipe.frameCount, 4);
  assert.deepEqual(recipe.frameLabels, ['idle_0', 'idle_1', 'idle_2', 'idle_3']);
});

test('explicit selections override text-derived defaults', () => {
  const recipe = compileAssetRecipe({
    text: '生成一个像素风骑士角色',
    selections: {
      assetType: 'item',
      style: 'dark',
      size: '32x32',
    },
  });

  assert.equal(recipe.assetType, 'item');
  assert.equal(recipe.style, 'dark');
  assert.deepEqual(recipe.size, { width: 32, height: 32 });
  assert.equal(recipe.frameCount, 1);
  assert.deepEqual(recipe.frameLabels, ['idle_0']);
});

test('asset recipe creates an api-ready generation packet', () => {
  const recipe = compileAssetRecipe({
    text: '生成一个像素风骑士角色',
    selections: { assetType: 'character', style: 'pixel', size: '64x64' },
  });
  const packet = createGenerationPacket(recipe);

  assert.equal(packet.assetType, 'character');
  assert.equal(packet.subject, 'knight');
  assert.equal(packet.style, 'pixel');
  assert.match(packet.prompt, /pixel/);
  assert.match(packet.prompt, /knight/);
  assert.equal(packet.outputContract.frameCount, 4);
  assert.equal(packet.outputContract.mediaType, 'image/svg+xml');
});

test('recipe can build a codex-local asset request without handwritten JS request', () => {
  const recipe = compileAssetRecipe({
    text: '生成一个像素风骑士角色',
    selections: { assetType: 'character', style: 'pixel', size: '64x64' },
  });
  const request = buildAssetRequestFromRecipe(recipe, { backendId: 'codex-local' });

  assert.equal(request.backendId, 'codex-local');
  assert.equal(request.assetId, 'knight-idle');
  assert.equal(request.parameters.subject, 'knight');
  assert.equal(request.generationPacket.subject, 'knight');
});

test('gem text compiles into faceted crystal visual preset recipe', () => {
  const recipe = compileAssetRecipe({
    text: '\u751f\u6210\u4e00\u4e2a\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177',
    selections: { assetType: 'item', style: 'pixel', size: '32x32' },
  });

  assert.equal(recipe.assetType, 'item');
  assert.equal(recipe.subject, 'gem');
  assert.equal(recipe.visualArchetype, 'faceted_crystal');
  assert.equal(recipe.assetId, 'gem-idle');
  assert.equal(recipe.frameCount, 1);
  assert.deepEqual(recipe.frameLabels, ['idle_0']);
  assert.ok(recipe.requiredDetails.includes('angular polygon facets'));
  assert.ok(recipe.forbidden.includes('lantern'));
});

test('gem generation packet carries strong faceted crystal prompt constraints', () => {
  const recipe = compileAssetRecipe({
    text: '\u751f\u6210\u4e00\u4e2a\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177',
    selections: { assetType: 'item', style: 'pixel', size: '32x32' },
  });
  const packet = createGenerationPacket(recipe);

  assert.match(packet.prompt, /faceted crystal gem/);
  assert.match(packet.prompt, /diamond or hexagonal/);
  assert.match(packet.prompt, /angular polygon facets/);
  assert.match(packet.prompt, /upper-left white highlight/);
  assert.match(packet.negativePrompt, /lantern/);
  assert.match(packet.negativePrompt, /lamp/);
  assert.match(packet.negativePrompt, /handle/);
  assert.match(packet.negativePrompt, /base/);
  assert.match(packet.negativePrompt, /black background block/);
});

test('text input maps five asset classes to visual preset ids', () => {
  const cases = [
    ['\u50cf\u7d20\u98ce\u9a91\u58eb\u89d2\u8272', { assetType: 'character', style: 'pixel', size: '64x64' }, 'knight_character'],
    ['\u50cf\u7d20\u98ce\u53f2\u83b1\u59c6\u602a\u7269', { assetType: 'monster', style: 'pixel', size: '64x64' }, 'slime_monster'],
    ['\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177', { assetType: 'item', style: 'pixel', size: '32x32' }, 'gem_item'],
    ['\u8349\u5730\u5730\u56fe\u5757', { assetType: 'map-tile', style: 'pixel', size: '32x32' }, 'grass_tile'],
    ['\u7ea2\u5fc3 UI \u56fe\u6807', { assetType: 'ui-icon', style: 'pixel', size: '32x32' }, 'heart_ui_icon'],
  ];

  for (const [text, selections, presetId] of cases) {
    const recipe = compileAssetRecipe({ text, selections });
    assert.equal(recipe.concept.presetId, presetId);
    assert.equal(recipe.presetId, presetId);
    assert.equal(recipe.visualPreset.id, presetId);
  }
});

test('unknown subject falls back to generic preset for selected asset type', () => {
  const recipe = compileAssetRecipe({
    text: '\u4e00\u4e2a\u6ca1\u6709\u547d\u4e2d\u5177\u4f53\u9884\u8bbe\u7684\u9053\u5177',
    selections: { assetType: 'item', style: 'pixel', size: '32x32' },
  });

  assert.equal(recipe.concept.presetId, 'generic_item');
  assert.equal(recipe.subject, 'item');
});

test('prompt compiler builds sections without subject-specific special cases', () => {
  const recipe = compileAssetRecipe({
    text: '\u7ea2\u5fc3 UI \u56fe\u6807',
    selections: { assetType: 'ui-icon', style: 'pixel', size: '32x32' },
  });
  const outputContract = {
    mediaType: 'image/svg+xml',
    transparentBackground: true,
    frameCount: recipe.frameCount,
    frameLabels: recipe.frameLabels,
    frameSize: recipe.size,
  };

  const compiled = compilePrompt({ concept: recipe.concept, preset: recipe.visualPreset, outputContract });

  assert.match(compiled.prompt, /transparent background/);
  assert.match(compiled.prompt, /32x32/);
  assert.match(compiled.prompt, /shape-rendering="crispEdges"/);
  assert.match(compiled.prompt, /UI icon/);
  assert.match(compiled.prompt, /pixel art/);
  assert.equal(compiled.promptSections.length, 6);
  assert.match(compiled.negativePrompt, /photorealistic/);
  assert.match(compiled.negativePrompt, /text label/);
});

test('visual presets carry v2 composition palette readability and svg shape hints', () => {
  const requiredPresetIds = ['knight_character', 'slime_monster', 'gem_item', 'grass_tile', 'heart_ui_icon'];

  for (const presetId of requiredPresetIds) {
    const preset = visualPresets.find((candidate) => candidate.id === presetId);
    assert.ok(preset, `missing preset ${presetId}`);
    assert.ok(preset.composition.length > 0, `missing composition for ${presetId}`);
    assert.ok(preset.paletteHints.length > 0, `missing paletteHints for ${presetId}`);
    assert.ok(preset.readabilityRules.some((rule) => rule.includes('32x32')), `missing 32x32 readability for ${presetId}`);
    assert.ok(preset.svgShapeHints.length > 0, `missing svgShapeHints for ${presetId}`);
  }
});

test('prompt compiler v2 emits composition readability svg and negative sections', () => {
  const recipe = compileAssetRecipe({
    text: '\u50cf\u7d20\u98ce\u5b9d\u77f3\u9053\u5177',
    selections: { assetType: 'item', style: 'pixel', size: '32x32' },
  });
  const packet = createGenerationPacket(recipe);

  assert.equal(PROMPT_COMPILER_VERSION, 'prompt-compiler-2');
  assert.equal(packet.promptCompilerVersion, 'prompt-compiler-2');
  assert.deepEqual(packet.promptSections.map((section) => section.id), [
    'global-output',
    'asset-type',
    'style',
    'composition',
    'visual-preset',
    'negative-contract',
  ]);
  assert.match(packet.prompt, /No full-canvas background/);
  assert.match(packet.prompt, /centered object/);
  assert.match(packet.prompt, /SVG shape hints/);
  assert.match(packet.prompt, /readable at 32x32/);
});

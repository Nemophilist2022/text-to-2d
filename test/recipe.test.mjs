import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAssetRequestFromRecipe, compileAssetRecipe } from '../src/input/asset-recipe.mjs';
import { createGenerationPacket } from '../src/generation/generation-packet.mjs';

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

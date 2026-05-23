import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { runAssetJob } from '../core/orchestrator.mjs';
import { createPrebuiltBackend } from '../backends/prebuilt-backend.mjs';
import { createMockAiBackend } from '../backends/mock-ai-backend.mjs';
import { createCodexLocalBackend } from '../backends/codex-local-backend.mjs';
import { createImageApiBackend } from '../backends/image-api-backend.mjs';
import { buildAssetRequestFromRecipe, compileAssetRecipe } from '../input/asset-recipe.mjs';

const DEFAULT_TEXT = '生成一个像素风骑士角色';
const DEFAULT_SELECTIONS = { assetType: 'character', style: 'pixel', size: '64x64' };

export async function runDemo({
  workspace = cwd(),
  text = DEFAULT_TEXT,
  selections = DEFAULT_SELECTIONS,
  backendId = 'codex-local',
} = {}) {
  const recipe = compileAssetRecipe({ text, selections });
  const request = buildAssetRequestFromRecipe(recipe, { backendId });
  const options = {
    workspace,
    backends: {
      prebuilt: createPrebuiltBackend(),
      'mock-ai': createMockAiBackend(),
      'codex-local': createCodexLocalBackend(),
      'image-api': createImageApiBackend(),
    },
  };

  const first = await runAssetJob(request, options);
  const second = await runAssetJob(request, options);
  const backendChanged = await runAssetJob({ ...request, backendId: 'mock-ai' }, options);

  return { recipe, packet: request.generationPacket, first, second, backendChanged };
}

export function isDirectRun(importMetaUrl, argvPath) {
  if (!argvPath) return false;
  return fileURLToPath(importMetaUrl) === resolve(argvPath);
}

export function resolveCliOptions(argv) {
  const workspaceFlagIndex = argv.indexOf('--workspace');
  const textFlagIndex = argv.indexOf('--text');
  const styleFlagIndex = argv.indexOf('--style');
  const assetTypeFlagIndex = argv.indexOf('--asset-type');
  const sizeFlagIndex = argv.indexOf('--size');
  const backendFlagIndex = argv.indexOf('--backend');

  return {
    workspace: workspaceFlagIndex === -1 ? cwd() : argv[workspaceFlagIndex + 1],
    text: textFlagIndex === -1 ? DEFAULT_TEXT : argv[textFlagIndex + 1],
    backendId: backendFlagIndex === -1 ? 'codex-local' : argv[backendFlagIndex + 1],
    selections: {
      assetType: assetTypeFlagIndex === -1 ? DEFAULT_SELECTIONS.assetType : argv[assetTypeFlagIndex + 1],
      style: styleFlagIndex === -1 ? DEFAULT_SELECTIONS.style : argv[styleFlagIndex + 1],
      size: sizeFlagIndex === -1 ? DEFAULT_SELECTIONS.size : argv[sizeFlagIndex + 1],
    },
  };
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  const result = await runDemo(resolveCliOptions(process.argv));
  console.log(JSON.stringify({
    recipe: result.recipe,
    packet: result.packet,
    first: {
      status: result.first.status,
      cacheStatus: result.first.cacheStatus,
      exportRefs: result.first.exportRefs,
      metadataRef: result.first.metadataRef,
      events: result.first.events,
    },
    second: {
      status: result.second.status,
      cacheStatus: result.second.cacheStatus,
      exportRefs: result.second.exportRefs,
      metadataRef: result.second.metadataRef,
      events: result.second.events,
    },
    backendChanged: {
      status: result.backendChanged.status,
      cacheStatus: result.backendChanged.cacheStatus,
      exportRefs: result.backendChanged.exportRefs,
      metadataRef: result.backendChanged.metadataRef,
      events: result.backendChanged.events,
    },
  }, null, 2));
}

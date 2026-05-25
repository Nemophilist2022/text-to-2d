import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { runAssetJob } from '../core/orchestrator.mjs';
import { createBackendRegistry } from '../backends/registry.mjs';
import { createAssetRequestFromInput } from '../app/asset-job.mjs';

const DEFAULT_TEXT = '\u751f\u6210\u4e00\u4e2a\u50cf\u7d20\u98ce\u9a91\u58eb\u89d2\u8272';
const DEFAULT_SELECTIONS = { assetType: 'character', style: 'pixel', size: '64x64' };
const DEFAULT_BACKEND_ID = 'chat-svg';

export async function runDemo({
  workspace = cwd(),
  text = DEFAULT_TEXT,
  selections = DEFAULT_SELECTIONS,
  backendId = DEFAULT_BACKEND_ID,
  skipBackendCompare = false,
} = {}) {
  const { recipe, request } = createAssetRequestFromInput({
    text,
    assetType: selections.assetType,
    style: selections.style,
    size: selections.size,
    backendId,
  });
  const options = { workspace, backends: createBackendRegistry() };

  const first = await runAssetJob(request, options);
  const second = await runAssetJob(request, options);
  const backendChanged = skipBackendCompare ? null : await runAssetJob({ ...request, backendId: 'mock-ai' }, options);

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
  const skipBackendCompare = argv.includes('--skip-backend-compare');

  return {
    workspace: workspaceFlagIndex === -1 ? cwd() : argv[workspaceFlagIndex + 1],
    text: textFlagIndex === -1 ? DEFAULT_TEXT : argv[textFlagIndex + 1],
    backendId: backendFlagIndex === -1 ? DEFAULT_BACKEND_ID : argv[backendFlagIndex + 1],
    skipBackendCompare,
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
    backendChanged: result.backendChanged && {
      status: result.backendChanged.status,
      cacheStatus: result.backendChanged.cacheStatus,
      exportRefs: result.backendChanged.exportRefs,
      metadataRef: result.backendChanged.metadataRef,
      events: result.backendChanged.events,
    },
  }, null, 2));
}

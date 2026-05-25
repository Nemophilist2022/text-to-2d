import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';

import { runAssetJob } from '../core/orchestrator.mjs';
import { buildAssetRequestFromRecipe, compileAssetRecipe } from '../input/asset-recipe.mjs';

export function createAssetRequestFromInput({ text = '', assetType = 'auto', style = 'pixel', size = '64x64', backendId }) {
  const recipe = compileAssetRecipe({
    text,
    selections: { assetType: assetType === 'auto' ? undefined : assetType, style, size },
  });
  const request = buildAssetRequestFromRecipe(recipe, { backendId });
  return { recipe, request };
}

export async function runAssetGeneration({ body, workspace, backends, defaultBackendId }) {
  const backendId = String(body.backendId || defaultBackendId);
  if (!backends[backendId]) {
    return {
      status: 'failed',
      httpStatus: 400,
      error: { message: `Backend not found: ${backendId}` },
      fallbackBackendId: defaultBackendId,
    };
  }

  const { recipe, request } = createAssetRequestFromInput({
    text: body.text || '',
    assetType: body.assetType || 'auto',
    style: body.style || 'pixel',
    size: body.size || '64x64',
    backendId,
  });

  const result = await runAssetJob({
    ...request,
    forceRegenerate: Boolean(body.forceRegenerate),
  }, { workspace, backends });

  if (result.status !== 'success') {
    return {
      status: 'failed',
      httpStatus: 400,
      error: result.errors?.[0] ?? { message: 'Generation failed' },
      fallbackBackendId: defaultBackendId,
    };
  }

  const runMetadata = JSON.parse(await readFile(result.metadataRef, 'utf8'));
  return {
    status: 'success',
    httpStatus: 200,
    assetId: request.assetId,
    assetType: request.assetType,
    cacheStatus: result.cacheStatus,
    cacheKey: result.cacheKey,
    backendId: result.backendId,
    recipe,
    generationPacket: request.generationPacket,
    qualityReports: runMetadata.qualityReports ?? [],
    outputRefs: result.exportRefs,
    outputUrls: buildOutputUrls(workspace, result.exportRefs),
    events: result.events,
  };
}

export function buildOutputUrls(workspace, refs) {
  const frames = refs.frames.map((filePath) => toOutputUrl(workspace, filePath));
  return {
    frames,
    frame: frames[0] ?? null,
    spritesheet: toOutputUrl(workspace, refs.spritesheet),
    atlas: toOutputUrl(workspace, refs.atlas),
    run: toOutputUrl(workspace, refs.run),
  };
}

function toOutputUrl(workspace, filePath) {
  const relativePath = relative(workspace, filePath);
  return `/outputs/${relativePath.split(sep).map(encodeURIComponent).join('/')}`;
}

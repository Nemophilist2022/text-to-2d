import { createHash } from 'node:crypto';

export function createCacheKey(request, backend) {
  const keyParts = {
    assetId: request.assetId,
    assetType: request.assetType,
    variantId: request.variantId,
    normalizedAssetParameters: normalize(strongParameters(request.parameters)),
    backendId: request.backendId,
    backendVersion: backend.version ?? backend.backendVersion ?? 'unknown',
    postprocessVersion: request.postprocessSpec?.version ?? 'none',
    exportVersion: request.exportSpec?.version ?? 'none',
  };

  return createHash('sha256')
    .update(JSON.stringify(keyParts))
    .digest('hex')
    .slice(0, 16);
}

function strongParameters(parameters = {}) {
  return {
    subject: parameters.subject,
    visualArchetype: parameters.visualArchetype,
    requiredDetails: parameters.requiredDetails,
    forbidden: parameters.forbidden,
    sourceText: parameters.sourceText,
    style: parameters.style,
    size: parameters.size,
    direction: parameters.direction,
    palette: parameters.palette,
    seed: parameters.seed,
    frameCount: parameters.frameCount,
    frameLabels: parameters.frameLabels,
  };
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, normalize(nested)]),
    );
  }
  return value;
}

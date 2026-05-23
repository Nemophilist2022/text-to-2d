import { createHash } from 'node:crypto';

export function createGenerationPacket(recipe) {
  const frameLabels = recipe.frameLabels ?? Array.from({ length: recipe.frameCount }, (_, index) => `${recipe.animation ?? 'idle'}_${index}`);
  const requestId = createHash('sha256')
    .update(JSON.stringify({
      text: recipe.text,
      assetType: recipe.assetType,
      subject: recipe.subject,
      visualArchetype: recipe.visualArchetype,
      silhouette: recipe.silhouette,
      requiredDetails: recipe.requiredDetails,
      forbidden: recipe.forbidden,
      style: recipe.style,
      size: recipe.size,
      frameCount: recipe.frameCount,
      frameLabels,
      seed: recipe.seed,
    }))
    .digest('hex')
    .slice(0, 16);

  return {
    requestId,
    assetId: recipe.assetId ?? `${recipe.subject}-${recipe.animation ?? 'idle'}`,
    assetType: recipe.assetType,
    subject: recipe.subject,
    visualPreset: recipe.visualPreset?.subject ?? recipe.subject,
    visualArchetype: recipe.visualArchetype,
    silhouette: recipe.silhouette ?? [],
    requiredDetails: recipe.requiredDetails ?? [],
    forbidden: recipe.forbidden ?? [],
    style: recipe.style,
    size: recipe.size,
    frameCount: recipe.frameCount,
    frameLabels,
    prompt: buildPrompt(recipe),
    negativePrompt: buildNegativePrompt(recipe),
    outputContract: {
      mediaType: 'image/svg+xml',
      transparentBackground: true,
      frameCount: recipe.frameCount,
      frameLabels,
      frameSize: recipe.size,
      layout: 'horizontal-spritesheet',
    },
  };
}

function buildPrompt(recipe) {
  if (recipe.subject === 'gem' || recipe.visualArchetype === 'faceted_crystal') {
    return [
      `Generate a ${recipe.size.width}x${recipe.size.height} ${recipe.style}-art game item: faceted crystal gem.`,
      'Transparent background.',
      'Strong diamond or hexagonal crystal silhouette.',
      'Use angular polygon facets.',
      'upper-left white highlight.',
      'lower-right darker facet.',
      'No lantern, no lamp, no handle, no base, no black background blocks, no rectangular container.',
      `Readable at ${recipe.size.width}x${recipe.size.height}.`,
    ].join(' ');
  }

  return [
    recipe.style,
    recipe.assetType,
    recipe.subject,
    recipe.direction ?? 'front',
    `${recipe.size.width}x${recipe.size.height}`,
    `${recipe.frameCount} frame animation`,
  ].join(', ');
}

function buildNegativePrompt(recipe) {
  return [
    'blur',
    'low contrast',
    'cropped',
    'inconsistent frames',
    ...(recipe.forbidden ?? []),
  ].join(', ');
}

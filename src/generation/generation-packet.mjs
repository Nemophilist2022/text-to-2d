import { createHash } from 'node:crypto';

export function createGenerationPacket(recipe) {
  const frameLabels = recipe.frameLabels ?? Array.from({ length: recipe.frameCount }, (_, index) => `${recipe.animation ?? 'idle'}_${index}`);
  const requestId = createHash('sha256')
    .update(JSON.stringify({
      text: recipe.text,
      assetType: recipe.assetType,
      subject: recipe.subject,
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
    style: recipe.style,
    size: recipe.size,
    frameCount: recipe.frameCount,
    frameLabels,
    prompt: buildPrompt(recipe),
    negativePrompt: 'blur, low contrast, cropped, inconsistent frames',
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
  return [
    recipe.style,
    recipe.assetType,
    recipe.subject,
    recipe.direction ?? 'front',
    `${recipe.size.width}x${recipe.size.height}`,
    `${recipe.frameCount} frame animation`,
  ].join(', ');
}

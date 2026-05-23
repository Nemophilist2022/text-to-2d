import { createGenerationPacket } from '../generation/generation-packet.mjs';
import { compileAssetConcept, defaultPivot } from './asset-concept.mjs';
import { getVisualPreset } from '../visual/visual-presets.mjs';

export function compileAssetRecipe({ text, selections = {} }) {
  const concept = compileAssetConcept({ text, selections });
  const visualPreset = getVisualPreset(concept.presetId);

  return {
    text,
    concept,
    assetId: `${concept.subject}-${concept.animation}`,
    assetType: concept.assetType,
    subject: concept.subject,
    presetId: concept.presetId,
    visualPreset,
    visualArchetype: concept.visualArchetype,
    silhouette: visualPreset?.silhouette ?? [],
    requiredDetails: visualPreset?.requiredDetails ?? [],
    forbidden: visualPreset?.forbidden ?? [],
    requiredSvgFeatures: visualPreset?.requiredSvgFeatures ?? [],
    style: concept.style,
    size: concept.size,
    animation: concept.animation,
    frameCount: concept.frameCount,
    frameLabels: concept.frameLabels,
    direction: concept.direction,
    palette: concept.palette,
    seed: concept.seed,
  };
}

export function buildAssetRequestFromRecipe(recipe, { backendId = 'codex-local' } = {}) {
  const generationPacket = createGenerationPacket(recipe);
  return {
    assetId: recipe.assetId,
    assetType: recipe.assetType,
    variantId: recipe.animation,
    backendId,
    recipe,
    generationPacket,
    parameters: {
      subject: recipe.subject,
      presetId: recipe.presetId,
      visualArchetype: recipe.visualArchetype,
      requiredDetails: recipe.requiredDetails,
      forbidden: recipe.forbidden,
      sourceText: recipe.text,
      style: recipe.style,
      size: recipe.size,
      direction: recipe.direction,
      palette: recipe.palette,
      seed: recipe.seed,
      frameCount: recipe.frameCount,
      frameLabels: recipe.frameLabels,
    },
    postprocessSpec: {
      version: 'mvp-api-ready-1',
      trimTransparent: false,
      normalizeFrameSize: true,
      pivot: defaultPivot(recipe.assetType),
    },
    exportSpec: { version: 'mvp-api-ready-1', formats: ['frames', 'spritesheet', 'atlas-json'] },
    forceRegenerate: false,
  };
}

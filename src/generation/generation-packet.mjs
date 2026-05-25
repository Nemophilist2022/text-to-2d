import { createHash } from 'node:crypto';
import { compilePrompt, PROMPT_COMPILER_VERSION } from './prompt-compiler.mjs';
import { QUALITY_GATE_VERSION } from '../quality/svg-quality-gate.mjs';

export function createGenerationPacket(recipe) {
  const frameLabels = recipe.frameLabels ?? Array.from({ length: recipe.frameCount }, (_, index) => `${recipe.animation ?? 'idle'}_${index}`);
  const concept = recipe.concept ?? {
    assetType: recipe.assetType,
    subject: recipe.subject,
    visualArchetype: recipe.visualArchetype ?? recipe.subject,
    presetId: recipe.presetId ?? recipe.visualPreset?.id ?? recipe.visualPreset?.subject ?? recipe.subject,
    style: recipe.style,
    size: recipe.size,
    animation: recipe.animation ?? 'idle',
    frameCount: recipe.frameCount,
    frameLabels,
    direction: recipe.direction ?? 'front',
  };
  const preset = recipe.visualPreset ?? {
    id: concept.presetId,
    silhouette: recipe.silhouette ?? [],
    requiredDetails: recipe.requiredDetails ?? [],
    forbidden: recipe.forbidden ?? [],
    requiredSvgFeatures: recipe.requiredSvgFeatures ?? [],
  };
  const outputContract = {
    mediaType: 'image/svg+xml',
    transparentBackground: true,
    frameCount: recipe.frameCount,
    frameLabels,
    frameSize: recipe.size,
    layout: 'horizontal-spritesheet',
  };
  const compiledPrompt = compilePrompt({ concept, preset, outputContract });
  const qualityContract = {
    version: QUALITY_GATE_VERSION,
    requiredSvgFeatures: preset.requiredSvgFeatures ?? [],
    forbidden: preset.forbidden ?? [],
  };
  const requestId = createHash('sha256')
    .update(JSON.stringify({
      text: recipe.text,
      concept,
      style: recipe.style,
      size: recipe.size,
      frameCount: recipe.frameCount,
      frameLabels,
      seed: recipe.seed,
      promptCompilerVersion: PROMPT_COMPILER_VERSION,
      qualityGateVersion: QUALITY_GATE_VERSION,
    }))
    .digest('hex')
    .slice(0, 16);

  return {
    requestId,
    sourceText: recipe.text,
    assetId: recipe.assetId ?? `${recipe.subject}-${recipe.animation ?? 'idle'}`,
    assetType: recipe.assetType,
    subject: recipe.subject,
    presetId: concept.presetId,
    concept,
    visualPreset: concept.presetId,
    visualArchetype: recipe.visualArchetype,
    silhouette: recipe.silhouette ?? [],
    requiredDetails: recipe.requiredDetails ?? [],
    forbidden: recipe.forbidden ?? [],
    requiredSvgFeatures: preset.requiredSvgFeatures ?? [],
    style: recipe.style,
    size: recipe.size,
    frameCount: recipe.frameCount,
    frameLabels,
    prompt: compiledPrompt.prompt,
    negativePrompt: compiledPrompt.negativePrompt,
    promptSections: compiledPrompt.promptSections,
    promptCompilerVersion: PROMPT_COMPILER_VERSION,
    qualityGateVersion: QUALITY_GATE_VERSION,
    qualityContract,
    outputContract,
  };
}

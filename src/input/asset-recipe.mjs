import { createGenerationPacket } from '../generation/generation-packet.mjs';

export function compileAssetRecipe({ text, selections = {} }) {
  const assetType = selections.assetType ?? inferAssetType(text);
  const style = selections.style ?? inferStyle(text);
  const size = parseSize(selections.size ?? '64x64');
  const subject = inferSubject(text, assetType);
  const animation = selections.animation ?? 'idle';
  const frameCount = selections.frameCount ?? defaultFrameCount(assetType);
  const frameLabels = Array.from({ length: frameCount }, (_, index) => `${animation}_${index}`);

  return {
    text,
    assetId: `${subject}-${animation}`,
    assetType,
    subject,
    style,
    size,
    animation,
    frameCount,
    frameLabels,
    direction: selections.direction ?? 'front',
    palette: selections.palette ?? defaultPalette(style),
    seed: selections.seed ?? stableSeed(text, assetType, style, size),
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

function inferAssetType(text) {
  if (text?.includes('怪物') || text?.toLowerCase().includes('monster')) return 'monster';
  if (text?.includes('道具') || text?.toLowerCase().includes('item')) return 'item';
  if (text?.includes('地图') || text?.toLowerCase().includes('tile')) return 'map-tile';
  if (text?.includes('图标') || text?.toLowerCase().includes('icon')) return 'ui-icon';
  return 'character';
}

function inferStyle(text) {
  if (text?.includes('暗黑')) return 'dark';
  if (text?.includes('国风')) return 'chinese';
  if (text?.includes('科幻')) return 'sci-fi';
  if (text?.includes('Q版') || text?.toLowerCase().includes('chibi')) return 'chibi';
  return 'pixel';
}

function inferSubject(text, assetType) {
  const lower = text?.toLowerCase() ?? '';
  if (text?.includes('骑士') || lower.includes('knight')) return 'knight';
  if (text?.includes('史莱姆') || lower.includes('slime')) return 'slime';
  if (text?.includes('能量核心') || lower.includes('core')) return 'energy-core';
  if (assetType === 'monster') return 'monster';
  if (assetType === 'item') return 'item';
  return 'hero';
}

function parseSize(size) {
  if (typeof size === 'object') return size;
  const match = String(size).match(/^(\d+)[x×](\d+)$/i);
  if (!match) return { width: 64, height: 64 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

function defaultFrameCount(assetType) {
  return assetType === 'character' || assetType === 'monster' ? 4 : 1;
}

function defaultPalette(style) {
  if (style === 'dark') return 'red';
  if (style === 'sci-fi') return 'green';
  return 'blue';
}

function defaultPivot(assetType) {
  if (assetType === 'map-tile') return { x: 0, y: 0 };
  if (assetType === 'item' || assetType === 'ui-icon') return { x: 0.5, y: 0.5 };
  return { x: 0.5, y: 1 };
}

function stableSeed(text, assetType, style, size) {
  return `${assetType}:${style}:${size.width}x${size.height}:${text}`;
}

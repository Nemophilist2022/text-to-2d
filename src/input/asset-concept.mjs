import { findVisualPresetForText, getFallbackPreset } from '../visual/visual-presets.mjs';

export function compileAssetConcept({ text, selections = {} }) {
  const assetType = normalizeAssetTypeSelection(selections.assetType) ?? inferAssetType(text);
  const style = selections.style ?? inferStyle(text);
  const size = parseSize(selections.size ?? '64x64');
  const preset = findVisualPresetForText(text, assetType) ?? getFallbackPreset(assetType);
  const subject = preset.subjects[0];
  const animation = selections.animation ?? 'idle';
  const frameCount = selections.frameCount ?? defaultFrameCount(assetType);
  const frameLabels = Array.from({ length: frameCount }, (_, index) => `${animation}_${index}`);

  return {
    assetType,
    subject,
    visualArchetype: preset.visualArchetype,
    presetId: preset.id,
    style,
    size,
    animation,
    frameCount,
    frameLabels,
    direction: selections.direction ?? 'front',
    palette: selections.palette ?? defaultPalette(style),
    seed: selections.seed ?? stableSeed(text, assetType, style, size, preset.id),
  };
}

export function inferAssetType(text) {
  const lower = String(text ?? '').toLowerCase();
  if (lower.includes('monster') || text?.includes('怪物')) return 'monster';
  if (lower.includes('item') || text?.includes('道具')) return 'item';
  if (
    lower.includes('house')
    || lower.includes('cabin')
    || lower.includes('hut')
    || lower.includes('building')
    || lower.includes('environment')
    || lower.includes('scene prop')
    || text?.includes('木屋')
    || text?.includes('小屋')
    || text?.includes('房子')
    || text?.includes('建筑')
    || text?.includes('场景素材')
  ) return 'environment';
  if (lower.includes('tile') || text?.includes('地图') || text?.includes('地块')) return 'map-tile';
  if (lower.includes('icon') || lower.includes('ui') || text?.includes('图标')) return 'ui-icon';
  return 'character';
}

export function inferStyle(text) {
  const lower = String(text ?? '').toLowerCase();
  if (text?.includes('暗黑') || lower.includes('dark')) return 'dark';
  if (text?.includes('国风') || lower.includes('chinese')) return 'chinese';
  if (text?.includes('科幻') || lower.includes('sci-fi')) return 'sci-fi';
  if (text?.includes('Q版') || lower.includes('chibi')) return 'chibi';
  return 'pixel';
}

export function parseSize(size) {
  if (typeof size === 'object') return size;
  const match = String(size).match(/^(\d+)[x×](\d+)$/i);
  if (!match) return { width: 64, height: 64 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function defaultFrameCount(assetType) {
  return assetType === 'character' || assetType === 'monster' ? 4 : 1;
}

export function defaultPalette(style) {
  if (style === 'dark') return 'red';
  if (style === 'sci-fi') return 'green';
  return 'blue';
}

export function defaultPivot(assetType) {
  if (assetType === 'map-tile') return { x: 0, y: 0 };
  if (assetType === 'item' || assetType === 'ui-icon' || assetType === 'environment') return { x: 0.5, y: 0.5 };
  return { x: 0.5, y: 1 };
}

function normalizeAssetTypeSelection(assetType) {
  if (!assetType || assetType === 'auto') return undefined;
  return assetType;
}

function stableSeed(text, assetType, style, size, presetId) {
  return `${assetType}:${style}:${size.width}x${size.height}:${presetId}:${text}`;
}

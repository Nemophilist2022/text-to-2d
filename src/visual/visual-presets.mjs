const fallbackPresetIds = {
  character: 'generic_character',
  monster: 'generic_monster',
  item: 'generic_item',
  'map-tile': 'generic_tile',
  'ui-icon': 'generic_ui_icon',
};

export const visualPresets = [
  {
    id: 'knight_character',
    assetType: 'character',
    subjects: ['knight'],
    visualArchetype: 'armored_character',
    aliases: ['knight', '骑士'],
    silhouette: ['helmeted knight silhouette', 'compact readable RPG character shape'],
    requiredDetails: ['helmet', 'small armor body', 'weapon or shield hint', 'transparent background'],
    forbidden: ['modern clothing', 'photorealistic render'],
    requiredSvgFeatures: [],
    qualityRules: [],
  },
  {
    id: 'slime_monster',
    assetType: 'monster',
    subjects: ['slime'],
    visualArchetype: 'blob_monster',
    aliases: ['slime', '史莱姆'],
    silhouette: ['rounded blob silhouette', 'squashable monster shape'],
    requiredDetails: ['simple face', 'soft highlight', 'transparent background'],
    forbidden: ['humanoid armor', 'hard mechanical parts'],
    requiredSvgFeatures: [],
    qualityRules: [],
  },
  {
    id: 'gem_item',
    assetType: 'item',
    subjects: ['gem'],
    visualArchetype: 'faceted_crystal',
    aliases: ['gem', 'crystal', '宝石', '水晶'],
    silhouette: [
      'diamond or hexagonal crystal outline',
      'pointed top or bottom',
      'readable crystal silhouette at 32x32',
    ],
    requiredDetails: [
      'angular polygon facets',
      'upper-left white highlight',
      'lower-right darker facet',
      'transparent background',
    ],
    forbidden: [
      'lantern',
      'lamp',
      'handle',
      'base',
      'rectangular container',
      'black background block',
      'black occluder',
    ],
    requiredSvgFeatures: [{ feature: 'polygonOrPath', severity: 'error' }],
    qualityRules: [],
  },
  {
    id: 'grass_tile',
    assetType: 'map-tile',
    subjects: ['grass'],
    visualArchetype: 'terrain_tile',
    aliases: ['grass', 'grass tile', '草地', '地块', '地图块'],
    silhouette: ['full tile footprint', 'seamless square terrain patch'],
    requiredDetails: ['grass texture clusters', 'tileable edges', 'transparent or edge-safe background'],
    forbidden: ['character', 'weapon', 'ui button'],
    requiredSvgFeatures: [],
    qualityRules: [],
  },
  {
    id: 'heart_ui_icon',
    assetType: 'ui-icon',
    subjects: ['heart'],
    visualArchetype: 'heart_icon',
    aliases: ['heart', 'hp', 'health', '红心', '爱心', '生命'],
    silhouette: ['simple heart silhouette', 'readable UI icon at 32x32'],
    requiredDetails: ['clear red heart shape', 'small highlight', 'transparent background'],
    forbidden: ['text label', 'complex scene', 'photorealistic organ'],
    requiredSvgFeatures: [{ feature: 'path', severity: 'warning' }],
    qualityRules: [],
  },
  genericPreset('generic_character', 'character', 'hero', 'generic_game_character'),
  genericPreset('generic_monster', 'monster', 'monster', 'generic_game_monster'),
  genericPreset('generic_item', 'item', 'item', 'generic_game_item'),
  genericPreset('generic_tile', 'map-tile', 'tile', 'generic_map_tile'),
  genericPreset('generic_ui_icon', 'ui-icon', 'icon', 'generic_ui_icon'),
];

export function getVisualPreset(idOrSubject, assetType) {
  return visualPresets.find((preset) => preset.id === idOrSubject)
    ?? visualPresets.find((preset) => preset.subjects.includes(idOrSubject) && (!assetType || preset.assetType === assetType))
    ?? null;
}

export function findVisualPresetForText(text, assetType) {
  const lower = String(text ?? '').toLowerCase();
  return visualPresets.find((preset) => preset.assetType === assetType && preset.aliases.some((alias) => lower.includes(alias.toLowerCase())))
    ?? null;
}

export function getFallbackPreset(assetType) {
  return getVisualPreset(fallbackPresetIds[assetType] ?? 'generic_character');
}

function genericPreset(id, assetType, subject, visualArchetype) {
  return {
    id,
    assetType,
    subjects: [subject],
    visualArchetype,
    aliases: [],
    silhouette: [`readable ${assetType} silhouette`],
    requiredDetails: ['transparent background', 'game-ready simple shape'],
    forbidden: ['photorealistic render', 'busy background'],
    requiredSvgFeatures: [],
    qualityRules: [],
  };
}

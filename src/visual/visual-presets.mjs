const fallbackPresetIds = {
  character: 'generic_character',
  monster: 'generic_monster',
  item: 'generic_item',
  environment: 'generic_environment',
  'map-tile': 'generic_tile',
  'ui-icon': 'generic_ui_icon',
};

export const visualPresets = [
  withDefaults({
    id: 'knight_character',
    assetType: 'character',
    subjects: ['knight'],
    visualArchetype: 'armored_character',
    aliases: ['knight', '骑士'],
    silhouette: ['helmeted knight silhouette', 'compact readable RPG character shape'],
    composition: ['front-facing full-body sprite', 'feet anchored near bottom center', 'centered object inside frame with no crop'],
    paletteHints: ['steel blue armor', 'bright face/visor contrast', 'one readable accent color for weapon or shield'],
    readabilityRules: ['readable at 32x32 through helmet/body split', 'readable at 64x64 with weapon silhouette', 'readable at 128x128 with armor detail but no clutter'],
    svgShapeHints: ['circle or rect helmet', 'rect body armor', 'path sword or shield silhouette'],
    requiredDetails: ['helmet', 'small armor body', 'weapon or shield hint', 'transparent background'],
    forbidden: ['modern clothing', 'photorealistic render', 'background scene'],
    requiredSvgFeatures: [{ feature: 'subjectShape', severity: 'error' }],
  }),
  withDefaults({
    id: 'slime_monster',
    assetType: 'monster',
    subjects: ['slime'],
    visualArchetype: 'blob_monster',
    aliases: ['slime', '史莱姆'],
    silhouette: ['rounded blob silhouette', 'squashable monster shape'],
    composition: ['single centered creature', 'body sits on lower third', 'no props competing with face'],
    paletteHints: ['green or blue translucent body', 'darker lower rim', 'small white highlight'],
    readabilityRules: ['readable at 32x32 by blob outline and two eyes', 'readable at 64x64 with soft highlight', 'readable at 128x128 with simple volume'],
    svgShapeHints: ['ellipse body', 'circle eyes', 'small ellipse highlight'],
    requiredDetails: ['simple face', 'soft highlight', 'transparent background'],
    forbidden: ['humanoid armor', 'hard mechanical parts', 'busy background'],
    requiredSvgFeatures: [{ feature: 'subjectShape', severity: 'error' }],
  }),
  withDefaults({
    id: 'gem_item',
    assetType: 'item',
    subjects: ['gem'],
    visualArchetype: 'faceted_crystal',
    aliases: ['gem', 'crystal', '宝石', '水晶'],
    silhouette: ['diamond or hexagonal crystal outline', 'pointed top or bottom', 'readable crystal silhouette at 32x32'],
    composition: ['centered object', 'single pickup item', 'leave 2-4px transparent padding around object'],
    paletteHints: ['cyan or blue body', 'upper-left white highlight', 'lower-right darker facet'],
    readabilityRules: ['readable at 32x32 through diamond outline', 'readable at 64x64 through facet separation', 'readable at 128x128 with controlled facet detail'],
    svgShapeHints: ['outer polygon crystal silhouette', 'inner polygon facets', 'small white polygon highlight'],
    requiredDetails: ['angular polygon facets', 'upper-left white highlight', 'lower-right darker facet', 'transparent background'],
    forbidden: ['lantern', 'lamp', 'handle', 'base', 'rectangular container', 'black background block', 'black occluder'],
    requiredSvgFeatures: [{ feature: 'polygonOrPath', severity: 'error' }, { feature: 'subjectShape', severity: 'error' }],
  }),
  withDefaults({
    id: 'grass_tile',
    assetType: 'map-tile',
    subjects: ['grass'],
    visualArchetype: 'terrain_tile',
    aliases: ['grass', 'grass tile', '草地', '地块', '地图块'],
    silhouette: ['full tile footprint', 'seamless square terrain patch'],
    composition: ['tile-filling terrain surface', 'edge-safe pattern', 'no centered pickup object'],
    paletteHints: ['base grass green', 'two darker grass clusters', 'one yellow-green highlight cluster'],
    readabilityRules: ['readable at 32x32 as a grass tile', 'readable at 64x64 with repeated clusters', 'readable at 128x128 without noisy micro-detail'],
    svgShapeHints: ['edge-safe small rect or path grass clusters', 'multiple short blades', 'no full-canvas opaque background block'],
    requiredDetails: ['grass texture clusters', 'tileable edges', 'transparent or edge-safe background'],
    forbidden: ['character', 'weapon', 'ui button', 'single floating item'],
    requiredSvgFeatures: [{ feature: 'subjectShape', severity: 'error' }, { feature: 'tileCoverage', severity: 'warning' }],
  }),
  withDefaults({
    id: 'heart_ui_icon',
    assetType: 'ui-icon',
    subjects: ['heart'],
    visualArchetype: 'heart_icon',
    aliases: ['heart', 'hp', 'health', '红心', '爱心', '生命'],
    silhouette: ['simple heart silhouette', 'readable UI icon at 32x32'],
    composition: ['centered UI icon', 'large silhouette occupying most of frame', 'transparent padding around icon'],
    paletteHints: ['red primary fill', 'dark red lower shadow', 'small pink or white upper-left highlight'],
    readabilityRules: ['readable at 32x32 as a heart', 'readable at 64x64 with highlight and shadow', 'readable at 128x128 without text labels'],
    svgShapeHints: ['single path heart silhouette', 'smaller path highlight', 'optional dark outline'],
    requiredDetails: ['clear red heart shape', 'small highlight', 'transparent background'],
    forbidden: ['text label', 'complex scene', 'photorealistic organ'],
    requiredSvgFeatures: [{ feature: 'path', severity: 'warning' }, { feature: 'subjectShape', severity: 'error' }],
  }),
  withDefaults({
    id: 'wooden_house_environment',
    assetType: 'environment',
    subjects: ['wooden-house'],
    visualArchetype: 'small_building_prop',
    aliases: ['wooden house', 'wooden cabin', 'cabin', 'house', 'hut', 'log cabin', '木屋', '小屋', '房子', '建筑'],
    silhouette: ['small medieval wooden house silhouette', 'front-view readable roof and wall shape', 'single environment prop'],
    composition: ['single centered building prop', 'front view or slight 3/4 front view', 'leave transparent padding around the roof and base', 'not a character portrait'],
    paletteHints: ['warm brown wooden walls', 'dark roof outline', 'small blue or warm yellow window accent', 'green grass base only if requested'],
    readabilityRules: ['readable at 32x32 by roof and square wall silhouette', 'readable at 64x64 with door and window', 'readable at 128x128 with wooden plank detail but no clutter'],
    svgShapeHints: ['polygon roof', 'rect wall body', 'rect door', 'small rect window', 'short grass base path if scene prop'],
    requiredDetails: ['triangular or sloped roof', 'wooden wall body', 'door or window', 'transparent background'],
    forbidden: ['human character', 'hero sprite', 'helmet', 'weapon', 'document icon', 'paper sheet', 'cropped landscape screenshot'],
    requiredSvgFeatures: [{ feature: 'subjectShape', severity: 'error' }],
  }),
  genericPreset('generic_character', 'character', 'hero', 'generic_game_character'),
  genericPreset('generic_monster', 'monster', 'monster', 'generic_game_monster'),
  genericPreset('generic_item', 'item', 'item', 'generic_game_item'),
  genericPreset('generic_environment', 'environment', 'environment-prop', 'generic_environment_prop'),
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
  return withDefaults({
    id,
    assetType,
    subjects: [subject],
    visualArchetype,
    aliases: [],
    silhouette: [`readable ${assetType} silhouette`],
    composition: [assetType === 'map-tile' ? 'tile-filling composition' : 'centered object composition'],
    paletteHints: ['limited game palette', 'clear light and dark values'],
    readabilityRules: ['readable at 32x32', 'readable at 64x64', 'readable at 128x128'],
    svgShapeHints: ['simple SVG primitive shapes', 'transparent background'],
    requiredDetails: ['transparent background', 'game-ready simple shape'],
    forbidden: ['photorealistic render', 'busy background'],
    requiredSvgFeatures: [{ feature: 'subjectShape', severity: 'warning' }],
  });
}

function withDefaults(preset) {
  return {
    composition: [],
    paletteHints: [],
    readabilityRules: [],
    svgShapeHints: [],
    qualityRules: [],
    ...preset,
  };
}

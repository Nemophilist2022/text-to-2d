export const PROMPT_COMPILER_VERSION = 'prompt-compiler-1';

const globalRules = [
  'Generate a self-contained SVG 2D game asset.',
  'Use transparent background.',
  'Fit the requested frame size exactly.',
  'Set shape-rendering="crispEdges" on the SVG root.',
];

const globalForbidden = ['photorealistic', 'blur', 'low contrast', 'cropped', 'inconsistent frames', 'busy background'];

const assetTypeRules = {
  character: ['Game character sprite.', 'Readable body/head silhouette.', 'Keep animation frames consistent.'],
  monster: ['Game monster sprite.', 'Readable creature silhouette.', 'Express simple personality through shape.'],
  item: ['Game item pickup.', 'Center the object with a strong item silhouette.', 'No scenery or character body.'],
  'map-tile': ['Map tile asset.', 'Fill the tile footprint.', 'Use tileable edge-safe composition.'],
  'ui-icon': ['UI icon asset.', 'Simple high-contrast icon shape.', 'Readable in a game HUD.'],
};

const assetTypeForbidden = {
  character: ['landscape-only image'],
  monster: ['friendly human character'],
  item: ['full scene', 'large background prop'],
  'map-tile': ['floating object', 'character sprite'],
  'ui-icon': ['text label', 'complex scene'],
};

const styleRules = {
  pixel: ['pixel art', 'low-resolution readable clusters', 'limited palette'],
  chibi: ['chibi proportions', 'rounded cute shapes'],
  dark: ['dark fantasy style', 'high contrast silhouette'],
  chinese: ['Chinese fantasy style', 'ornamental but readable details'],
  'sci-fi': ['science fiction style', 'clean luminous accents'],
};

const styleForbidden = {
  pixel: ['anti-aliased painterly render', 'photo texture'],
  chibi: ['grim realistic anatomy'],
  dark: ['pastel toy look'],
  chinese: ['modern streetwear'],
  'sci-fi': ['medieval-only ornament'],
};

export function compilePrompt({ concept, preset, outputContract }) {
  const size = `${concept.size.width}x${concept.size.height}`;
  const promptSections = [
    {
      id: 'global',
      rules: [...globalRules, `Target size: ${size}.`, `Output media type: ${outputContract.mediaType}.`],
    },
    {
      id: 'asset-type',
      rules: assetTypeRules[concept.assetType] ?? assetTypeRules.item,
    },
    {
      id: 'style',
      rules: styleRules[concept.style] ?? styleRules.pixel,
    },
    {
      id: 'visual-preset',
      rules: [
        `Subject: ${concept.subject}.`,
        `Visual archetype: ${concept.visualArchetype}.`,
        `${String(concept.visualArchetype ?? concept.subject).replaceAll('_', ' ')} ${concept.subject}.`,
        ...preset.silhouette,
        ...preset.requiredDetails,
        ...preset.forbidden.map((item) => `No ${item}.`),
      ],
    },
  ];

  return {
    prompt: promptSections.flatMap((section) => section.rules).join(' '),
    negativePrompt: unique([
      ...globalForbidden,
      ...(assetTypeForbidden[concept.assetType] ?? []),
      ...(styleForbidden[concept.style] ?? []),
      ...preset.forbidden,
    ]).join(', '),
    promptSections,
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export const PROMPT_COMPILER_VERSION = 'prompt-compiler-2';

const globalRules = [
  'Generate a self-contained SVG 2D game asset.',
  'Use transparent background.',
  'No full-canvas background or opaque backdrop.',
  'Fit the requested frame size exactly.',
  'Set shape-rendering="crispEdges" on the SVG root.',
  'Use viewBox matching the requested size.',
];

const globalForbidden = ['photorealistic', 'blur', 'low contrast', 'cropped', 'inconsistent frames', 'busy background', 'full-canvas background'];

const assetTypeRules = {
  character: ['Game character sprite.', 'Readable body/head silhouette.', 'Keep animation frames consistent.', 'Feet or base should sit near bottom center.'],
  monster: ['Game monster sprite.', 'Readable creature silhouette.', 'Express simple personality through shape.', 'Keep the creature as the only main subject.'],
  item: ['Game item pickup.', 'Use a centered object composition.', 'Center the object with a strong item silhouette.', 'No scenery or character body.'],
  environment: ['Game environment prop or scene object.', 'Use a readable standalone prop silhouette.', 'Center the prop in frame unless it is a background piece.', 'No character body or UI label.'],
  'map-tile': ['Map tile asset.', 'Use tile-filling rules instead of centered object rules.', 'Fill the tile footprint with edge-safe patterns.', 'Avoid single floating props.'],
  'ui-icon': ['UI icon asset.', 'Use a centered icon composition.', 'Simple high-contrast icon shape.', 'Readable in a game HUD.'],
};

const assetTypeForbidden = {
  character: ['landscape-only image'],
  monster: ['friendly human character'],
  item: ['full scene', 'large background prop'],
  environment: ['character sprite', 'inventory icon only', 'document icon', 'paper sheet'],
  'map-tile': ['floating object', 'character sprite'],
  'ui-icon': ['text label', 'complex scene'],
};

const styleRules = {
  pixel: ['pixel art', 'low-resolution readable clusters', 'limited palette', 'hard edges, no soft painterly gradients'],
  chibi: ['chibi proportions', 'rounded cute shapes', 'simple readable features'],
  dark: ['dark fantasy style', 'high contrast silhouette', 'controlled shadow shapes'],
  chinese: ['Chinese fantasy style', 'ornamental but readable details', 'avoid tiny unreadable linework'],
  'sci-fi': ['science fiction style', 'clean luminous accents', 'simple mechanical silhouettes'],
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
  const normalizedPreset = {
    composition: [],
    paletteHints: [],
    readabilityRules: [],
    svgShapeHints: [],
    silhouette: [],
    requiredDetails: [],
    forbidden: [],
    ...preset,
  };
  const negativeRules = unique([
    ...globalForbidden,
    ...(assetTypeForbidden[concept.assetType] ?? []),
    ...(styleForbidden[concept.style] ?? []),
    ...normalizedPreset.forbidden,
  ]);
  const promptSections = [
    {
      id: 'global-output',
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
      id: 'composition',
      rules: [
        'Composition contract:',
        ...normalizedPreset.composition,
        ...normalizedPreset.paletteHints.map((hint) => `Palette hint: ${hint}.`),
        ...normalizedPreset.readabilityRules,
      ],
    },
    {
      id: 'visual-preset',
      rules: [
        `Subject: ${concept.subject}.`,
        `Visual archetype: ${concept.visualArchetype}.`,
        `${String(concept.visualArchetype ?? concept.subject).replaceAll('_', ' ')} ${concept.subject}.`,
        ...normalizedPreset.silhouette,
        ...normalizedPreset.requiredDetails,
        `SVG shape hints: ${normalizedPreset.svgShapeHints.join('; ')}.`,
      ],
    },
    {
      id: 'negative-contract',
      rules: negativeRules.map((item) => `No ${item}.`),
    },
  ];

  return {
    prompt: promptSections.flatMap((section) => section.rules).join(' '),
    negativePrompt: negativeRules.join(', '),
    promptSections,
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

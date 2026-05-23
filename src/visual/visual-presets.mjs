export const visualPresets = {
  gem: {
    subject: 'gem',
    visualArchetype: 'faceted_crystal',
    silhouette: [
      'diamond or hexagonal crystal outline',
      'pointed top or bottom',
      'readable crystal silhouette at 32x32',
    ],
    requiredDetails: [
      'angular polygon facets',
      'upper-left small white highlight',
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
  },
  knight: {
    subject: 'knight',
    visualArchetype: 'armored_character',
    silhouette: ['helmeted knight silhouette', 'compact readable RPG character shape'],
    requiredDetails: ['helmet', 'small armor body', 'transparent background'],
    forbidden: ['modern clothing', 'photorealistic render'],
  },
  slime: {
    subject: 'slime',
    visualArchetype: 'blob_monster',
    silhouette: ['rounded blob silhouette', 'squashable monster shape'],
    requiredDetails: ['simple face', 'soft highlight', 'transparent background'],
    forbidden: ['humanoid armor', 'hard mechanical parts'],
  },
};

export function getVisualPreset(subject) {
  return visualPresets[subject] ?? null;
}

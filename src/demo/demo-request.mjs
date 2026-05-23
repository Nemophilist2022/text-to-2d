export const demoRequest = {
  assetId: 'hero-idle',
  assetType: 'character',
  variantId: 'idle',
  backendId: 'prebuilt',
  parameters: {
    style: 'pixel',
    size: { width: 64, height: 64 },
    direction: 'front',
    palette: 'blue',
    seed: 'demo-seed',
    frameCount: 4,
    frameLabels: ['idle_0', 'idle_1', 'idle_2', 'idle_3'],
    promptHints: ['blue cloak'],
  },
  postprocessSpec: {
    version: 'mvp-plus-1',
    trimTransparent: false,
    normalizeFrameSize: true,
    pivot: { x: 0.5, y: 1 },
  },
  exportSpec: { version: 'mvp-plus-1', formats: ['frames', 'spritesheet', 'atlas-json'] },
  forceRegenerate: false,
};

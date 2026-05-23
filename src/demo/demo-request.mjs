export const demoRequest = {
  assetId: 'hero-idle',
  assetType: 'character',
  backendId: 'prebuilt',
  parameters: {
    name: 'Hero',
    style: 'pixel',
    size: { width: 64, height: 64 },
    view: 'front',
    frames: [{ id: 'idle-0', order: 0 }],
    promptHints: ['blue cloak'],
  },
  postprocessSpec: { version: 'mvp-1', operations: ['copy'] },
  exportSpec: { format: 'image-directory', version: 'mvp-1' },
  forceRegenerate: false,
};

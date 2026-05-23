export function createMockAiBackend() {
  return {
    backendId: 'mock-ai',
    version: 'mvp-plus-1',
    async generate(input) {
      const { variantId = 'idle', parameters } = input.request;
      const width = parameters.size.width;
      const height = parameters.size.height;
      const frameCount = parameters.frameCount ?? parameters.frameLabels?.length ?? 1;
      const frameLabels = parameters.frameLabels ?? Array.from({ length: frameCount }, (_, index) => `${variantId}_${index}`);

      return {
        backendId: 'mock-ai',
        backendVersion: 'mvp-plus-1',
        frames: frameLabels.map((frameId, order) => ({
          frameId,
          order,
          fileName: `${frameId}.svg`,
          mediaType: 'image/svg+xml',
          content: [
            `<svg xmlns="http://www.w3.org/2000/svg" class="mock-ai" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
            `<rect width="100%" height="100%" fill="none"/>`,
            `<path d="M ${10 + order} ${height - 10} L ${width / 2} ${8 + order} L ${width - 10 - order} ${height - 10} Z" fill="#a855f7"/>`,
            `<text x="50%" y="${height - 6}" text-anchor="middle" font-size="7" fill="#111827">mock-ai ${escapeXml(frameId)}</text>`,
            `</svg>`,
          ].join(''),
        })),
        metadata: {
          source: 'mock-ai-backend',
          deterministic: true,
          simulated: true,
        },
      };
    },
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

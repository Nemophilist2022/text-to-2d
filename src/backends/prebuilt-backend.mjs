export function createPrebuiltBackend() {
  return {
    backendId: 'prebuilt',
    version: 'mvp-1',
    async generate(input) {
      const { assetId, parameters } = input.request;
      const width = parameters.size.width;
      const height = parameters.size.height;
      const label = escapeXml(parameters.name || assetId);

      return {
        fileName: `${assetId}.svg`,
        mediaType: 'image/svg+xml',
        content: [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
          `<rect width="100%" height="100%" fill="#1f2937"/>`,
          `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.max(8, Math.min(width, height) / 4)}" fill="#60a5fa"/>`,
          `<text x="50%" y="${height - 8}" text-anchor="middle" font-size="8" fill="#ffffff">${label}</text>`,
          `</svg>`,
        ].join(''),
        metadata: {
          source: 'prebuilt-backend',
          deterministic: true,
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

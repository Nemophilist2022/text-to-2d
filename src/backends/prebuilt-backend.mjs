export function createPrebuiltBackend() {
  return {
    backendId: 'prebuilt',
    version: 'mvp-plus-1',
    async generate(input) {
      const { assetId, variantId = 'idle', parameters } = input.request;
      const width = parameters.size.width;
      const height = parameters.size.height;
      const frameCount = parameters.frameCount ?? parameters.frameLabels?.length ?? 1;
      const frameLabels = parameters.frameLabels ?? Array.from({ length: frameCount }, (_, index) => `${variantId}_${index}`);
      const palette = parameters.palette ?? 'blue';

      return {
        backendId: 'prebuilt',
        backendVersion: 'mvp-plus-1',
        frames: frameLabels.map((frameId, order) => ({
          frameId,
          order,
          fileName: `${frameId}.svg`,
          mediaType: 'image/svg+xml',
          content: renderFrame({
            assetId,
            frameId,
            order,
            width,
            height,
            palette,
            sourceClass: 'prebuilt',
          }),
        })),
        metadata: {
          source: 'prebuilt-backend',
          deterministic: true,
          assetId,
          variantId,
        },
      };
    },
  };
}

function renderFrame({ assetId, frameId, order, width, height, palette, sourceClass }) {
  const color = paletteColor(palette);
  const cx = width / 2 + (order % 2 === 0 ? -3 : 3);
  const cy = height / 2 + (order % 3) - 1;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="${sourceClass} palette-${escapeXml(palette)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="none"/>`,
    `<rect x="${width * 0.25}" y="${height * 0.25}" width="${width * 0.5}" height="${height * 0.55}" rx="4" fill="${color.body}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${Math.max(8, Math.min(width, height) / 5)}" fill="${color.head}"/>`,
    `<text x="50%" y="${height - 6}" text-anchor="middle" font-size="7" fill="${color.text}">${escapeXml(frameId)}</text>`,
    `<desc>${escapeXml(assetId)} frame ${order}</desc>`,
    `</svg>`,
  ].join('');
}

function paletteColor(palette) {
  if (palette === 'red') return { body: '#b91c1c', head: '#f87171', text: '#111827' };
  if (palette === 'green') return { body: '#047857', head: '#34d399', text: '#111827' };
  return { body: '#1d4ed8', head: '#60a5fa', text: '#111827' };
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

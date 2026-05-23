const FORBIDDEN_WORDS = ['lantern', 'lamp', 'handle', 'base'];
const SOLID_BACKGROUND_FILLS = ['#000', '#000000', 'black', '#111', '#111111'];

export function validateSvgQuality({ svg, packet, frameId = 'unknown' }) {
  const failures = [];
  const normalized = String(svg ?? '');
  const lower = normalized.toLowerCase();

  if (!lower.includes('<svg')) failures.push('missing <svg root');

  if (isGemPacket(packet)) {
    if (!lower.includes('<polygon') && !lower.includes('<path')) {
      failures.push('gem requires polygon/path faceted structure');
    }

    for (const word of FORBIDDEN_WORDS) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(normalized)) {
        failures.push(`forbidden visual word: ${word}`);
      }
    }
  }

  if (hasFullCanvasSolidBackground(normalized, packet?.size)) {
    failures.push('full-canvas solid background is not allowed');
  }

  if (failures.length > 0) {
    throw new Error(`chat-svg quality gate failed for ${frameId}: ${failures.join('; ')}`);
  }
}

function isGemPacket(packet) {
  return packet?.subject === 'gem' || packet?.visualArchetype === 'faceted_crystal';
}

function hasFullCanvasSolidBackground(svg, size = {}) {
  const rectTags = svg.match(/<rect\b[^>]*>/gi) ?? [];
  return rectTags.some((tag) => {
    const width = attrValue(tag, 'width');
    const height = attrValue(tag, 'height');
    const x = attrValue(tag, 'x') ?? '0';
    const y = attrValue(tag, 'y') ?? '0';
    const fill = (attrValue(tag, 'fill') ?? '').toLowerCase();

    const coversWidth = width === '100%' || width === String(size.width);
    const coversHeight = height === '100%' || height === String(size.height);
    const startsAtOrigin = Number(x) === 0 && Number(y) === 0;
    const opaqueFill = fill && fill !== 'none' && fill !== 'transparent';

    return coversWidth && coversHeight && startsAtOrigin && (opaqueFill || SOLID_BACKGROUND_FILLS.includes(fill));
  });
}

function attrValue(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']?([^"'\\s>]+)`, 'i'))?.[1];
}

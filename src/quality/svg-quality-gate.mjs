export const QUALITY_GATE_VERSION = 'quality-gate-1';

const SOLID_BACKGROUND_FILLS = ['#000', '#000000', 'black', '#111', '#111111'];

export function validateSvgQuality({ svg, packet, frameId = 'unknown' }) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const normalized = String(svg ?? '');
  const lower = normalized.toLowerCase();

  record(checks, 'svg-root', lower.includes('<svg'));
  if (!lower.includes('<svg')) errors.push('missing <svg root');

  const hasDimensions = hasTargetDimensions(normalized, packet?.size);
  record(checks, 'target-dimensions', hasDimensions);
  if (!hasDimensions) errors.push('missing target width/height');

  const fullBackground = hasFullCanvasSolidBackground(normalized, packet?.size);
  record(checks, 'no-full-canvas-solid-background', !fullBackground);
  if (fullBackground) errors.push('full-canvas solid background is not allowed');

  for (const rule of packet?.qualityContract?.requiredSvgFeatures ?? packet?.requiredSvgFeatures ?? []) {
    const ok = hasSvgFeature(normalized, rule.feature);
    record(checks, `feature:${rule.feature}`, ok);
    if (!ok && rule.severity === 'error') errors.push(`required svg feature missing: ${featureLabel(rule.feature)}`);
    if (!ok && rule.severity !== 'error') warnings.push(`recommended svg feature missing: ${rule.feature}`);
  }

  for (const word of packet?.qualityContract?.forbidden ?? packet?.forbidden ?? []) {
    if (new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(normalized)) {
      warnings.push(`forbidden visual word appears in svg text: ${word}`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    checks,
    frameId,
    version: QUALITY_GATE_VERSION,
  };
}

function record(checks, id, passed) {
  checks.push({ id, passed });
}

function hasTargetDimensions(svg, size = {}) {
  if (!size?.width || !size?.height) return true;
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  return attrValue(root, 'width') === String(size.width) && attrValue(root, 'height') === String(size.height);
}

function hasSvgFeature(svg, feature) {
  const lower = svg.toLowerCase();
  if (feature === 'polygonOrPath') return lower.includes('<polygon') || lower.includes('<path');
  if (feature === 'path') return lower.includes('<path');
  if (feature === 'polygon') return lower.includes('<polygon');
  if (feature === 'circle') return lower.includes('<circle');
  return true;
}

function featureLabel(feature) {
  if (feature === 'polygonOrPath') return 'polygon/path';
  return feature;
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

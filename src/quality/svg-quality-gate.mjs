export const QUALITY_GATE_VERSION = 'quality-gate-1';

const SOLID_BACKGROUND_FILLS = ['#000', '#000000', 'black', '#111', '#111111'];
const SHAPE_TAGS = ['path', 'polygon', 'circle', 'ellipse', 'rect', 'line', 'polyline'];

export function validateSvgQuality({ svg, packet, frameId = 'unknown' }) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const normalized = String(svg ?? '');
  const lower = normalized.toLowerCase();
  const root = normalized.match(/<svg\b[^>]*>/i)?.[0] ?? '';

  record(checks, 'svg-root', lower.includes('<svg'));
  if (!lower.includes('<svg')) errors.push('missing <svg root');

  const hasDimensions = hasTargetDimensions(root, packet?.size);
  record(checks, 'target-dimensions', hasDimensions);
  if (!hasDimensions) errors.push('missing target width/height');

  const hasViewBoxAttr = Boolean(attrValue(root, 'viewBox'));
  record(checks, 'viewBox', hasViewBoxAttr);
  if (lower.includes('<svg') && !hasViewBoxAttr) errors.push('missing viewBox');

  const fullBackground = hasFullCanvasSolidBackground(normalized, packet?.size);
  record(checks, 'no-full-canvas-solid-background', !fullBackground);
  if (fullBackground) errors.push('full-canvas solid background is not allowed');

  for (const rule of packet?.qualityContract?.requiredSvgFeatures ?? packet?.requiredSvgFeatures ?? []) {
    const ok = hasSvgFeature(normalized, rule.feature, packet?.size);
    record(checks, `feature:${rule.feature}`, ok);
    if (!ok && rule.severity === 'error') errors.push(`required ${featureLabel(rule.feature)} missing`);
    if (!ok && rule.severity !== 'error') warnings.push(warningForFeature(rule.feature));
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

function hasTargetDimensions(root, size = {}) {
  if (!size?.width || !size?.height) return true;
  return attrValue(root, 'width') === String(size.width) && attrValue(root, 'height') === String(size.height);
}

function hasSvgFeature(svg, feature, size = {}) {
  const lower = svg.toLowerCase();
  if (feature === 'polygonOrPath') return lower.includes('<polygon') || lower.includes('<path');
  if (feature === 'path') return lower.includes('<path');
  if (feature === 'polygon') return lower.includes('<polygon');
  if (feature === 'circle') return lower.includes('<circle');
  if (feature === 'subjectShape') return hasVisibleSubjectShape(svg, size);
  if (feature === 'tileCoverage') return hasTileCoverageShape(svg, size);
  return true;
}

function hasVisibleSubjectShape(svg, size = {}) {
  const tags = svg.match(/<(path|polygon|circle|ellipse|rect|line|polyline)\b[^>]*>/gi) ?? [];
  return tags.some((tag) => {
    const tagName = tag.match(/^<([a-z]+)/i)?.[1]?.toLowerCase();
    const fill = (attrValue(tag, 'fill') ?? '').toLowerCase();
    const stroke = (attrValue(tag, 'stroke') ?? '').toLowerCase();
    if (tagName === 'rect' && isFullCanvasRect(tag, size) && (fill === 'none' || fill === 'transparent' || !fill)) return false;
    return fill !== 'none' || Boolean(stroke && stroke !== 'none');
  });
}

function hasTileCoverageShape(svg, size = {}) {
  const tags = svg.match(/<(rect|path|polygon|polyline|line)\b[^>]*>/gi) ?? [];
  return tags.some((tag) => isFullCanvasRect(tag, size) || touchesTileEdge(tag, size));
}

function touchesTileEdge(tag, size = {}) {
  const x = Number(attrValue(tag, 'x') ?? Number.NaN);
  const y = Number(attrValue(tag, 'y') ?? Number.NaN);
  const width = Number(attrValue(tag, 'width') ?? Number.NaN);
  const height = Number(attrValue(tag, 'height') ?? Number.NaN);
  if (Number.isFinite(x) && x <= 0) return true;
  if (Number.isFinite(y) && y <= 0) return true;
  if (Number.isFinite(width) && Number.isFinite(x) && size.width && x + width >= size.width) return true;
  if (Number.isFinite(height) && Number.isFinite(y) && size.height && y + height >= size.height) return true;
  const points = attrValue(tag, 'points') ?? '';
  return points.split(/[\s,]+/).some((value, index) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return false;
    return index % 2 === 0 ? number <= 0 || number >= size.width : number <= 0 || number >= size.height;
  });
}

function featureLabel(feature) {
  if (feature === 'polygonOrPath') return 'polygon/path';
  if (feature === 'subjectShape') return 'visible subject shape';
  if (feature === 'tileCoverage') return 'tile coverage shape';
  return feature;
}

function warningForFeature(feature) {
  if (feature === 'tileCoverage') return 'tile coverage shape not detected';
  return `recommended svg feature missing: ${feature}`;
}

function hasFullCanvasSolidBackground(svg, size = {}) {
  const rectTags = svg.match(/<rect\b[^>]*>/gi) ?? [];
  return rectTags.some((tag) => {
    const fill = (attrValue(tag, 'fill') ?? '').toLowerCase();
    const opaqueFill = fill && fill !== 'none' && fill !== 'transparent';
    return isFullCanvasRect(tag, size) && (opaqueFill || SOLID_BACKGROUND_FILLS.includes(fill));
  });
}

function isFullCanvasRect(tag, size = {}) {
  const width = attrValue(tag, 'width');
  const height = attrValue(tag, 'height');
  const x = attrValue(tag, 'x') ?? '0';
  const y = attrValue(tag, 'y') ?? '0';
  const coversWidth = width === '100%' || width === String(size.width);
  const coversHeight = height === '100%' || height === String(size.height);
  return coversWidth && coversHeight && Number(x) === 0 && Number(y) === 0;
}

function attrValue(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']?([^"'\\s>]+)`, 'i'))?.[1];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

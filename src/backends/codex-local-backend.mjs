export function createCodexLocalBackend() {
  return {
    backendId: 'codex-local',
    version: 'mvp-api-ready-1',
    async generate(input) {
      const packet = input.packet ?? input.request.generationPacket;
      if (!packet) {
        throw new Error('codex-local backend requires a GenerationPacket');
      }

      return {
        backendId: 'codex-local',
        backendVersion: 'mvp-api-ready-1',
        frames: packet.frameLabels.map((frameId, order) => ({
          frameId,
          order,
          fileName: `${frameId}.svg`,
          mediaType: packet.outputContract.mediaType,
          content: renderCodexLocalFrame(packet, frameId, order),
        })),
        metadata: {
          source: 'codex-local-backend',
          deterministic: true,
          requestId: packet.requestId,
          prompt: packet.prompt,
          outputContract: packet.outputContract,
        },
      };
    },
  };
}

function renderCodexLocalFrame(packet, frameId, order) {
  const { width, height } = packet.size;
  const color = styleColor(packet.style);
  const motionOffset = order % 2 === 0 ? -2 : 2;
  const subjectGlyph = subjectShape(packet.subject, width, height, motionOffset, color);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="codex-local ${escapeXml(packet.style)} ${escapeXml(packet.subject)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="none"/>`,
    subjectGlyph,
    `<desc>${escapeXml(`${packet.assetId ?? packet.subject} ${frameId}: ${packet.prompt}`)}</desc>`,
    `</svg>`,
  ].join('');
}

function subjectShape(subject, width, height, offset, color) {
  if (subject === 'slime') return slimeShape(width, height, offset, color);
  if (subject === 'gem') return gemShape(width, height);
  if (subject === 'heart') return heartShape(width, height);
  if (subject === 'grass') return grassTileShape(width, height);
  if (subject === 'wooden-house') return woodenHouseShape(width, height);
  if (subject === 'energy-core') {
    return `<polygon points="${width / 2},${height * 0.2} ${width * 0.72},${height / 2} ${width / 2},${height * 0.8} ${width * 0.28},${height / 2}" fill="${color.primary}"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.max(4, width * 0.12)}" fill="${color.accent}"/>`;
  }
  return knightShape(width, height, offset, color);
}

function knightShape(width, height, offset, color) {
  return [
    `<rect x="${width * 0.36 + offset}" y="${height * 0.42}" width="${width * 0.28}" height="${height * 0.34}" rx="2" fill="${color.primary}"/>`,
    `<rect x="${width * 0.38 + offset}" y="${height * 0.2}" width="${width * 0.24}" height="${height * 0.2}" rx="2" fill="${color.accent}"/>`,
    `<rect x="${width * 0.42 + offset}" y="${height * 0.28}" width="${width * 0.16}" height="${height * 0.04}" fill="${color.text}"/>`,
    `<path d="M ${width * 0.64 + offset} ${height * 0.46} L ${width * 0.84 + offset} ${height * 0.22}" stroke="${color.text}" stroke-width="3"/>`,
  ].join('');
}

function slimeShape(width, height, offset, color) {
  return [
    `<ellipse cx="${width / 2 + offset}" cy="${height * 0.62}" rx="${width * 0.3}" ry="${height * 0.2}" fill="${color.primary}"/>`,
    `<ellipse cx="${width * 0.4 + offset}" cy="${height * 0.5}" rx="${width * 0.08}" ry="${height * 0.05}" fill="${color.accent}"/>`,
    `<circle cx="${width / 2 - 5 + offset}" cy="${height * 0.58}" r="2" fill="${color.text}"/>`,
    `<circle cx="${width / 2 + 5 + offset}" cy="${height * 0.58}" r="2" fill="${color.text}"/>`,
  ].join('');
}

function gemShape(width, height) {
  return [
    `<polygon class="faceted-gem" points="${width / 2},2 ${width - 4},${height * 0.38} ${width * 0.68},${height - 3} ${width * 0.32},${height - 3} 4,${height * 0.38}" fill="#38bdf8"/>`,
    `<polygon points="${width / 2},2 ${width - 4},${height * 0.38} ${width * 0.62},${height * 0.4}" fill="#93f3ff"/>`,
    `<polygon points="4,${height * 0.38} ${width * 0.38},${height * 0.4} ${width * 0.32},${height - 3}" fill="#0ea5e9"/>`,
    `<polygon points="${width * 0.38},${height * 0.4} ${width * 0.62},${height * 0.4} ${width * 0.5},${height - 3}" fill="#0284c7"/>`,
    `<polygon points="${width * 0.28},${height * 0.28} ${width * 0.42},${height * 0.18} ${width * 0.38},${height * 0.34}" fill="#ffffff"/>`,
  ].join('');
}

function heartShape(width, height) {
  return `<path class="heart-icon" d="M ${width / 2} ${height - 5} L ${width * 0.22} ${height * 0.55} C ${width * 0.02} ${height * 0.32}, ${width * 0.22} ${height * 0.08}, ${width / 2} ${height * 0.3} C ${width * 0.78} ${height * 0.08}, ${width * 0.98} ${height * 0.32}, ${width * 0.78} ${height * 0.55} Z" fill="#ef4444"/><path d="M ${width * 0.28} ${height * 0.28} C ${width * 0.36} ${height * 0.18}, ${width * 0.45} ${height * 0.24}, ${width * 0.42} ${height * 0.34}" fill="#fecaca"/>`;
}

function grassTileShape(width, height) {
  const blades = [];
  for (let x = 2; x < width; x += 6) {
    blades.push(`<path d="M ${x} ${height} L ${x + 2} ${height - 8} L ${x + 4} ${height}" stroke="#65a30d" stroke-width="2" fill="none"/>`);
  }
  return [`<rect x="0" y="${height - 4}" width="${width}" height="4" fill="#166534"/>`, ...blades, `<path d="M0 ${height * 0.55} H${width}" stroke="#22c55e" stroke-width="2"/>`].join('');
}

function woodenHouseShape(width, height) {
  return [
    `<polygon points="${width * 0.16},${height * 0.42} ${width * 0.5},${height * 0.14} ${width * 0.84},${height * 0.42}" fill="#7c2d12"/>`,
    `<rect x="${width * 0.24}" y="${height * 0.4}" width="${width * 0.52}" height="${height * 0.42}" fill="#b45309"/>`,
    `<rect x="${width * 0.44}" y="${height * 0.58}" width="${width * 0.14}" height="${height * 0.24}" fill="#422006"/>`,
    `<rect x="${width * 0.28}" y="${height * 0.5}" width="${width * 0.12}" height="${height * 0.1}" fill="#93c5fd"/>`,
    `<rect x="${width * 0.61}" y="${height * 0.5}" width="${width * 0.12}" height="${height * 0.1}" fill="#fde68a"/>`,
    `<path d="M ${width * 0.18} ${height * 0.82} H ${width * 0.82}" stroke="#65a30d" stroke-width="3"/>`,
  ].join('');
}

function styleColor(style) {
  if (style === 'dark') return { primary: '#4c0519', accent: '#fb7185', text: '#f8fafc' };
  if (style === 'sci-fi') return { primary: '#155e75', accent: '#67e8f9', text: '#0f172a' };
  if (style === 'chinese') return { primary: '#991b1b', accent: '#fbbf24', text: '#111827' };
  return { primary: '#1d4ed8', accent: '#60a5fa', text: '#111827' };
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

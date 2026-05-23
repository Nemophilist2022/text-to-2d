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
    `<svg xmlns="http://www.w3.org/2000/svg" class="codex-local ${escapeXml(packet.style)} ${escapeXml(packet.subject)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="none"/>`,
    subjectGlyph,
    `<text x="50%" y="${height - 5}" text-anchor="middle" font-size="7" fill="${color.text}">${escapeXml(frameId)}</text>`,
    `<desc>${escapeXml(packet.prompt)}</desc>`,
    `</svg>`,
  ].join('');
}

function subjectShape(subject, width, height, offset, color) {
  if (subject === 'slime') {
    return `<ellipse cx="${width / 2 + offset}" cy="${height * 0.62}" rx="${width * 0.28}" ry="${height * 0.18}" fill="${color.primary}"/><circle cx="${width / 2 - 5 + offset}" cy="${height * 0.58}" r="2" fill="${color.text}"/><circle cx="${width / 2 + 5 + offset}" cy="${height * 0.58}" r="2" fill="${color.text}"/>`;
  }
  if (subject === 'energy-core') {
    return `<polygon points="${width / 2},${height * 0.2} ${width * 0.72},${height / 2} ${width / 2},${height * 0.8} ${width * 0.28},${height / 2}" fill="${color.primary}"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.max(4, width * 0.12)}" fill="${color.accent}"/>`;
  }
  return `<rect x="${width * 0.35 + offset}" y="${height * 0.34}" width="${width * 0.3}" height="${height * 0.38}" rx="3" fill="${color.primary}"/><circle cx="${width / 2 + offset}" cy="${height * 0.28}" r="${Math.max(6, width * 0.12)}" fill="${color.accent}"/><path d="M ${width * 0.64 + offset} ${height * 0.42} L ${width * 0.85 + offset} ${height * 0.2}" stroke="${color.text}" stroke-width="3"/>`;
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

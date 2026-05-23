import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSvgQuality } from '../quality/svg-quality-gate.mjs';

export function createChatSvgBackend({ config = loadChatSvgConfig(), fetchImpl = globalThis.fetch } = {}) {
  return {
    backendId: 'chat-svg',
    version: config.model ?? 'gpt-5.5',
    async generate(input) {
      const packet = input.packet ?? input.request?.generationPacket;
      if (!packet) throw new Error('chat-svg backend requires a GenerationPacket');
      if (!config.apiKey) throw new Error('CHAT_API_KEY or IMAGE_API_KEY is required for chat-svg backend');
      if (!fetchImpl) throw new Error('fetch is required for chat-svg backend');

      const response = await fetchImpl(`${config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: buildMessages(packet),
        }),
      });

      if (!response.ok) {
        const body = typeof response.text === 'function' ? await response.text() : '';
        throw new Error(`chat-svg request failed: HTTP ${response.status ?? 'unknown'} ${body}`.trim());
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('chat-svg response missing choices[0].message.content');
      const parsed = parseFrameJson(content);
      const qualityReports = [];

      const frames = packet.frameLabels.map((frameId, order) => {
        const frame = parsed.frames.find((candidate) => candidate.frameId === frameId);
        if (!frame?.svg) throw new Error(`chat-svg response missing svg for frame: ${frameId}`);
        const content = normalizeSvg(frame.svg, packet.size);
        const qualityReport = validateSvgQuality({ svg: content, packet, frameId });
        qualityReports.push(qualityReport);
        if (!qualityReport.passed) {
          throw new Error(`chat-svg quality gate failed for ${frameId}: ${qualityReport.errors.join('; ')}`);
        }
        return {
          frameId,
          order,
          fileName: `${frameId}.svg`,
          mediaType: 'image/svg+xml',
          content,
        };
      });

      return {
        backendId: 'chat-svg',
        backendVersion: config.model,
        frames,
        metadata: {
          source: 'chat-svg-backend',
          model: config.model,
          requestId: packet.requestId,
          prompt: packet.prompt,
          promptSections: packet.promptSections,
          outputContract: packet.outputContract,
          qualityReports,
        },
      };
    },
  };
}

export function loadChatSvgConfig(env = { ...loadLocalEnv(), ...process.env }) {
  return {
    baseUrl: trimTrailingSlash(env.CHAT_API_BASE_URL ?? env.IMAGE_API_BASE_URL ?? 'https://api.vip1129.cc/'),
    apiKey: env.CHAT_API_KEY ?? env.IMAGE_API_KEY,
    model: env.CHAT_API_MODEL ?? 'gpt-5.5',
  };
}

function buildMessages(packet) {
  return [
    {
      role: 'system',
      content: [
        'You generate SVG assets for 2D games.',
        'Return strict JSON only. No markdown.',
        'Schema: {"frames":[{"frameId":"idle_0","svg":"<svg ...>...</svg>"}]}',
        'Each SVG must be self-contained, valid, use transparent background, fit the requested size, and set shape-rendering="crispEdges" on the SVG root.',
        'Do not draw full-canvas solid background rectangles or black occluder blocks.',
        'Follow the supplied concept, promptSections, and qualityContract.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate 2D game asset SVG frames.',
        concept: packet.concept,
        presetId: packet.presetId,
        prompt: packet.prompt,
        promptSections: packet.promptSections,
        negativePrompt: packet.negativePrompt,
        qualityContract: packet.qualityContract,
        assetType: packet.assetType,
        subject: packet.subject,
        visualArchetype: packet.visualArchetype,
        silhouette: packet.silhouette,
        requiredDetails: packet.requiredDetails,
        forbidden: packet.forbidden,
        style: packet.style,
        size: packet.size,
        frameLabels: packet.frameLabels,
        outputContract: packet.outputContract,
      }),
    },
  ];
}

function parseFrameJson(content) {
  const trimmed = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(trimmed);
}

function normalizeSvg(svg, size) {
  if (!svg.includes('<svg')) return svg;
  if (svg.includes('width=') && svg.includes('height=')) return svg;
  return svg.replace('<svg ', `<svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" `);
}

function loadLocalEnv() {
  const path = resolve('.env.local');
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), stripQuotes(line.slice(index + 1))];
      }),
  );
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, '');
}

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

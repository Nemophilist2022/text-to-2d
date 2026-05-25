import { mergeLocalEnv, trimTrailingSlash } from '../config/env.mjs';

const CHAT_COMPLETIONS_PROTOCOL = 'chat-completions';
const IMAGES_GENERATIONS_PROTOCOL = 'images-generations';

export function createImageApiBackend({ config = loadImageApiConfig(), fetchImpl = globalThis.fetch } = {}) {
  return {
    backendId: 'image-api',
    version: config.model ?? 'image-api',
    async generate(input) {
      const packet = input.packet ?? input.request?.generationPacket;
      if (!packet) throw new Error('image-api backend requires a GenerationPacket');
      if (!config.apiKey) throw new Error('IMAGE_API_KEY is required for image-api backend');
      if (!fetchImpl) throw new Error('fetch is required for image-api backend');

      const frames = [];
      for (const [order, frameId] of packet.frameLabels.entries()) {
        const prompt = buildImagePrompt(packet, { order, frameId });
        const apiImage = await requestImage({ config, fetchImpl, prompt });
        const href = await materializeImageHref({ href: apiImage.href, fetchImpl });
        frames.push({
          frameId,
          order,
          fileName: `${frameId}.svg`,
          mediaType: 'image/svg+xml',
          content: wrapApiImageAsSvg({
            href,
            width: packet.size.width,
            height: packet.size.height,
            prompt,
          }),
        });
      }

      return {
        backendId: 'image-api',
        backendVersion: config.model,
        frames,
        metadata: {
          source: 'image-api-backend',
          requestId: packet.requestId,
          model: config.model,
          baseUrl: config.baseUrl,
          endpointProtocol: config.endpointProtocol,
          outputContract: packet.outputContract,
        },
      };
    },
  };
}

export function loadImageApiConfig(env = mergeLocalEnv()) {
  return {
    baseUrl: trimTrailingSlash(env.IMAGE_API_BASE_URL ?? 'http://216.234.142.96:3000'),
    apiKey: env.IMAGE_API_KEY,
    model: env.IMAGE_API_MODEL ?? 'gpt-image-2',
    endpointProtocol: env.IMAGE_API_ENDPOINT_PROTOCOL ?? CHAT_COMPLETIONS_PROTOCOL,
    requestSize: env.IMAGE_API_REQUEST_SIZE ?? '1024x1024',
  };
}

async function requestImage({ config, fetchImpl, prompt }) {
  if (config.endpointProtocol === CHAT_COMPLETIONS_PROTOCOL) {
    return requestImageViaChatCompletions({ config, fetchImpl, prompt });
  }
  if (config.endpointProtocol === IMAGES_GENERATIONS_PROTOCOL) {
    return requestImageViaImagesGenerations({ config, fetchImpl, prompt });
  }
  throw new Error(`Unsupported IMAGE_API_ENDPOINT_PROTOCOL: ${config.endpointProtocol}`);
}

async function requestImageViaChatCompletions({ config, fetchImpl, prompt }) {
  const response = await fetchImpl(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`image-api request failed: HTTP ${response.status ?? 'unknown'} ${body}`.trim());
  }

  const json = await response.json();
  return extractImageFromChatCompletions(json);
}

async function requestImageViaImagesGenerations({ config, fetchImpl, prompt }) {
  const response = await fetchImpl(`${config.baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      n: 1,
      size: config.requestSize,
    }),
  });

  if (!response.ok) {
    const body = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`image-api request failed: HTTP ${response.status ?? 'unknown'} ${body}`.trim());
  }

  const json = await response.json();
  return extractImageFromImageData(json.data?.[0], 'image-api response missing data[0]');
}

function extractImageFromChatCompletions(json) {
  const message = json.choices?.[0]?.message;
  if (!message) throw new Error('image-api chat response missing choices[0].message');

  const imageFromMessage = extractImageFromImageData(message.images?.[0]);
  if (imageFromMessage) return imageFromMessage;

  const content = message.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const image = extractImageFromContentPart(part);
      if (image) return image;
    }
  }

  if (typeof content === 'string') {
    const image = extractImageFromText(content);
    if (image) return image;
  }

  throw new Error('image-api chat response missing image url or b64_json');
}

function extractImageFromContentPart(part) {
  if (!part || typeof part !== 'object') return null;
  if (part.type === 'image_url') return extractImageFromImageData(part.image_url ?? part);
  if (part.type === 'output_image' || part.type === 'image') return extractImageFromImageData(part);
  return extractImageFromImageData(part);
}

function extractImageFromText(content) {
  const trimmed = content.trim();
  const jsonImage = tryExtractImageFromJson(trimmed);
  if (jsonImage) return jsonImage;

  const dataUrl = trimmed.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
  if (dataUrl) return { href: dataUrl[0] };

  const markdownUrl = trimmed.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (markdownUrl) return { href: markdownUrl[1] };

  const url = trimmed.match(/https?:\/\/\S+/);
  if (url) return { href: url[0].replace(/[),.]+$/, '') };

  return null;
}

function tryExtractImageFromJson(value) {
  try {
    const parsed = JSON.parse(value);
    if (parsed.data?.[0]) return extractImageFromImageData(parsed.data[0]);
    if (parsed.images?.[0]) return extractImageFromImageData(parsed.images[0]);
    if (parsed.url || parsed.b64_json || parsed.image_url) return extractImageFromImageData(parsed);
  } catch {
    return null;
  }
  return null;
}

function extractImageFromImageData(value, missingMessage = null) {
  if (!value) {
    if (missingMessage) throw new Error(missingMessage);
    return null;
  }
  if (typeof value === 'string') return { href: value };
  if (value.b64_json) return { href: `data:image/png;base64,${value.b64_json}` };
  if (value.url) return { href: value.url };
  if (value.image_url?.url) return { href: value.image_url.url };
  if (value.image_url && typeof value.image_url === 'string') return { href: value.image_url };
  return null;
}

function wrapApiImageAsSvg({ href, width, height, prompt }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="image-api" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">`,
    `<rect width="100%" height="100%" fill="none"/>`,
    `<image href="${escapeXml(href)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`,
    `<desc>${escapeXml(prompt)}</desc>`,
    `</svg>`,
  ].join('');
}

function buildImagePrompt(packet, { order, frameId }) {
  const sectionText = (packet.promptSections ?? [])
    .filter((section) => section.id !== 'global-output')
    .flatMap((section) => section.rules ?? [])
    .join(' ');
  return [
    `Generate a ${packet.size.width}x${packet.size.height} 2D game asset image.`,
    packet.sourceText ? `User request: ${packet.sourceText}.` : '',
    `Asset type: ${packet.assetType}. Subject: ${packet.subject}. Visual archetype: ${packet.visualArchetype}.`,
    `Style: ${packet.style}.`,
    sectionText,
    'Single clear asset only. Centered in frame. No text labels. No UI mockup. No document icon. No paper sheet.',
    'Do not render SVG code, browser screenshots, canvas frames, or editor UI.',
    `Frame ${order + 1}/${packet.frameCount}. Frame label: ${frameId}.`,
    `Negative prompt: ${packet.negativePrompt}.`,
  ].filter(Boolean).join(' ');
}

async function materializeImageHref({ href, fetchImpl }) {
  if (!String(href).startsWith('http://') && !String(href).startsWith('https://')) return href;
  try {
    const response = await fetchImpl(href);
    if (!response.ok || typeof response.arrayBuffer !== 'function') return href;
    const contentType = response.headers?.get?.('content-type') ?? 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return href;
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

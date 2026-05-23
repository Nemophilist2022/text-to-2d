import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
        const prompt = `${packet.prompt}, frame ${order + 1}/${packet.frameCount}, frame label ${frameId}`;
        const apiImage = await requestImage({ config, fetchImpl, prompt });
        frames.push({
          frameId,
          order,
          fileName: `${frameId}.svg`,
          mediaType: 'image/svg+xml',
          content: wrapApiImageAsSvg({
            href: apiImage.href,
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
          outputContract: packet.outputContract,
        },
      };
    },
  };
}

export function loadImageApiConfig(env = { ...loadLocalEnv(), ...process.env }) {
  return {
    baseUrl: trimTrailingSlash(env.IMAGE_API_BASE_URL ?? 'https://api.vip1129.cc/'),
    apiKey: env.IMAGE_API_KEY,
    model: env.IMAGE_API_MODEL ?? 'image2',
    requestSize: env.IMAGE_API_REQUEST_SIZE ?? '1024x1024',
  };
}

async function requestImage({ config, fetchImpl, prompt }) {
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
  const first = json.data?.[0];
  if (!first) throw new Error('image-api response missing data[0]');
  if (first.b64_json) return { href: `data:image/png;base64,${first.b64_json}` };
  if (first.url) return { href: first.url };
  throw new Error('image-api response missing b64_json or url');
}

function wrapApiImageAsSvg({ href, width, height, prompt }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="image-api" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<image href="${escapeXml(href)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`,
    `<desc>${escapeXml(prompt)}</desc>`,
    `</svg>`,
  ].join('');
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

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

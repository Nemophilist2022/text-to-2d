import { extname, resolve, sep } from 'node:path';

export const BODY_LIMIT_BYTES = 64 * 1024;

export function sendJson(response, statusCode, body) {
  return send(response, statusCode, `${JSON.stringify(body, null, 2)}\n`, 'application/json; charset=utf-8');
}

export function sendText(response, statusCode, text, type = 'text/plain; charset=utf-8') {
  return send(response, statusCode, text, type);
}

export function send(response, statusCode, body, type) {
  response.writeHead(statusCode, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(body);
}

export async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT_BYTES) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw.trim() ? JSON.parse(raw) : {};
}

export function safeResolve(root, pathname) {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, `.${pathname}`);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${sep}`)) return null;
  return resolvedPath;
}

export function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}

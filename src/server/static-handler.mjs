import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { contentType, safeResolve, send, sendText } from './http-utils.mjs';

export async function serveUiFile({ request, response, uiRoot, pathname }) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = safeResolve(uiRoot, requestedPath);
  if (!filePath || !existsSync(filePath)) {
    return sendText(response, 404, 'Not found');
  }
  const content = request.method === 'HEAD' ? '' : await readFile(filePath);
  return send(response, 200, content, contentType(filePath));
}

export async function serveWorkspaceFile({ response, workspace, pathname }) {
  const outputPath = decodeURIComponent(pathname.replace(/^\/outputs\//, ''));
  const filePath = safeResolve(workspace, `/${outputPath}`);
  if (!filePath || !existsSync(filePath)) {
    return sendText(response, 404, 'Not found');
  }
  return send(response, 200, await readFile(filePath), contentType(filePath));
}

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { cwd, argv } from 'node:process';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAssetJob } from '../core/orchestrator.mjs';
import { createPrebuiltBackend } from '../backends/prebuilt-backend.mjs';
import { createMockAiBackend } from '../backends/mock-ai-backend.mjs';
import { createCodexLocalBackend } from '../backends/codex-local-backend.mjs';
import { createImageApiBackend } from '../backends/image-api-backend.mjs';
import { createChatSvgBackend } from '../backends/chat-svg-backend.mjs';
import { buildAssetRequestFromRecipe, compileAssetRecipe } from '../input/asset-recipe.mjs';

const DEFAULT_BACKEND_ID = 'codex-local';
const BODY_LIMIT_BYTES = 64 * 1024;
const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultUiRoot = resolve(__dirname, '..', '..', 'ui');

export function createWorkbenchServer({
  workspace = join(cwd(), 'demo-workspace-web'),
  uiRoot = defaultUiRoot,
  defaultBackendId = DEFAULT_BACKEND_ID,
} = {}) {
  const resolvedWorkspace = resolve(workspace);
  const resolvedUiRoot = resolve(uiRoot);
  const backends = createBackends();

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/health') {
        return sendJson(response, 200, {
          status: 'ok',
          defaultBackendId,
          backends: Object.keys(backends),
          workspace: resolvedWorkspace,
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/generate') {
        return handleGenerate({ request, response, workspace: resolvedWorkspace, defaultBackendId, backends });
      }

      if (request.method === 'GET' && url.pathname.startsWith('/outputs/')) {
        return serveWorkspaceFile({ response, workspace: resolvedWorkspace, pathname: url.pathname });
      }

      if (request.method === 'GET' || request.method === 'HEAD') {
        return serveUiFile({ request, response, uiRoot: resolvedUiRoot, pathname: url.pathname });
      }

      return sendJson(response, 405, { status: 'failed', error: { message: 'Method not allowed' } });
    } catch (error) {
      return sendJson(response, 500, {
        status: 'failed',
        error: { message: error.message },
        fallbackBackendId: defaultBackendId,
      });
    }
  });
}

async function handleGenerate({ request, response, workspace, defaultBackendId, backends }) {
  const body = await readJsonBody(request);
  const backendId = String(body.backendId || defaultBackendId);

  if (!backends[backendId]) {
    return sendJson(response, 400, {
      status: 'failed',
      error: { message: `Backend not found: ${backendId}` },
      fallbackBackendId: defaultBackendId,
    });
  }

  try {
    const selections = {
      assetType: body.assetType || 'character',
      style: body.style || 'pixel',
      size: body.size || '64x64',
    };
    const recipe = compileAssetRecipe({ text: body.text || '', selections });
    const assetRequest = buildAssetRequestFromRecipe(recipe, { backendId });
    const result = await runAssetJob({
      ...assetRequest,
      forceRegenerate: Boolean(body.forceRegenerate),
    }, { workspace, backends });

    if (result.status !== 'success') {
      return sendJson(response, 400, {
        status: 'failed',
        error: result.errors?.[0] ?? { message: 'Generation failed' },
        fallbackBackendId: defaultBackendId,
      });
    }

    const runMetadata = JSON.parse(await readFile(result.metadataRef, 'utf8'));
    return sendJson(response, 200, {
      status: 'success',
      assetId: assetRequest.assetId,
      assetType: assetRequest.assetType,
      cacheStatus: result.cacheStatus,
      cacheKey: result.cacheKey,
      backendId: result.backendId,
      recipe,
      generationPacket: assetRequest.generationPacket,
      qualityReports: runMetadata.qualityReports ?? [],
      outputRefs: result.exportRefs,
      outputUrls: buildOutputUrls(workspace, result.exportRefs),
      events: result.events,
    });
  } catch (error) {
    return sendJson(response, 502, {
      status: 'failed',
      error: { message: error.message },
      fallbackBackendId: defaultBackendId,
    });
  }
}

function createBackends() {
  return {
    prebuilt: createPrebuiltBackend(),
    'mock-ai': createMockAiBackend(),
    'codex-local': createCodexLocalBackend(),
    'image-api': createImageApiBackend(),
    'chat-svg': createChatSvgBackend(),
  };
}

function buildOutputUrls(workspace, refs) {
  const frames = refs.frames.map((filePath) => toOutputUrl(workspace, filePath));
  return {
    frames,
    frame: frames[0] ?? null,
    spritesheet: toOutputUrl(workspace, refs.spritesheet),
    atlas: toOutputUrl(workspace, refs.atlas),
    run: toOutputUrl(workspace, refs.run),
  };
}

function toOutputUrl(workspace, filePath) {
  const relativePath = relative(workspace, filePath);
  return `/outputs/${relativePath.split(sep).map(encodeURIComponent).join('/')}`;
}

async function readJsonBody(request) {
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

async function serveUiFile({ request, response, uiRoot, pathname }) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = safeResolve(uiRoot, requestedPath);
  if (!filePath || !existsSync(filePath)) {
    return sendText(response, 404, 'Not found', 'text/plain; charset=utf-8');
  }
  const content = request.method === 'HEAD' ? '' : await readFile(filePath);
  return send(response, 200, content, contentType(filePath));
}

async function serveWorkspaceFile({ response, workspace, pathname }) {
  const outputPath = decodeURIComponent(pathname.replace(/^\/outputs\//, ''));
  const filePath = safeResolve(workspace, `/${outputPath}`);
  if (!filePath || !existsSync(filePath)) {
    return sendText(response, 404, 'Not found', 'text/plain; charset=utf-8');
  }
  return send(response, 200, await readFile(filePath), contentType(filePath));
}

function safeResolve(root, pathname) {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, `.${pathname}`);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${sep}`)) return null;
  return resolvedPath;
}

function sendJson(response, statusCode, body) {
  return send(response, statusCode, `${JSON.stringify(body, null, 2)}\n`, 'application/json; charset=utf-8');
}

function sendText(response, statusCode, text, type) {
  return send(response, statusCode, text, type);
}

function send(response, statusCode, body, type) {
  response.writeHead(statusCode, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(body);
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}

export function resolveServerOptions(args = argv) {
  const workspaceIndex = args.indexOf('--workspace');
  const portIndex = args.indexOf('--port');
  const backendIndex = args.indexOf('--backend');
  return {
    workspace: workspaceIndex === -1 ? join(cwd(), 'demo-workspace-web') : args[workspaceIndex + 1],
    port: portIndex === -1 ? 8787 : Number(args[portIndex + 1]),
    defaultBackendId: backendIndex === -1 ? DEFAULT_BACKEND_ID : args[backendIndex + 1],
  };
}

export function isDirectRun(importMetaUrl, argvPath) {
  return Boolean(argvPath) && fileURLToPath(importMetaUrl) === resolve(argvPath);
}

if (isDirectRun(import.meta.url, argv[1])) {
  const options = resolveServerOptions(argv);
  const server = createWorkbenchServer(options);
  server.listen(options.port, '127.0.0.1', () => {
    console.log(`Text-to-2D workbench: http://127.0.0.1:${options.port}`);
    console.log(`Workspace: ${resolve(options.workspace)}`);
    console.log(`Default backend: ${options.defaultBackendId}`);
  });
}

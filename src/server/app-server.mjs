import { createServer } from 'node:http';
import { cwd, argv } from 'node:process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBackendRegistry } from '../backends/registry.mjs';
import { handleGenerate } from './generate-handler.mjs';
import { serveUiFile, serveWorkspaceFile } from './static-handler.mjs';
import { sendJson } from './http-utils.mjs';

const DEFAULT_BACKEND_ID = 'codex-local';
const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultUiRoot = resolve(__dirname, '..', '..', 'ui');

export function createWorkbenchServer({
  workspace = join(cwd(), 'demo-workspace-web'),
  uiRoot = defaultUiRoot,
  defaultBackendId = DEFAULT_BACKEND_ID,
} = {}) {
  const resolvedWorkspace = resolve(workspace);
  const resolvedUiRoot = resolve(uiRoot);
  const backends = createBackendRegistry();

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

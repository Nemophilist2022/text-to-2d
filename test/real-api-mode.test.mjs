import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveServerOptions } from '../src/server/app-server.mjs';

test('server cli can start the workbench in real chat-svg api mode', () => {
  const options = resolveServerOptions([
    'node',
    'src/server/app-server.mjs',
    '--workspace',
    'demo-workspace-real-api',
    '--port',
    '8787',
    '--backend',
    'chat-svg',
  ]);

  assert.equal(options.workspace, 'demo-workspace-real-api');
  assert.equal(options.port, 8787);
  assert.equal(options.defaultBackendId, 'chat-svg');
});

test('ui reads server health so selected backend follows real api server mode', async () => {
  const root = process.cwd();
  const js = await readFile(join(root, 'ui', 'app.js'), 'utf8');
  const html = await readFile(join(root, 'ui', 'index.html'), 'utf8');

  assert.match(js, /fetch\('\/api\/health'/);
  assert.match(js, /defaultBackendId/);
  assert.match(js, /applyServerConfig/);
  assert.match(html, /chat-svg/);
  assert.match(html, /image-api/);
  assert.match(html, /auto-detect/);
  assert.match(html, /environment/);
});

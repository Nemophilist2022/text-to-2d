import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { runAssetJob } from '../core/orchestrator.mjs';
import { createPrebuiltBackend } from '../backends/prebuilt-backend.mjs';
import { demoRequest } from './demo-request.mjs';

export async function runDemo({ workspace = cwd() } = {}) {
  const options = {
    workspace,
    backends: {
      prebuilt: createPrebuiltBackend(),
    },
  };

  const first = await runAssetJob(demoRequest, options);
  const second = await runAssetJob(demoRequest, options);

  return { first, second };
}

export function isDirectRun(importMetaUrl, argvPath) {
  if (!argvPath) return false;
  return fileURLToPath(importMetaUrl) === resolve(argvPath);
}

export function resolveCliOptions(argv) {
  const workspaceFlagIndex = argv.indexOf('--workspace');
  if (workspaceFlagIndex === -1) return { workspace: cwd() };
  return { workspace: argv[workspaceFlagIndex + 1] };
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  const result = await runDemo(resolveCliOptions(process.argv));
  console.log(JSON.stringify({
    first: {
      status: result.first.status,
      cacheStatus: result.first.cacheStatus,
      exportRefs: result.first.exportRefs,
      metadataRef: result.first.metadataRef,
      events: result.first.events,
    },
    second: {
      status: result.second.status,
      cacheStatus: result.second.cacheStatus,
      exportRefs: result.second.exportRefs,
      metadataRef: result.second.metadataRef,
      events: result.second.events,
    },
  }, null, 2));
}

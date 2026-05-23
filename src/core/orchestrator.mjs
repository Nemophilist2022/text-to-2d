import { readFile } from 'node:fs/promises';

import { createCacheKey } from '../cache/cache-key.mjs';
import { CacheStore } from '../cache/cache-store.mjs';
import { runPostprocess } from '../postprocess/pipeline.mjs';
import { exportImageDirectory } from '../export/image-directory-exporter.mjs';

export async function runAssetJob(request, options) {
  const events = [];
  const workspace = options.workspace;
  const backend = options.backends?.[request.backendId];

  if (!backend) {
    return {
      status: 'failed',
      cacheStatus: 'none',
      backendId: request.backendId,
      events,
      exportRefs: [],
      errors: [{ message: `Backend not found: ${request.backendId}` }],
    };
  }

  const cache = new CacheStore(workspace);
  const cacheKey = createCacheKey(request, backend);
  const cacheHit = !request.forceRegenerate && cache.hasProcessed(cacheKey);
  const cacheStatus = request.forceRegenerate ? 'bypassed' : cacheHit ? 'hit' : 'miss';

  let rawAssetRef = cache.paths(cacheKey).raw;
  let processedAssetRef = cache.paths(cacheKey).processed;
  let processedContent;

  if (cacheHit) {
    events.push('cache.hit');
    processedContent = await cache.readProcessed(cacheKey);
  } else {
    events.push(request.forceRegenerate ? 'cache.bypassed' : 'cache.miss');

    const generated = await backend.generate({ request });
    events.push('backend.generate');
    rawAssetRef = await cache.writeRaw(cacheKey, generated);

    const rawContent = await readFile(rawAssetRef, 'utf8');
    processedContent = await runPostprocess(rawContent, request.postprocessSpec);
    events.push('postprocess.copy');
    processedAssetRef = await cache.writeProcessed(cacheKey, processedContent);

    await cache.writeMetadata(cacheKey, {
      assetId: request.assetId,
      cacheKey,
      backendId: backend.backendId,
      generatedMetadata: generated.metadata,
      processedAssetRef,
    });
  }

  const resultMetadata = {
    assetId: request.assetId,
    cacheKey,
    cacheStatus,
    backendId: backend.backendId,
    rawAssetRef,
    processedAssetRef,
    exportRefs: [],
    events,
  };

  const exported = await exportImageDirectory({
    workspace,
    request,
    processedContent,
    resultMetadata,
  });
  events.push('export.write');

  resultMetadata.exportRefs = exported.exportRefs;
  resultMetadata.events = events;
  await exportImageDirectory({
    workspace,
    request,
    processedContent,
    resultMetadata,
  });

  return {
    status: 'success',
    cacheStatus,
    backendId: backend.backendId,
    cacheKey,
    rawAssetRef,
    processedAssetRef,
    exportRefs: exported.exportRefs,
    metadataRef: exported.metadataRef,
    events,
    errors: [],
  };
}

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
      exportRefs: { frames: [] },
      errors: [{ message: `Backend not found: ${request.backendId}` }],
    };
  }

  const cache = new CacheStore(workspace);
  const cacheKey = createCacheKey(request, backend);
  const cacheHit = !request.forceRegenerate && cache.hasProcessed(cacheKey);
  const cacheStatus = request.forceRegenerate ? 'bypassed' : cacheHit ? 'hit' : 'miss';

  let rawAssetRef = cache.paths(cacheKey).rawRoot;
  let processedAssetRef = cache.paths(cacheKey).processedRoot;
  let processedManifest;

  if (cacheHit) {
    events.push('cache.hit');
    processedManifest = await cache.readProcessed(cacheKey);
  } else {
    events.push(request.forceRegenerate ? 'cache.bypassed' : 'cache.miss');

    const generated = await backend.generate({ request });
    events.push('backend.generate');
    const rawManifest = await cache.writeRaw(cacheKey, generated);

    processedManifest = await runPostprocess(rawManifest, request.postprocessSpec, request);
    events.push('postprocess.frames');
    processedManifest = await cache.writeProcessed(cacheKey, processedManifest);
  }

  const resultMetadata = {
    assetId: request.assetId,
    variantId: request.variantId,
    cacheKey,
    cacheStatus,
    backendId: backend.backendId,
    backendVersion: backend.version,
    postprocessVersion: request.postprocessSpec?.version ?? 'none',
    exportVersion: request.exportSpec?.version ?? 'none',
    rawAssetRef,
    processedAssetRef,
    outputFiles: {},
    events,
  };

  events.push('export.write');
  const exported = await exportImageDirectory({
    workspace,
    request,
    processedManifest,
    resultMetadata,
    cacheExportDir: cache.paths(cacheKey).exportRoot,
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

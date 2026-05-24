import { dirname, relative, resolve } from 'node:path';
import { cwd } from 'node:process';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { runAssetJob } from '../core/orchestrator.mjs';
import { createCodexLocalBackend } from '../backends/codex-local-backend.mjs';
import { createChatSvgBackend } from '../backends/chat-svg-backend.mjs';
import { createMockAiBackend } from '../backends/mock-ai-backend.mjs';
import { createPrebuiltBackend } from '../backends/prebuilt-backend.mjs';
import { buildAssetRequestFromRecipe, compileAssetRecipe } from '../input/asset-recipe.mjs';

export const DEMO_GALLERY_CASES = [
  { id: 'knight', text: '生成一个像素风骑士角色', selections: { assetType: 'character', style: 'pixel', size: '64x64' } },
  { id: 'slime', text: '生成一个像素风史莱姆怪物', selections: { assetType: 'monster', style: 'pixel', size: '64x64' } },
  { id: 'gem', text: '生成一个像素风宝石道具', selections: { assetType: 'item', style: 'pixel', size: '32x32' } },
  { id: 'grass', text: '草地地图块', selections: { assetType: 'map-tile', style: 'pixel', size: '32x32' } },
  { id: 'heart', text: '红心 UI 图标', selections: { assetType: 'ui-icon', style: 'pixel', size: '32x32' } },
];

export async function buildDemoGallery({
  workspace = resolve(cwd(), 'ui', 'sample-gallery'),
  manifestPath = resolve(cwd(), 'ui', 'demo-gallery.json'),
  backendId = 'codex-local',
} = {}) {
  const manifestDir = dirname(manifestPath);
  const backends = {
    prebuilt: createPrebuiltBackend(),
    'mock-ai': createMockAiBackend(),
    'codex-local': createCodexLocalBackend(),
    'chat-svg': createChatSvgBackend(),
  };
  const assets = [];

  for (const demoCase of DEMO_GALLERY_CASES) {
    const recipe = compileAssetRecipe({ text: demoCase.text, selections: demoCase.selections });
    const request = buildAssetRequestFromRecipe(recipe, { backendId });
    const result = await runAssetJob(request, { workspace, backends });
    const runMetadata = JSON.parse(await readFile(result.metadataRef, 'utf8'));

    assets.push({
      id: demoCase.id,
      text: demoCase.text,
      assetId: recipe.assetId,
      assetType: recipe.assetType,
      subject: recipe.subject,
      style: recipe.style,
      size: recipe.size,
      backendId,
      cacheStatus: result.cacheStatus,
      presetId: recipe.presetId,
      concept: recipe.concept,
      prompt: request.generationPacket.prompt,
      promptSections: request.generationPacket.promptSections,
      qualityReports: runMetadata.qualityReports ?? [],
      paths: {
        frame: slash(relative(manifestDir, result.exportRefs.frames[0])),
        spritesheet: slash(relative(manifestDir, result.exportRefs.spritesheet)),
        atlas: slash(relative(manifestDir, result.exportRefs.atlas)),
        run: slash(relative(manifestDir, result.exportRefs.run)),
      },
    });
  }

  const gallery = {
    version: 'demo-gallery-1',
    generatedAt: new Date().toISOString(),
    backendId,
    assets,
  };
  await mkdir(manifestDir, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(gallery, null, 2)}\n`, 'utf8');
  return gallery;
}

export function isDirectRun(importMetaUrl, argvPath) {
  if (!argvPath) return false;
  return fileURLToPath(importMetaUrl) === resolve(argvPath);
}

export function resolveGalleryCliOptions(argv) {
  return {
    workspace: valueAfter(argv, '--workspace') ?? resolve(cwd(), 'ui', 'sample-gallery'),
    manifestPath: valueAfter(argv, '--manifest') ?? resolve(cwd(), 'ui', 'demo-gallery.json'),
    backendId: valueAfter(argv, '--backend') ?? 'codex-local',
  };
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
}

function slash(path) {
  return path.replaceAll('\\', '/');
}

if (isDirectRun(import.meta.url, process.argv[1])) {
  const gallery = await buildDemoGallery(resolveGalleryCliOptions(process.argv));
  console.log(JSON.stringify({ manifest: resolveGalleryCliOptions(process.argv).manifestPath, assets: gallery.assets.length }, null, 2));
}

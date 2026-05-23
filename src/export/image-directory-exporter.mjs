import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function exportImageDirectory({ workspace, request, processedManifest, resultMetadata, cacheExportDir }) {
  const exportDir = join(workspace, 'exports', safeName(request.assetId));
  const framesDir = join(exportDir, 'frames');
  await mkdir(exportDir, { recursive: true });
  await mkdir(framesDir, { recursive: true });
  if (cacheExportDir) {
    await mkdir(join(cacheExportDir, 'frames'), { recursive: true });
  }

  const frameSize = processedManifest.frameSize;
  const frameExports = [];
  const atlasFrames = [];

  for (const frame of processedManifest.frames) {
    const framePath = join(framesDir, frame.fileName);
    const content = frame.content ?? await readFile(frame.path, 'utf8');
    await writeFile(framePath, content, 'utf8');
    if (cacheExportDir) {
      await writeFile(join(cacheExportDir, 'frames', frame.fileName), content, 'utf8');
    }
    frameExports.push(framePath);
    atlasFrames.push({
      id: frame.frameId,
      x: frame.order * frameSize.width,
      y: 0,
      w: frameSize.width,
      h: frameSize.height,
      pivot: frame.pivot,
      source: `frames/${frame.fileName}`,
    });
  }

  const spritesheetPath = join(exportDir, 'spritesheet.svg');
  const atlasPath = join(exportDir, 'atlas.json');
  const runPath = join(exportDir, 'run.json');
  const sheetSize = {
    width: frameSize.width * processedManifest.frames.length,
    height: frameSize.height,
  };
  const spritesheet = renderSpritesheet({
    sheetSize,
    frameSize,
    frames: await Promise.all(processedManifest.frames.map(async (frame) => ({
      ...frame,
      content: frame.content ?? await readFile(frame.path, 'utf8'),
    }))),
  });
  const atlas = {
    assetId: request.assetId,
    variantId: request.variantId,
    image: 'spritesheet.svg',
    frameSize,
    sheetSize,
    frames: atlasFrames,
  };
  const run = {
    ...resultMetadata,
    outputFiles: {
      frames: frameExports,
      spritesheet: spritesheetPath,
      atlas: atlasPath,
      run: runPath,
    },
  };

  await writeFile(spritesheetPath, spritesheet, 'utf8');
  await writeFile(atlasPath, `${JSON.stringify(atlas, null, 2)}\n`, 'utf8');
  await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  if (cacheExportDir) {
    await writeFile(join(cacheExportDir, 'spritesheet.svg'), spritesheet, 'utf8');
    await writeFile(join(cacheExportDir, 'atlas.json'), `${JSON.stringify(atlas, null, 2)}\n`, 'utf8');
    await writeFile(join(cacheExportDir, 'run.json'), `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  }

  return {
    exportRefs: run.outputFiles,
    metadataRef: runPath,
  };
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function renderSpritesheet({ sheetSize, frameSize, frames }) {
  const nestedFrames = frames
    .sort((a, b) => a.order - b.order)
    .map((frame) => {
      const x = frame.order * frameSize.width;
      const innerSvg = stripXmlDeclaration(frame.content);
      return `<svg x="${x}" y="0" width="${frameSize.width}" height="${frameSize.height}">${innerSvg}</svg>`;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetSize.width}" height="${sheetSize.height}" viewBox="0 0 ${sheetSize.width} ${sheetSize.height}">`,
    nestedFrames,
    `</svg>`,
  ].join('');
}

function stripXmlDeclaration(content) {
  return content.replace(/<\?xml[^>]*>/g, '');
}

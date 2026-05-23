import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export class CacheStore {
  constructor(workspace) {
    this.workspace = workspace;
  }

  paths(cacheKey) {
    const rawRoot = join(this.workspace, 'cache', 'raw', cacheKey);
    const processedRoot = join(this.workspace, 'cache', 'processed', cacheKey);
    const exportRoot = join(this.workspace, 'cache', 'exports', cacheKey);
    return {
      rawRoot,
      rawFrames: join(rawRoot, 'frames'),
      rawManifest: join(rawRoot, 'frames.json'),
      processedRoot,
      processedFrames: join(processedRoot, 'frames'),
      processedManifest: join(processedRoot, 'frames.json'),
      exportRoot,
    };
  }

  hasProcessed(cacheKey) {
    const paths = this.paths(cacheKey);
    return existsSync(paths.processedManifest) && existsSync(paths.processedFrames);
  }

  async writeRaw(cacheKey, generateResult) {
    const paths = this.paths(cacheKey);
    await mkdir(paths.rawFrames, { recursive: true });
    const frames = [];
    for (const frame of generateResult.frames) {
      const framePath = join(paths.rawFrames, frame.fileName);
      await writeFile(framePath, frame.content, 'utf8');
      frames.push({ ...frame, path: framePath, content: undefined });
    }
    await writeJson(paths.rawManifest, {
      backendId: generateResult.backendId,
      backendVersion: generateResult.backendVersion,
      metadata: generateResult.metadata,
      frames,
    });
    return { ...generateResult, frames };
  }

  async readRaw(cacheKey) {
    return readJson(this.paths(cacheKey).rawManifest);
  }

  async writeProcessed(cacheKey, processedResult) {
    const paths = this.paths(cacheKey);
    await mkdir(paths.processedFrames, { recursive: true });
    const frames = [];
    for (const frame of processedResult.frames) {
      const framePath = join(paths.processedFrames, frame.fileName);
      await writeFile(framePath, frame.content, 'utf8');
      frames.push({ ...frame, path: framePath, content: undefined });
    }
    const manifest = { ...processedResult, frames };
    await writeJson(paths.processedManifest, manifest);
    return manifest;
  }

  async readProcessed(cacheKey) {
    return readJson(this.paths(cacheKey).processedManifest);
  }
}

async function writeJson(path, value) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

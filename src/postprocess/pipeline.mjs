import { readFile } from 'node:fs/promises';

export async function runPostprocess(rawManifest, postprocessSpec, request) {
  const width = request.parameters.size.width;
  const height = request.parameters.size.height;
  const pivot = postprocessSpec?.pivot ?? { x: 0.5, y: 1 };
  const frames = [];

  for (const frame of [...rawManifest.frames].sort((a, b) => a.order - b.order)) {
    const rawContent = await readFile(frame.path, 'utf8');
    const content = markPostprocessed(rawContent);
    frames.push({
      frameId: frame.frameId,
      order: frame.order,
      fileName: frame.fileName,
      mediaType: frame.mediaType,
      content,
      bounds: { x: 0, y: 0, w: width, h: height },
      pivot,
    });
  }

  return {
    version: postprocessSpec?.version ?? 'none',
    frameSize: { width, height },
    pivot,
    operations: {
      trimTransparent: postprocessSpec?.trimTransparent ?? false,
      normalizeFrameSize: postprocessSpec?.normalizeFrameSize ?? true,
    },
    frames,
  };
}

function markPostprocessed(content) {
  if (content.includes('data-postprocessed="true"')) return content;
  return content.replace('<svg ', '<svg data-postprocessed="true" ');
}

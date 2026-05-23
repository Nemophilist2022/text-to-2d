import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function exportImageDirectory({ workspace, request, processedContent, resultMetadata }) {
  const exportDir = join(workspace, 'exports', safeName(request.assetId));
  await mkdir(exportDir, { recursive: true });

  const imagePath = join(exportDir, `${safeName(request.assetId)}.svg`);
  const metadataPath = join(exportDir, `${safeName(request.assetId)}.metadata.json`);

  await writeFile(imagePath, processedContent, 'utf8');
  await writeFile(metadataPath, `${JSON.stringify(resultMetadata, null, 2)}\n`, 'utf8');

  return {
    exportRefs: [imagePath],
    metadataRef: metadataPath,
  };
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '_');
}

import { runAssetGeneration } from '../app/asset-job.mjs';
import { readJsonBody, sendJson } from './http-utils.mjs';

export async function handleGenerate({ request, response, workspace, defaultBackendId, backends }) {
  const body = await readJsonBody(request);
  try {
    const result = await runAssetGeneration({ body, workspace, defaultBackendId, backends });
    return sendJson(response, result.httpStatus ?? 200, withoutHttpStatus(result));
  } catch (error) {
    return sendJson(response, 502, {
      status: 'failed',
      error: { message: error.message },
      fallbackBackendId: defaultBackendId,
    });
  }
}

function withoutHttpStatus(result) {
  const { httpStatus, ...body } = result;
  return body;
}

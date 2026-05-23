export function createApiBackendPlaceholder() {
  return {
    backendId: 'api-placeholder',
    version: 'mvp-api-ready-1',
    async generate(input) {
      validateApiInput(input);
      throw new Error('Real API backend is not configured. Use codex-local/prebuilt/mock-ai for MVP validation.');
    },
  };
}

export function validateApiInput(input) {
  const packet = input.packet ?? input.request?.generationPacket;
  if (!packet) {
    throw new Error('API backend requires a GenerationPacket');
  }
  const required = ['requestId', 'assetId', 'assetType', 'subject', 'style', 'size', 'frameCount', 'frameLabels', 'prompt', 'negativePrompt', 'outputContract'];
  for (const key of required) {
    if (packet[key] === undefined) {
      throw new Error(`GenerationPacket missing required field: ${key}`);
    }
  }
  return packet;
}

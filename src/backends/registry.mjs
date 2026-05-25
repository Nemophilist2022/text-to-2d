import { createPrebuiltBackend } from './prebuilt-backend.mjs';
import { createMockAiBackend } from './mock-ai-backend.mjs';
import { createCodexLocalBackend } from './codex-local-backend.mjs';
import { createImageApiBackend } from './image-api-backend.mjs';
import { createChatSvgBackend } from './chat-svg-backend.mjs';

export function createBackendRegistry() {
  return {
    prebuilt: createPrebuiltBackend(),
    'mock-ai': createMockAiBackend(),
    'codex-local': createCodexLocalBackend(),
    'image-api': createImageApiBackend(),
    'chat-svg': createChatSvgBackend(),
  };
}

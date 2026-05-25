import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadLocalEnv(path = resolve('.env.local')) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), stripQuotes(line.slice(index + 1))];
      }),
  );
}

export function mergeLocalEnv(env = process.env) {
  return { ...loadLocalEnv(), ...env };
}

export function stripQuotes(value) {
  return String(value).replace(/^["']|["']$/g, '');
}

export function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

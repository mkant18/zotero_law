import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function validateStyle(xml) {
  const result = spawnSync(process.env.CSL_PYTHON || 'python', [
    fileURLToPath(new URL('./validate.py', import.meta.url))
  ], { input: xml, encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr.trim() || 'CSL validation failed');
  }
}

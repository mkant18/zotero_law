// Orchestrator-owned test helper. Loads src modules into ONE shared vm context, the same way they will
// coexist after concatenation into the single translator file (top-level functions become globals).
// Usage: const ctx = loadModules(['text.js', 'reporters.js', 'cite-parse.js']); ctx.wlCiteParseStandardForm(...)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadModules(files, extraGlobals = {}) {
  // `module` is deliberately undefined so each file's module.exports guard is skipped.
  const ctx = vm.createContext({ console, ...extraGlobals });
  for (const f of files) {
    const code = readFileSync(path.join(srcDir, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }
  return ctx;
}

export const SRC_DIR = srcDir;

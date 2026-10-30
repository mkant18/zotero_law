import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const code = readFileSync(new URL('./bootstrap.js', import.meta.url), 'utf8');
const translatorPath = '/data/translators/Westlaw Advantage US.js';
const stylePath = '/data/styles/bluebook-law-review-westlaw-us.csl';
function runtime(files, failStyle = false) {
  const scope = vm.createContext({
    PathUtils: path.posix,
    IOUtils: {
      makeDirectory: async () => {},
      exists: async p => files.has(p),
      readUTF8: async p => files.get(p),
      writeUTF8: async (p, text) => {
        if (failStyle && p === stylePath && text === 'bundled-style') throw Error('disk failure');
        files.set(p, text);
      },
      remove: async p => files.delete(p)
    },
    Zotero: {
      initializationPromise: Promise.resolve(), DataDirectory: { dir: '/data' },
      getTranslatorsDirectory: () => ({ path: '/data/translators' }),
      getStylesDirectory: () => ({ path: '/data/styles' }),
      File: { getResource: url => url.endsWith('.csl') ? 'bundled-style' : 'bundled-translator' },
      Translators: { get: async () => files.has(translatorPath) ? { path: translatorPath } : null, reinit: async () => {} },
      Styles: { get: () => files.has(stylePath) ? { path: stylePath } : null, reinit: async () => {} },
      debug: () => {}
    }
  });
  vm.runInContext(code, scope);
  return scope;
}
test('fresh installation removes only its resources when disabled', async () => {
  const files = new Map();
  const app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  assert.equal(files.get(translatorPath), 'bundled-translator');
  assert.equal(files.get(stylePath), 'bundled-style');
  await app.shutdown({}, 4);
  assert.equal(files.has(translatorPath), false);
  assert.equal(files.has(stylePath), false);
});
test('restores originals across application restart', async () => {
  const files = new Map([[translatorPath, 'original-translator'], [stylePath, 'original-style']]);
  let app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  await app.shutdown({}, 2);
  app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  await app.shutdown({}, 6);
  assert.equal(files.get(translatorPath), 'original-translator');
  assert.equal(files.get(stylePath), 'original-style');
  assert.ok([...files.keys()].some(p => p.endsWith('.bak')));
});
test('preserves subsequent edits', async () => {
  const files = new Map();
  const app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  files.set(translatorPath, 'user edit');
  await app.shutdown({}, 4);
  assert.equal(files.get(translatorPath), 'user edit');
});
test('failed second write restores first resource and retains original style', async () => {
  const files = new Map([[translatorPath, 'original-translator'], [stylePath, 'original-style']]);
  const app = runtime(files, true);
  await assert.rejects(app.startup({ rootURI: 'jar:file:test!/' }), /disk failure/);
  assert.equal(files.get(translatorPath), 'original-translator');
  assert.equal(files.get(stylePath), 'original-style');
});

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

test('application shutdown leaves installed resources and recovery state intact', async () => {
  const files = new Map();
  const app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  const installed = new Map(files);
  await app.shutdown({}, 2);
  assert.deepEqual(files, installed);
});

test('disable preserves edits to either resource and unrelated files', async () => {
  const files = new Map([['/data/unrelated.txt', 'untouched']]);
  const app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  files.set(translatorPath, 'edited translator');
  files.set(stylePath, 'edited style');
  await app.shutdown({}, 4);
  assert.deepEqual(files, new Map([
    ['/data/unrelated.txt', 'untouched'],
    [translatorPath, 'edited translator'], [stylePath, 'edited style']
  ]));
});

test('disable preserves resources deleted by the user', async () => {
  const files = new Map([[translatorPath, 'original'], [stylePath, 'original']]);
  const app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  files.delete(translatorPath);
  files.delete(stylePath);
  await app.shutdown({}, 4);
  assert.equal(files.has(translatorPath), false);
  assert.equal(files.has(stylePath), false);
});

test('registration failure rolls back both resources', async () => {
  const files = new Map([[translatorPath, 'original-translator'], [stylePath, 'original-style']]);
  const app = runtime(files);
  let reads = 0;
  const getTranslator = app.Zotero.Translators.get;
  app.Zotero.Translators.get = async () => ++reads === 1 ? getTranslator() : null;
  await assert.rejects(app.startup({ rootURI: 'jar:file:test!/' }), /not registered/);
  assert.equal(files.get(translatorPath), 'original-translator');
  assert.equal(files.get(stylePath), 'original-style');
  assert.equal([...files.keys()].some(p => p.endsWith('active-installation.json')), false);
});

test('first resource write failure keeps existing resources', async () => {
  const files = new Map([[translatorPath, 'original-translator'], [stylePath, 'original-style']]);
  const app = runtime(files);
  const write = app.IOUtils.writeUTF8;
  app.IOUtils.writeUTF8 = async (p, text) => {
    if (p === translatorPath && text === 'bundled-translator') throw Error('translator disk failure');
    return write(p, text);
  };
  await assert.rejects(app.startup({ rootURI: 'jar:file:test!/' }), /translator disk failure/);
  assert.equal(files.get(translatorPath), 'original-translator');
  assert.equal(files.get(stylePath), 'original-style');
});

test('upgrade then disable restores originals from before the first version', async () => {
  const files = new Map([[translatorPath, 'original-translator'], [stylePath, 'original-style']]);
  let app = runtime(files);
  await app.startup({ rootURI: 'jar:file:test!/' });
  await app.shutdown({}, 2);
  app = runtime(files);
  app.Zotero.File.getResource = url => url.endsWith('.csl') ? 'new-style' : 'new-translator';
  await app.startup({ rootURI: 'jar:file:new-version!/' });
  assert.equal(files.get(translatorPath), 'new-translator');
  assert.equal(files.get(stylePath), 'new-style');
  await app.shutdown({}, 6);
  assert.equal(files.get(translatorPath), 'original-translator');
  assert.equal(files.get(stylePath), 'original-style');
});

test('corrupt recovery state fails before replacing existing resources', async () => {
  const files = new Map([
    [translatorPath, 'original-translator'], [stylePath, 'original-style'],
    ['/data/westlaw-us-plugin-backups/active-installation.json', '{invalid']
  ]);
  const before = new Map(files);
  const app = runtime(files);
  await assert.rejects(app.startup({ rootURI: 'jar:file:test!/' }), { name: 'SyntaxError' });
  assert.deepEqual(files, before);
});

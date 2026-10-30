import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { validateStyle } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../..');
const styleXml = readFileSync(
  path.join(__dirname, '..', 'bluebook-law-review-westlaw-us.csl'), 'utf-8'
);
validateStyle(styleXml);

// ---------------------------------------------------------------------------
// 1. Load citeproc-js (1.4.61) via vm.runInThisContext so `CSL` becomes a
//    global variable in the current V8 context.
// ---------------------------------------------------------------------------
const citeprocSrc = readFileSync(
  path.join(root, 'zotero/chrome/content/zotero/xpcom/citeproc.js'),
  'utf-8'
);
vm.runInThisContext(citeprocSrc);
// CSL is now available as globalThis.CSL

// ---------------------------------------------------------------------------
// 2. Real Zotero bootstrap (from utilities/test/init.js pattern).
//    Set globalThis.Zotero BEFORE any requires so that CommonJS modules
//    can reference it.
// ---------------------------------------------------------------------------
globalThis.Zotero = {
  locale: 'en-US',
  debug: () => {},
  isNode: true
};

const require = createRequire(import.meta.url);

Zotero.Schema = require(path.join(root, 'utilities/schema.js'));
Zotero.Utilities = require(path.join(root, 'utilities/utilities.js'));
Zotero.Utilities.Item = require(path.join(root, 'utilities/utilities_item.js'));
Zotero.Date = require(path.join(root, 'utilities/date.js'));

Zotero.Schema.init(
  readFileSync(path.join(root, 'zotero/resource/schema/global/schema.json'), 'utf-8')
);

Zotero.Date.init(
  readFileSync(path.join(root, 'utilities/resource/dateFormats.json'), 'utf-8')
);

const CachedTypes = require(path.join(root, 'utilities/cachedTypes.js'));
CachedTypes.setTypeSchema(require(path.join(root, 'utilities/resource/zoteroTypeSchemaData.js')));
Object.assign(Zotero, CachedTypes);

Zotero.localeCompare = new Intl.Collator(['en-US'], { numeric: true, sensitivity: 'base' }).compare;

// ---------------------------------------------------------------------------
// 3. Load the derivative style once (shared across all engine instances).
// ---------------------------------------------------------------------------
const styleDoc = CSL.parseXml(styleXml);

// ---------------------------------------------------------------------------
// 4. Public API.
// ---------------------------------------------------------------------------

/**
 * Render citation clusters through fresh CSL engines (one for text, one
 * for HTML) so that setOutputFormat works correctly without double-adding
 * citations to a single engine.
 *
 * @param {Object[]} items - Zotero-style item JSON objects (with uri, itemType, etc.)
 * @param {Object[][]} clusters - Array of citation clusters.  Each cluster is an
 *   array of { id, locator?, label? } objects.  Sequential noteIndex is 1..n.
 * @returns {{ text: string, html: string, cslJSON: Object }[]}  One result per cluster.
 */
export function render(items, clusters) {
  // Process items through itemToCSLJSON.
  const cslItems = items.map((item) => {
    return Zotero.Utilities.Item.itemToCSLJSON(item);
  });

  // Build a lookup from item ID to CSL-JSON.
  const itemsById = new Map();
  for (const cslItem of cslItems) {
    itemsById.set(cslItem.id, cslItem);
  }

  // Load the pinned locale.
  const localeXml = readFileSync(
    path.join(root, 'westlaw-us/.cache/csl-locales/locales-en-US.xml'),
    'utf-8'
  );

  const sys = {
    retrieveItem: (id) => itemsById.get(id) || {},
    retrieveLocale: (lang) => localeXml,
    stringCompare: (a, b) => a.localeCompare(b)
  };

  // Create separate engines for text and HTML output so we can use
  // setOutputFormat correctly without double-adding citations.
  const textEngine = new CSL.Engine(sys, styleDoc, 'en-US');
  textEngine.setOutputFormat('text');

  const htmlEngine = new CSL.Engine(sys, styleDoc, 'en-US');
  htmlEngine.setOutputFormat('html');

  const results = [];

  for (let noteIndex = 0; noteIndex < clusters.length; noteIndex++) {
    const cluster = clusters[noteIndex];
    const citationItems = cluster.map((ci) => {
      const entry = { id: ci.id };
      if (ci.locator !== undefined && ci.locator !== null) {
        entry.locator = String(ci.locator);
      }
      if (ci.label) {
        entry.label = ci.label;
      }
      return entry;
    });

    const citation = {
      citationItems,
      properties: { noteIndex: noteIndex + 1 }
    };

    // appendCitationCluster returns an array of [index, string, citationID] tuples.
    // Extract the string (tuple[1]) for each cluster item.
    const textTuples = textEngine.appendCitationCluster(citation);
    const text = textTuples.map((t) => t[1]).join('; ');

    const htmlTuples = htmlEngine.appendCitationCluster(citation);
    const html = htmlTuples.map((t) => t[1]).join('; ');

    results.push({ text, html, cslJSON: cslItems });
  }

  return results;
}

export default { render };

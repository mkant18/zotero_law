// Scaffold-style full-field snapshot: the COMPLETE outgoing Zotero field object for each golden case
// is diffed key-by-key against a hand-built expectation (fixtures/item-fields-expected.json, derived from
// reports/20-ASTRA-ARCHITECTURE.md section 5 and golden/GOLDEN-TARGETS.md, not from mapper output).
// Inputs are the synthetic placeholders from fixtures/golden-inputs.mjs; same pipeline as golden-pipeline.test.mjs.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './helpers/load.mjs';
import { G1, G2, G3, G4, G5, G7 } from './fixtures/golden-inputs.mjs';

const GUID_RE = /^I[0-9a-f]{32}$/;
const ctx = loadModules([
  'text.js', 'reporters.js', 'cite-parse.js', 'profile.js',
  'service.js', 'dom.js', 'map.js', 'reconcile.js'
]);

const expectedAll = JSON.parse(readFileSync(new URL('./fixtures/item-fields-expected.json', import.meta.url), 'utf8'));
const TEST_VERSION = '0.0.0-test';

// Emitted fields as a plain object; `extra` (a \n-joined string) is split into lines to match the fixture shape.
function outgoingFields(goldenInput) {
  const rec = ctx.wlRecReconcile(goldenInput);
  const fields = ctx.wlMapToZoteroFields(rec, { version: TEST_VERSION });
  const plain = JSON.parse(JSON.stringify(fields));
  if (typeof plain.extra === 'string') plain.extra = plain.extra.split('\n');
  return plain;
}

function show(value) {
  return JSON.stringify(value);
}

// Per-key diff: returns { added, removed, changed } where "added" = key emitted but not expected,
// "removed" = key expected but not emitted. Array values also report element-level added/removed lines.
export function diffFields(expected, actual) {
  const added = [];
  const removed = [];
  const changed = [];
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of [...keys].sort()) {
    const inExpected = Object.prototype.hasOwnProperty.call(expected, key);
    const inActual = Object.prototype.hasOwnProperty.call(actual, key);
    if (!inExpected) {
      added.push(`${key}: ${show(actual[key])}`);
    } else if (!inActual) {
      removed.push(`${key}: ${show(expected[key])}`);
    } else if (show(expected[key]) !== show(actual[key])) {
      let detail = `${key}: expected ${show(expected[key])} but got ${show(actual[key])}`;
      if (Array.isArray(expected[key]) && Array.isArray(actual[key])) {
        const expectedItems = expected[key].map(show);
        const actualItems = actual[key].map(show);
        const missing = expectedItems.filter(x => !actualItems.includes(x));
        const extra = actualItems.filter(x => !expectedItems.includes(x));
        if (missing.length) detail += `\n      - missing entries: ${missing.join(' | ')}`;
        if (extra.length) detail += `\n      + unexpected entries: ${extra.join(' | ')}`;
        if (!missing.length && !extra.length) detail += '\n      (same entries, different order)';
      }
      changed.push(detail);
    }
  }
  return { added, removed, changed };
}

export function formatDiff(label, diff) {
  const lines = [`${label}: outgoing field object differs from fixtures/item-fields-expected.json`];
  diff.added.forEach(l => lines.push(`  + added   ${l}`));
  diff.removed.forEach(l => lines.push(`  - removed ${l}`));
  diff.changed.forEach(l => lines.push(`  ~ changed ${l}`));
  return lines.join('\n');
}

function assertFieldsMatch(label, goldenInput) {
  const expected = expectedAll[label];
  assert.ok(expected, `fixture has no entry for ${label}`);
  const actual = outgoingFields(goldenInput);
  const diff = diffFields(expected, actual);
  const clean = !diff.added.length && !diff.removed.length && !diff.changed.length;
  assert.ok(clean, formatDiff(label, diff));
}

describe('item-fields diff helper', () => {
  it('reports identical objects as clean', () => {
    const d = diffFields({ a: '1', b: ['x'] }, { a: '1', b: ['x'] });
    assert.deepEqual(d, { added: [], removed: [], changed: [] });
  });
  it('reports added, removed, and changed keys and array entries separately', () => {
    const d = diffFields(
      { keep: 'k', gone: 'g', edit: 'old', lines: ['a', 'b'] },
      { keep: 'k', extraKey: 'e', edit: 'new', lines: ['a', 'c'] }
    );
    assert.deepEqual(d.added, ['extraKey: "e"']);
    assert.deepEqual(d.removed, ['gone: "g"']);
    assert.equal(d.changed.length, 2);
    assert.ok(d.changed.some(c => c.startsWith('edit: expected "old" but got "new"')));
    const linesChange = d.changed.find(c => c.startsWith('lines:'));
    assert.ok(linesChange.includes('- missing entries: "b"'));
    assert.ok(linesChange.includes('+ unexpected entries: "c"'));
    const text = formatDiff('X', d);
    assert.ok(text.includes('+ added   extraKey') && text.includes('- removed gone') && text.includes('~ changed edit'));
  });
  it('fixture covers exactly G1, G2, G4, G5, G7', () => {
    assert.deepEqual(Object.keys(expectedAll).filter(k => !k.startsWith('_')).sort(), ['G1', 'G2', 'G4', 'G5', 'G7']);
  });
});

describe('golden-inputs.mjs placeholder GUIDs', () => {
  for (const [label, input] of Object.entries({ G1, G2, G3, G4, G5, G7 })) {
    it(`${label} input GUID is I + 32 lowercase hex`, () => {
      assert.match(input.context.guid, GUID_RE);
      assert.match(input.dom.guid, GUID_RE);
    });
  }
});

describe('item-fields snapshot (plan section 5 field contract)', () => {
  it('G1 Sanchez (federal appellate) full field object', () => assertFieldsMatch('G1', G1));
  it('G2 Philip Morris (federal district + history) full field object', () => assertFieldsMatch('G2', G2));
  it('G4 Miele (NY App. Div., parallel + WL alternates) full field object', () => assertFieldsMatch('G4', G4));
  it('G5 Rogers (Texas App., writ + history) full field object', () => assertFieldsMatch('G5', G5));
  it('G7 Example (WL-only) full field object', () => assertFieldsMatch('G7', G7));
});

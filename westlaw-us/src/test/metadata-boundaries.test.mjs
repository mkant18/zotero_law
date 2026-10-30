import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { loadModules } from './helpers/load.mjs';
import { el, makeDoc } from './helpers/fakedom.mjs';
import { render } from '../../m0/csl/harness/render.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const ctx = loadModules(['text.js', 'reporters.js', 'cite-parse.js', 'map.js']);
let temporary, built;
before(() => {
  temporary = mkdtempSync(path.join(tmpdir(), 'westlaw-metadata-'));
  const files = ['westlaw-us/tools/build-translator.mjs', 'westlaw-us/m0/probe/Westlaw US M0 Probe.js',
    ...readdirSync(path.join(root, 'westlaw-us/src')).filter(n => n.endsWith('.js')).map(n => 'westlaw-us/src/' + n)];
  for (const file of files) {
    const target = path.join(temporary, file);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(root, file), target);
  }
  const result = spawnSync(process.execPath, [path.join(temporary, 'westlaw-us/tools/build-translator.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  built = readFileSync(path.join(temporary, 'westlaw-us/dist/Westlaw Advantage US.js'), 'utf8');
  built = built.slice(built.indexOf('\n}\n') + 3);
});
after(() => { if (temporary) rmSync(temporary, { recursive: true, force: true }); });

for (const name of [undefined, '', ' \t\n', '\u200B\u2060\uFEFF']) {
  test('required metadata rejects name ' + JSON.stringify(name), () => {
    const result = ctx.wlMapValidateOutgoing({ itemType: 'case', caseName: name });
    assert.equal(result.ok, false);
    assert.ok(result.problems.includes('required:caseName'));
  });
}
for (const itemType of [undefined, '', 'book', 'Case', null]) {
  test('required metadata rejects item type ' + JSON.stringify(itemType), () => {
    const result = ctx.wlMapValidateOutgoing({ itemType, caseName: 'Example v. Sample' });
    assert.equal(result.ok, false);
    assert.ok(result.problems.includes('invalid-item-type:itemType'));
  });
}
test('required metadata accepts a named case', () => {
  assert.equal(ctx.wlMapValidateOutgoing({ itemType: 'case', caseName: 'Example v. Sample' }).ok, true);
});

function runtime(request = async () => { throw new Error('unexpected request'); }) {
  const items = [];
  const c = vm.createContext({ console, URL, setTimeout, clearTimeout, ZU: { request }, Zotero: {
    debug() {}, monitorDOMChanges() {}, Item: function(type) {
      this.itemType = type; this.tags = []; this.creators = []; this.attachments = []; this.notes = [];
      this.complete = () => items.push(this);
    }
  } });
  vm.runInContext(built, c);
  return { c, items };
}
test('partially loaded page aborts through built detectWeb/doWeb before completion', async () => {
  const { c, items } = runtime();
  const doc = makeDoc({ title: 'Loading | Cases', href: 'https://1.next.westlaw.com/Link/Document/FullText',
    body: el('body', {}, el('script', {}, '{"ContentType":"Cases"}'),
      el('ul', { id: 'co_docHeaderCitation' }, el('li', {}, '187 F.3d 486'))) });
  assert.equal(c.detectWeb(doc, doc.location.href), 'case');
  await assert.rejects(c.doWeb(doc, doc.location.href), /invalid required metadata/);
  assert.equal(items.length, 0);
});

const base = 'Example v. Sample, No. 24-123, 2024 WL 1234567';
for (const [suffix, history] of [['', ''], [', writ denied', ''], [', pet. denied', ', cert. denied, 145 S. Ct. 100 (2025)']]) {
  const citation = base + ' (Tex. App.—Beaumont Mar. 1, 2024' + suffix + ')' + history;
  test('Texas WL full date preserves status/history ' + suffix + history, () => {
    const parsed = ctx.wlCiteParseTexasForm(citation);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.date, '2024-03-01');
    assert.equal(parsed.year, '2024');
    assert.equal(parsed.court, 'Tex. App.—Beaumont');
    assert.equal(parsed.parentheticalSuffix, suffix.replace(/^, /, ''));
    assert.equal(parsed.history, history.replace(/^, /, ''));
    assert.equal(ctx.wlCiteRoundTrip(parsed, citation).ok, true);
  });
}
test('Texas WL full date reaches stored fields and real CSL without fallback dates', async t => {
  const guid = 'I1234567890abcdef1234567890abcdef';
  const long = base + ' (Tex. App.—Beaumont Mar. 1, 2024, pet. denied), cert. denied, 145 S. Ct. 100 (2025)';
  const { c, items } = runtime(async url => {
    const first = new URL(url).searchParams.get('parallelCiteRule') === 'westReporterOnly';
    if (!first) return { status: 503, headers: {}, body: '' };
    return { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ responses:
      ['texas', 'standard'].map(styleId => ({ request: { styleId }, forms:
        [{ name: 'long', text: { 'text/plain': styleId === 'texas' ? long : base + ' (Tex. App.—Beaumont Mar. 1, 2024)' } }] })) }) };
  });
  const doc = makeDoc({ title: 'Example v. Sample | Cases', href: 'https://1.next.westlaw.com/Document/' + guid + '/View/FullText.html',
    body: el('body', {}, el('div', { id: 'co_docHeaderTitleLine' }, 'Example v. Sample'),
      el('ul', { id: 'co_docHeaderCitation' }, el('li', {}, 'Court of Appeals of Texas, Beaumont.'), el('li', {}, '2024 WL 1234567')),
      el('script', {}, JSON.stringify({ DocumentGuid: guid, ContentType: 'Cases', PageEventIdentifier: 'TEST-PEI-0001', ResourceToken: 'TEST-RT-0001', RelatedInfo: 'relatedinfo.next.westlaw.com' }))) });
  assert.equal(c.wlDomReadFacts(doc).date, null);
  assert.equal(c.detectWeb(doc, doc.location.href), 'case');
  await c.doWeb(doc, doc.location.href);
  assert.equal(items.length, 1);
  const item = { ...JSON.parse(JSON.stringify(items[0])), uri: guid };
  assert.equal(item.dateDecided, '2024-03-01');
  assert.equal(item.court, 'Tex. App.—Beaumont');
  assert.match(item.extra, /Genre: pet\. denied/);
  assert.equal(item.history, 'cert. denied, 145 S. Ct. 100 (2025)');
  assert.doesNotMatch(item.extra, /wl-missing-date|date-missing|round-trip-mismatch/);
  const rendered = render([item], [[{ id: guid }]])[0];
  assert.match(rendered.text, /Mar\. 1, 2024/);
  assert.match(rendered.text, /145 S\. Ct\. 100/);
  assert.deepEqual(rendered.cslJSON[0].issued['date-parts'], [[2024, 3, 1]]);
  t.diagnostic(JSON.stringify({ dateDecided: item.dateDecided, court: item.court, history: item.history, issued: rendered.cslJSON[0].issued, text: rendered.text }));
});

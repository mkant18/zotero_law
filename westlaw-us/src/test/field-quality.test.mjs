import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './helpers/load.mjs';
import { el, makeDoc } from './helpers/fakedom.mjs';
import { G1, G7 } from './fixtures/golden-inputs.mjs';

const modules = ['text.js', 'reporters.js', 'cite-parse.js', 'profile.js', 'service.js', 'dom.js', 'map.js', 'reconcile.js', 'translator.js'];
const ctx = loadModules(modules);
const plain = value => JSON.parse(JSON.stringify(value));
const clone = value => structuredClone(value);

test('lead author reaches completed Zotero item with structured name parts', async () => {
  const items = [];
  const c = loadModules(modules, { Zotero: {
    Item: function(type) { this.itemType = type; this.tags = []; this.creators = []; this.complete = () => items.push(this); },
    debug() {}
  } });
  const doc = makeDoc({ body: el('body', {},
    el('div', { id: 'co_docHeaderTitleLine' }, 'Example v. Sample'),
    el('div', { class: 'x_leadAuthorLine' }, 'JOSÉ O’NEILL, Senior Circuit Judge.'),
    el('div', { class: 'x_dissentAuthorLine' }, 'OTHER, Justice.'),
    el('div', { class: 'co_panelBlock' }, 'Before OTHER and THIRD, Judges.')) });
  await c.doWeb(doc, doc.location.href);
  assert.equal(items.length, 1);
  assert.deepEqual(plain(items[0].creators), [{ creatorType: 'author', firstName: 'JOSÉ', lastName: 'O’NEILL' }]);
});

test('ambiguous or unparseable authors stay empty and require review', () => {
  for (const lines of [['ONE, Justice.', 'TWO, Justice.'], ['Opinion delivered by someone unknown'], ['ONE, Justice.', 'Unclear text']]) {
    const facts = ctx.wlDomReadFacts(makeDoc({ body: el('body', {}, ...lines.map(line => el('div', { class: 'x_leadAuthorLine' }, line))) }));
    assert.equal(facts.author, null);
    assert.ok(facts.reviewReasons.some(r => r.startsWith('author-')));
    const input = clone(G1); input.dom = { ...input.dom, ...plain(facts) };
    const rec = ctx.wlRecReconcile(input);
    assert.notEqual(rec.status, 'validated-profile');
    assert.equal(ctx.wlMapToZoteroFields(rec).creators.length, 0);
  }
});

test('duplicate author lines and per curiam survive safely', () => {
  const doc = makeDoc({ body: el('body', {}, el('div', { class: 'x_leadAuthorLine' }, 'PER CURIAM:'), el('div', { class: 'x_leadAuthorLine' }, 'Per Curiam.')) });
  const facts = ctx.wlDomReadFacts(doc);
  assert.equal(facts.author.lastName, 'Per Curiam');
  assert.equal(facts.author.fieldMode, 1);
  assert.equal(facts.reviewReasons.length, 0);
});

test('lead author accepts judicial title variants and name suffixes', () => {
  for (const [line, name] of [
    ['JOHN ROBERTS Chief Justice.', 'JOHN ROBERTS'],
    ['Opinion by JOSÉ O’NEILL, Circuit Judge.', 'JOSÉ O’NEILL'],
    ['JOHN SMITH, Jr., District Judge.', 'JOHN SMITH, Jr.'],
    ['SMITH, C.J.', 'SMITH']
  ]) {
    const facts = ctx.wlDomReadFacts(makeDoc({ body: el('body', {}, el('div', { class: 'x_leadAuthorLine' }, line)) }));
    assert.equal([facts.author.firstName, facts.author.lastName].filter(Boolean).join(' '), name.replace(', Jr.', ' Jr.'));
    assert.ok(!facts.reviewReasons.includes('author-unparsed'));
  }
  for (const line of ['Before SMITH and JONES, Circuit Judge.', 'Opinion delivered by SMITH, Justice.']) {
    const facts = ctx.wlDomReadFacts(makeDoc({ body: el('body', {}, el('div', { class: 'x_leadAuthorLine' }, line)) }));
    assert.equal(facts.author, null);
  }
});

test('documented legacy header fields reach completed Zotero metadata', async () => {
  const items = [];
  const c = loadModules(modules, { Zotero: {
    Item: function() { this.tags = []; this.creators = []; this.complete = () => items.push(this); }, debug() {}
  } });
  const doc = makeDoc({ body: el('body', {},
    el('h2', { id: 'co_docHeaderTitleLine', title: 'Example v. Sample' }, 'Example…'),
    el('span', { id: 'courtline' }, 'United States Court of Appeals, Fifth Circuit.'),
    el('span', { id: 'filedate' }, 'August 25, 1999'),
    el('span', { id: 'cite0' }, '187 F.3d 486'),
    el('span', { id: 'cite1' }, '187 F.3d 486'),
    el('div', { class: 'co_docketBlock' }, 'No. 98-40679'),
    el('div', { class: 'x_leadAuthorLine' }, 'SMITH Circuit Judge.')) });
  const facts = c.wlDomReadFacts(doc);
  assert.equal(facts.citations.length, 1);
  await c.doWeb(doc, doc.location.href);
  assert.equal(items.length, 1);
  assert.equal(items[0].caseName, 'Example v. Sample');
  assert.equal(items[0].dateDecided, '1999-08-25');
  assert.equal(items[0].court, '5th Cir.');
  assert.equal(items[0].reporter, 'F.3d');
  assert.equal(items[0].reporterVolume, '187');
  assert.equal(items[0].firstPage, '486');
  assert.equal(items[0].docketNumber, 'No. 98-40679');
  assert.equal(items[0].creators[0].lastName, 'SMITH');
});

test('full dates disagreeing within one year require review', () => {
  const input = clone(G7); input.dom.date = '2024-03-02';
  const rec = ctx.wlRecReconcile(input);
  assert.ok(rec.reviewReasons.includes('date-conflict'));
  assert.notEqual(rec.status, 'validated-profile');
  assert.equal(rec.date, '2024-03-02');
});

test('header and citation-service name disagreement requires review', () => {
  const input = clone(G1); input.dom.headerName = 'Different v. Parties';
  const rec = ctx.wlRecReconcile(input);
  assert.ok(rec.reviewReasons.includes('header-name-conflict'));
  assert.notEqual(rec.status, 'validated-profile');
});

test('DOM-only WL citation retains Westlaw medium metadata', () => {
  const input = clone(G7); input.svcA.category = 'auth';
  input.dom.citations = [{ kind: 'wl', volume: '2024', reporter: 'WL', page: '1234567', raw: '2024 WL 1234567' }];
  const rec = ctx.wlRecReconcile(input);
  assert.equal(rec.wlPrimary, true);
  assert.ok(ctx.wlMapToZoteroFields(rec).extra.includes('Medium: Westlaw'));
});

test('full service date and docket fill absent header fields', () => {
  const input = clone(G7); input.dom.date = null; input.dom.dockets = [];
  const rec = ctx.wlRecReconcile(input);
  assert.equal(rec.date, '2024-03-01');
  assert.deepEqual(plain(rec.dockets), ['No. 24-123']);
});

test('disagreeing dockets require review; equivalent dashes do not', () => {
  const input = clone(G7); input.dom.dockets = ['No. 24-999'];
  assert.ok(ctx.wlRecReconcile(input).reviewReasons.includes('docket-conflict'));
  input.dom.dockets = ['No. 24–123.'];
  assert.ok(!ctx.wlRecReconcile(input).reviewReasons.includes('docket-conflict'));
});

test('regional reporter still checks court disagreement; official reporter cannot hide trial court', () => {
  const court = ctx.wlProfClassifyCourt('Supreme Court of California.');
  const conflict = ctx.wlProfCourtForCitation(court, { reporter: 'P.3d' }, 'Nev.');
  assert.equal(conflict.court, 'Cal.');
  assert.ok(conflict.reviewReasons.includes('court-conflict'));
  const trial = ctx.wlProfClassifyCourt('Supreme Court of New York, Kings County.');
  assert.equal(ctx.wlProfCourtForCitation(trial, { reporter: 'N.Y.3d' }, null).court, 'N.Y. Sup. Ct.');
});

test('outgoing validator rejects impossible dates, nonnumeric citation parts, and unsafe authors', () => {
  for (const date of ['2023-02-29', '2024-04-31', '2024-13-01', 'tomorrow']) {
    assert.ok(ctx.wlMapValidateOutgoing({ dateDecided: date }).problems.includes('invalid-date:dateDecided'));
  }
  assert.ok(ctx.wlMapValidateOutgoing({ itemType: 'case', caseName: 'Example v. Sample', dateDecided: '2024-02-29' }).ok);
  assert.ok(!ctx.wlMapValidateOutgoing({ reporterVolume: 'one', firstPage: '*4' }).ok);
  assert.ok(!ctx.wlMapValidateOutgoing({ creators: [{ creatorType: 'author', lastName: '<script>', fieldMode: 1 }] }).ok);
});

test('mapper removes every watermark and normalizes author whitespace', () => {
  const rec = ctx.wlRecReconcile(clone(G1)); rec.author = ' JOSÉ\u200B  O’NEILL\u200B ';
  const fields = ctx.wlMapToZoteroFields(rec);
  assert.equal(fields.creators[0].lastName, 'JOSÉ O’NEILL');
  assert.ok(ctx.wlMapValidateOutgoing(fields).ok);
});

test('unsafe raw court is removed from Extra and completed item is marked for review', async () => {
  const items = [];
  const c = loadModules(modules, { Zotero: {
    Item: function() { this.tags = []; this.creators = []; this.complete = () => items.push(this); }, debug() {}
  } });
  const doc = makeDoc({ body: el('body', {}, el('div', { id: 'co_docHeaderTitleLine' }, 'Example v. Sample'), el('div', { class: 'co_courtBlock' }, '<script>Bad Court')) });
  await c.doWeb(doc, doc.location.href);
  assert.equal(items.length, 1);
  assert.ok(!items[0].extra.includes('<script>'));
  assert.ok(items[0].extra.includes('validation-html:extra['));
  assert.ok(items[0].tags.some(t => t.tag === 'Westlaw: needs citation review'));
});

test('unsafe required case name never completes an item', async () => {
  const items = [];
  const c = loadModules(modules, { Zotero: { Item: function() { this.complete = () => items.push(this); }, debug() {} } });
  const doc = makeDoc({ body: el('body', {}, el('div', { id: 'co_docHeaderTitleLine' }, '<script>Bad Name')) });
  await assert.rejects(c.doWeb(doc, doc.location.href), /invalid required metadata/);
  assert.equal(items.length, 0);
});

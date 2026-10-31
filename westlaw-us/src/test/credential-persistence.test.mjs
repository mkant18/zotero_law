import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildTranslator } from '../../tools/build-translator.mjs';
import { el, makeDoc } from './helpers/fakedom.mjs';

const dir = mkdtempSync(join(tmpdir(), 'westlaw-credentials-'));
let code;
try {
  const target = process.env.WL_CREDENTIAL_TRANSLATOR || join(dir, 'translator.js');
  if (!process.env.WL_CREDENTIAL_TRANSLATOR) buildTranslator(target);
  code = readFileSync(target, 'utf8').replace(/^\{[\s\S]*?\n\}\n/, '');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const rt = 'TESTSYNTHETICresourceValue878878';
const pei = 'TESTSYNTHETICpageEventValue979979';
const guid = 'I1234567890abcdef1234567890abcdef';

async function run({ title = 'Example v. Sample', serviceTitle = title, inject, credentials } = {}) {
  const items = [], logs = [], requests = [];
  function Item(type) { Object.assign(this, { itemType: type, tags: [], creators: [], attachments: [], notes: [] }); }
  Item.prototype.complete = function() { items.push(this); };
  const context = vm.createContext({ URL, setTimeout, clearTimeout,
    Zotero: { Item, debug: s => logs.push(s), monitorDOMChanges() {} },
    ZU: { request: async (url, options) => {
      requests.push({ url, options });
      return { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ responses: [
        { request: { styleId: 'standard' }, forms: [{ name: 'long', text: { 'text/plain': serviceTitle + ', 187 F.3d 486 (5th Cir. 1999)' } }] }
      ] }) };
    } }
  });
  vm.runInContext(code, context);
  if (inject) {
    const original = context.wlMapToZoteroFields;
    context.wlMapToZoteroFields = (...args) => { const fields = original(...args); inject(fields); return fields; };
  }
  const scripts = credentials || [{ ResourceToken: rt, PageEventIdentifier: pei }];
  const doc = makeDoc({ title: title + ' | Cases | Westlaw Advantage', body: el('body', {},
    el('div', { id: 'co_docHeaderTitleLine' }, title),
    el('div', { id: 'co_docHeaderCitation' }, el('li', {}, 'United States Court of Appeals, Fifth Circuit.'),
      el('li', {}, 'August 25, 1999'), el('li', {}, '187 F.3d 486')),
    ...scripts.map(values => el('script', {}, JSON.stringify({ DocumentGuid: guid, ContentType: 'Cases',
      RelatedInfo: 'relatedinfo.next.westlaw.com', ...values })))) });
  assert.equal(context.detectWeb(doc, doc.location.href), 'case');
  let error;
  try { await context.doWeb(doc, doc.location.href); } catch (e) { error = e.message; }
  const output = JSON.stringify({ items, logs, error });
  for (const token of [rt, pei]) assert.equal(output.includes(token), false, 'credential escaped persistence boundary');
  assert(logs.every(s => s.length < 500), 'debug output remains bounded');
  assert(requests.every(r => new URL(r.url).origin === 'https://1.next.westlaw.com' && !r.url.includes(rt) && !r.url.includes(pei)));
  return { items, logs, error, context };
}

test('valid service and DOM-only imports retain ordinary metadata', async () => {
  for (const credentials of [undefined, [{}]]) {
    const { items, error } = await run({ credentials });
    assert.equal(error, undefined);
    assert.equal(items.length, 1);
    assert.equal(items[0].caseName, 'Example v. Sample');
    assert.match(items[0].extra, /Westlaw translator: 0\.3\.6/);
  }
});

for (const token of [rt, pei]) {
  test('captured value rejected from actual DOM/service title: ' + (token === rt ? 'resource' : 'page event'), async () => {
    const result = await run({ title: token + ' v. Sample' });
    assert.equal(result.items.length, 0);
    assert.equal(result.error, 'Westlaw: captured credential in outgoing metadata');
  });
  const locations = {
    caseName: f => { f.caseName = 'Prefix ' + token + ' suffix'; },
    court: f => { f.court = token; },
    dateDecided: f => { f.dateDecided = token; },
    docketNumber: f => { f.docketNumber = token; },
    reporter: f => { f.reporter = token; },
    reporterVolume: f => { f.reporterVolume = token; },
    firstPage: f => { f.firstPage = token; },
    history: f => { f.history = token; },
    shortTitle: f => { f.shortTitle = token; },
    url: f => { f.url = 'https://example.invalid/' + token; },
    extra: f => { f.extra += '\nEvidence: ' + token; },
    creatorFirst: f => { f.creators = [{ creatorType: 'author', firstName: token, lastName: 'Sample' }]; },
    creatorLast: f => { f.creators = [{ creatorType: 'author', lastName: token }]; },
    tag: f => { f.tags = [{ tag: token }]; },
    nestedString: f => { f.tags = [{ tag: 'Safe', other: [token] }]; }
  };
  for (const [location, inject] of Object.entries(locations)) {
    test('final persistence boundary rejects ' + location + ' / ' + (token === rt ? 'resource' : 'page event'), async () => {
      const result = await run({ inject });
      assert.equal(result.items.length, 0);
      assert.equal(result.error, 'Westlaw: captured credential in outgoing metadata');
    });
  }
}

test('partial and ambiguous page credentials remain protected in DOM fallback', async () => {
  for (const credentials of [[{ ResourceToken: rt }], [{ PageEventIdentifier: pei }],
    [{ ResourceToken: rt, PageEventIdentifier: pei }, { ResourceToken: 'TESTOTHERresource878878' }]]) {
    const token = credentials[0].ResourceToken || pei;
    const result = await run({ title: token + ' v. Sample', credentials });
    assert.equal(result.items.length, 0);
    assert.equal(result.error, 'Westlaw: captured credential in outgoing metadata');
  }
});

test('empty captured values do not reject safe strings; labelled credentials still rejected', async () => {
  assert.equal((await run({ credentials: [{ ResourceToken: '', PageEventIdentifier: '' }] })).items.length, 1);
  const result = await run({ title: 'ResourceToken TESTLABELvalue v. Sample' });
  assert.equal(result.items.length, 0);
  assert.equal(result.error, 'Westlaw: invalid required metadata');
});

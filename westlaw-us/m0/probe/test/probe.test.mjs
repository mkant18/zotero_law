import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeZotero, makeFakeZU, makeFakeDoc } from './fakes.mjs';
import vm from 'vm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const translatorPath = path.join(__dirname, '..', 'Westlaw US M0 Probe.js');
const translatorSource = fs.readFileSync(translatorPath, 'utf-8');

const FAKE_GUID = 'I1234567890abcdef1234567890abcdef';
const FAKE_PCID = 'TEST-PCID-0001-SECRET';
const FAKE_RTID = 'TEST-RT-0001-SECRET';
const FAKE_RI = 'relatedinfo.test.invalid';

function loadTranslator() {
  const fakeZotero = makeFakeZotero();
  const fakeZU = makeFakeZU(() => {});

  const sandbox = {
    Zotero: fakeZotero.Zotero,
    ZU: fakeZU,
    module: { exports: {} },
    exports: {},
    console,
    setTimeout,
    clearTimeout,
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(translatorSource, context);
  return {
    translator: context.module.exports,
    fakeZotero,
    fakeZU,
    sandbox,
  };
}

function makeScript(textContent) {
  return {
    tagName: 'script',
    attributes: {},
    _textContent: textContent,
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = v; },
    getAttribute(name) { return this.attributes[name] || null; },
  };
}

function makeCaseDoc(opts = {}) {
  const {
    title = 'Case Name | Cases | Jurisdiction | Westlaw Advantage',
    href = `https://1.next.westlaw.com/Document/${FAKE_GUID}/View/FullText.html`,
    hostname = '1.next.westlaw.com',
    scripts = [],
    headerTitle = 'Case Name',
    headerCitationLis = ['August 25, 1999', '449 F.Supp.2d 1'],
    docketBlock = 'No. 98-40679.',
    headerAnchorHref = null,
    coDocument = null,
  } = opts;

  return makeFakeDoc({
    title,
    href,
    hostname,
    scripts,
    headerTitle,
    headerCitationLis,
    docketBlock,
    headerAnchorHref,
    coDocument,
  });
}

function makeConfigScript(guid, contentType, pageEventId, resourceToken, relatedInfo) {
  const parts = [];
  const guids = Array.isArray(guid) ? guid : [guid];
  for (const g of guids) {
    parts.push(`"DocumentGuid":"${g}"`);
  }
  if (contentType) parts.push(`"ContentType":"${contentType}"`);
  if (pageEventId) parts.push(`"PageEventIdentifier":"${pageEventId}"`);
  if (resourceToken) parts.push(`"ResourceToken":"${resourceToken}"`);
  if (relatedInfo) parts.push(`"RelatedInfo":"${relatedInfo}"`);
  return makeScript(`var config = {${parts.join(',')}};`);
}

function makeSuccessEnvelope(styleId, formName, hasPlain, plainText, requestKeys) {
  return {
    responses: [{
      request: {
        styleId,
        ...(requestKeys ? requestKeys.reduce((acc, k) => { acc[k] = 'val'; return acc; }, {}) : {}),
        parallelCiteRule: 'westReporterOnly',
        subStyle: 'LegalBriefs',
        history: true,
      },
      forms: [{
        name: formName,
        text: hasPlain ? { 'text/plain': plainText } : {},
      }],
    }],
  };
}

function assertCommonItem(item, completeCount) {
  assert.equal(item.itemType, 'case');
  assert.equal(Array.isArray(item.attachments), true);
  assert.equal(item.attachments.length, 0);
  assert.equal(Array.isArray(item.creators), true);
  assert.equal(item.creators.length, 0);
  assert.equal(Array.isArray(item.notes), true);
  assert.equal(item.notes.length, 0);
}

function assertNoSecretsInItemOrDebug(item, debugMessages, secrets) {
  const itemStr = JSON.stringify(item);
  for (const secret of secrets) {
    assert.equal(itemStr.includes(secret), false, `Secret ${secret} found in item JSON`);
    for (const msg of debugMessages) {
      assert.equal(String(msg).includes(secret), false, `Secret ${secret} found in debug: ${msg}`);
    }
  }
}

function assertRequestHeaders(fakeZU, allowedHeaders) {
  const calls = fakeZU.getCalls();
  for (const call of calls) {
    const headers = call.options.headers || {};
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
    for (const key of headerKeys) {
      assert.equal(['accept', 'x-requested-with', 'x-cobalt-exectype', 'x-cobalt-pcid', 'x-cobalt-rtid', 'x-cobalt-host'].includes(key), true, `Unexpected header: ${key}`);
    }
    assert.equal(headerKeys.includes('origin'), false, 'Origin header present');
    assert.equal(headerKeys.includes('cookie'), false, 'Cookie header present');
    assert.equal(headerKeys.includes('referer'), false, 'Referer header present');
    assert.equal(headerKeys.includes('authorization'), false, 'Authorization header present');
  }
}

function assertRequestUrls(fakeZU) {
  const calls = fakeZU.getCalls();
  for (const call of calls) {
    assert.equal(call.url.startsWith('https://1.next.westlaw.com/RelatedInfo/v2/citestyles/'), true, `Unexpected URL: ${call.url}`);
  }
}

// Test 1: success A+B
test('success A+B with synthetic envelope', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { M0, doWeb, readPageContext, buildRequests, fetchForm, summarizeEnvelope } = translator;

  const envelope = {
    responses: [
      {
        request: { styleId: 'standard', parallelCiteRule: 'westReporterOnly', subStyle: 'LegalBriefs', history: true },
        forms: [
          { name: 'long', text: { 'text/plain': 'Doe v Smith, 123 F.3d 1 (2d Cir. 2020)' } },
          { name: 'short', text: { 'text/plain': 'Doe v Smith' } },
        ],
      },
      {
        request: { styleId: 'texas', parallelCiteRule: 'westReporterOnly', subStyle: 'LegalBriefs', history: true },
        forms: [
          { name: 'long', text: { 'text/plain': 'Doe v Smith, 123 S.W.3d 1 (Tex. App. 2020)' } },
          { name: 'specialRef', text: { 'text/plain': 'See Doe v Smith' } },
        ],
      },
    ],
  };

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(envelope),
  });

  const scripts = [
    makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI),
  ];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.itemType, 'case');
  assert.equal(item.attachments.length, 0);
  assert.equal(item.creators.length, 0);
  assert.equal(item.notes.length, 0);
  assert.equal(item.extra.includes('Westlaw M0 A: ok'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: ok'), true);
  assert.equal(item.extra.includes('Westlaw M0 A long (standard):'), true);
  assert.equal(item.extra.includes('Westlaw M0 B long (texas):'), true);
  assertNoSecretsInItemOrDebug(item, fakeZotero.debugMessages, [FAKE_RTID, FAKE_PCID, FAKE_RI]);
  assertRequestHeaders(fakeZU);
  assertRequestUrls(fakeZU);
  assert.equal(fakeZU.getCallCount(), 2);
});

// Test 2: Texas court line vs Fifth Circuit with Texas in title
test('Texas court line triggers texas+standard; Fifth Circuit with Texas in title facet does not', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb, readPageContext, buildRequests } = translator;

  // Texas intermediate appellate
  const texasEnvelope = {
    responses: [
      {
        request: { styleId: 'texas', parallelCiteRule: 'westReporterOnly', subStyle: 'LegalBriefs', history: true },
        forms: [{ name: 'long', text: { 'text/plain': 'Doe v Smith, 123 S.W.3d 1 (Tex. App. 2020)' } }],
      },
    ],
  };

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(texasEnvelope),
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({
    scripts,
    headerTitle: 'Doe v Smith, Court of Appeals of Texas',
  });

  await doWeb(doc, doc.location.href);

  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('styles=texas,standard'), true, 'Texas appellate should use texas+standard styles');

  // Fifth Circuit with Texas in title facet but United States in court line
  fakeZU.reset();
  fakeZotero.reset();

  const fifthCircuitEnvelope = {
    responses: [
      {
        request: { styleId: 'standard', parallelCiteRule: 'westReporterOnly', subStyle: 'LegalBriefs', history: true },
        forms: [{ name: 'long', text: { 'text/plain': 'Doe v Smith, 123 F.3d 1 (5th Cir. 2020)' } }],
      },
    ],
  };

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fifthCircuitEnvelope),
  });

  const doc2 = makeCaseDoc({
    scripts,
    headerTitle: 'Doe v Smith, United States Court of Appeals, Fifth Circuit',
  });

  await doWeb(doc2, doc2.location.href);

  const item2 = fakeZotero.getLastItem();
  assert.equal(item2.extra.includes('styles=standard'), true, 'Fifth Circuit should use standard only');
  assert.equal(item2.extra.includes('styles=texas'), false, 'Fifth Circuit should not use texas style');
});

// Test 3: missing ResourceToken
test('missing ResourceToken results in missing-config, 0 requests', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, null, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: missing-config'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 0);
});

// Test 4: 401 → auth, B skipped
test('401 response → auth, B skipped', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 401,
    responseURL: url,
    headers: {},
    body: '',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: auth'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 5: 403 → auth, B skipped
test('403 response → auth, B skipped', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 403,
    responseURL: url,
    headers: {},
    body: '',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: auth'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 6: 200 + text/html login body → auth
test('200 with text/html login body → auth', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'text/html' },
    body: '<html><body>Login</body></html>',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: auth'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 7: 404 HTML → not-found-html
test('404 response → not-found-html', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 404,
    responseURL: url,
    headers: {},
    body: '<html>Not Found</html>',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: not-found-html'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 8: 400 → bad-request
test('400 response → bad-request', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 400,
    responseURL: url,
    headers: {},
    body: 'Bad Request',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: bad-request'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 9: 429 with Retry-After → rate-limited
test('429 with Retry-After → rate-limited, Retry-After line, B skipped', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 429,
    responseURL: url,
    headers: { 'retry-after': '120' },
    body: 'Too Many Requests',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: rate-limited'), true);
  assert.equal(item.extra.includes('Westlaw M0 Retry-After: 120'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 10: 500 → server
test('500 response → server', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 500,
    responseURL: url,
    headers: {},
    body: 'Internal Server Error',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: server'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 11: malformed JSON
test('malformed JSON → malformed-json', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: '{not valid json}',
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: malformed-json'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 12: body > maxBodyBytes → oversized
test('body exceeds maxBodyBytes → oversized', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { M0, doWeb } = translator;

  const bigBody = 'x'.repeat(M0.maxBodyBytes + 1);

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: bigBody,
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: oversized'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 13: JSON without responses → unexpected-envelope
test('JSON without responses array → unexpected-envelope', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: 'no responses' }),
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: unexpected-envelope'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 14: timeout
test('timeout (M0.timeoutMs = 30) → timeout, test finishes quickly', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { M0, doWeb } = translator;

  M0.timeoutMs = 30;

  fakeZU.request = async (url, options) => {
    // Never resolves
    return new Promise(() => {});
  };

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  const startTime = Date.now();
  await doWeb(doc, doc.location.href);
  const elapsed = Date.now() - startTime;

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: timeout'), true);
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
  assert.ok(elapsed < 5000, `Test took too long: ${elapsed}ms`);
});

// Test 15: rejected request → network-or-origin, no secret in output
test('rejected request → network-or-origin, no secret in item or debug', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  fakeZU.request = async (url, options) => {
    throw new Error(`Network error with token ${FAKE_RTID} at ${url}`);
  };

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: network-or-origin'), true);
  assertNoSecretsInItemOrDebug(item, fakeZotero.debugMessages, [FAKE_RTID, FAKE_PCID, FAKE_RI]);
  assert.equal(fakeZU.getCallCount(), 1);
});

// Test 16: URL GUID ≠ config GUID → identity-mismatch, 0 requests
test('URL GUID does not match config GUID → identity-mismatch, 0 requests', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb, readPageContext } = translator;

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const differentGUID = 'Iabcdefabcdefabcdefabcdefabcdefab';
  const doc = makeCaseDoc({
    scripts,
    href: `https://1.next.westlaw.com/Document/${differentGUID}/View/FullText.html`,
  });

  const ctx = readPageContext(doc, doc.location.href);
  assert.equal(ctx.config.identityReason, 'identity-mismatch');
  assert.equal(ctx.config.guid, null);

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('Westlaw M0 A: missing-config'), true);
  assert.equal(fakeZU.getCallCount(), 0);
});

// Test 17: two distinct config GUIDs on /Link/ URL with header anchor resolving one
test('two distinct config GUIDs on /Link/ URL with header anchor resolving one → uses it; unresolvable → identity-ambiguous', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb, readPageContext } = translator;

  // Case 1: header anchor resolves to a valid GUID among config GUIDs
  const configGUIDs = [FAKE_GUID, 'Iabcdefabcdefabcdefabcdefabcdefab'];
  const scripts1 = [makeConfigScript(configGUIDs, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc1 = makeCaseDoc({
    scripts: scripts1,
    headerAnchorHref: `https://1.next.westlaw.com/Document/${FAKE_GUID}/View/FullText.html`,
    href: 'https://1.next.westlaw.com/Link/Document/FullText?findType=Y&cite=123',
  });

  const ctx1 = readPageContext(doc1, doc1.location.href);
  assert.equal(ctx1.config.guid, FAKE_GUID, 'Should use GUID from header anchor');

  // Case 2: unresolvable → identity-ambiguous
  const scripts2 = [makeConfigScript(configGUIDs, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc2 = makeCaseDoc({
    scripts: scripts2,
    href: 'https://1.next.westlaw.com/Link/Document/FullText?findType=Y&cite=123',
  });

  const ctx2 = readPageContext(doc2, doc2.location.href);
  assert.equal(ctx2.config.identityReason, 'identity-ambiguous', 'Should be identity-ambiguous when no header anchor');
});

// Test 18: location changes to different GUID during request → identity-changed
test('location changes to different GUID during request → identity-changed, responses unused', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { M0, doWeb } = translator;

  let callCount = 0;
  fakeZU.request = async (url, options) => {
    callCount++;
    // On first call, change the doc location to a different GUID
    if (callCount === 1) {
      const doc = fakeZotero._currentDoc;
      if (doc) {
        doc.location.href = 'https://1.next.westlaw.com/Document/Iaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/View/FullText.html';
      }
    }
    return {
      status: 200,
      responseURL: url,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        responses: [{
          request: { styleId: 'standard' },
          forms: [{ name: 'long', text: { 'text/plain': 'Doe v Smith, 123 F.3d 1 (2d Cir. 2020)' } }],
        }],
      }),
    };
  };

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });
  fakeZotero._currentDoc = doc;

  await doWeb(doc, doc.location.href);

  assert.equal(fakeZotero.getCompleteCount(), 1);
  const item = fakeZotero.getLastItem();
  assert.equal(item.extra.includes('identity-changed'), true, 'Should record identity-changed');
  assert.equal(item.extra.includes('Westlaw M0 B: skipped'), true);
});

// Test 19: detectWeb cases
test('detectWeb: case page → "case" with 0 requests; config ContentType "SecondarySources" + stale "| Cases |" title → false; title-only (no header element) → false + monitorDOMChanges called once when #co_document exists; no config but header + Cases title → "case"; secondary-source title → false', async () => {
  const { translator } = loadTranslator();
  const { detectWeb } = translator;

  // Case 1: case page → "case"
  const scripts1 = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc1 = makeCaseDoc({ scripts: scripts1 });
  assert.equal(detectWeb(doc1, doc1.location.href), 'case', 'Should detect case page');

  // Case 2: config ContentType "SecondarySources" + stale "| Cases |" title → false
  const scripts2 = [makeConfigScript(FAKE_GUID, 'SecondarySources', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc2 = makeFakeDoc({
    title: 'Some Title | Cases | Jurisdiction | Westlaw Advantage',
    href: 'https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html',
    scripts: scripts2,
    headerTitle: 'Some Title',
  });
  assert.equal(detectWeb(doc2, doc2.location.href), false, 'Should return false when ContentType is not Cases');

  // Case 3: title-only (no header element) → false + monitorDOMChanges called once when #co_document exists
  const fakeZotero3 = makeFakeZotero();
  const fakeZU3 = makeFakeZU(() => {});
  const sandbox3 = { Zotero: fakeZotero3.Zotero, ZU: fakeZU3, module: { exports: {} }, exports: {}, console };
  const context3 = vm.createContext(sandbox3);
  vm.runInContext(translatorSource, context3);
  const { detectWeb: detectWeb3 } = context3.module.exports;

  const doc3 = makeFakeDoc({
    title: 'Some Title | Cases | Jurisdiction | Westlaw Advantage',
    href: 'https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html',
    coDocument: 'some content',
  });
  const result3 = detectWeb3(doc3, doc3.location.href);
  assert.equal(result3, false, 'Should return false when header is missing');
  assert.equal(fakeZotero3.monitorDOMChangesCalls.length, 1, 'Should call monitorDOMChanges once');

  // Case 4: no config but header + Cases title → "case"
  const scripts4 = [makeConfigScript(FAKE_GUID, null, FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc4 = makeCaseDoc({ scripts: scripts4 });
  assert.equal(detectWeb(doc4, doc4.location.href), 'case', 'Should detect case when no ContentType config but title has Cases');

  // Case 5: secondary-source title → false
  const scripts5 = [makeConfigScript(FAKE_GUID, 'SecondarySources', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc5 = makeFakeDoc({
    title: 'Restatement | Secondary Sources | National | Westlaw Advantage',
    href: 'https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html',
    scripts: scripts5,
    headerTitle: 'Restatement',
  });
  assert.equal(detectWeb(doc5, doc5.location.href), false, 'Should return false for secondary source');
});

// Test 20: forceFatal → doWeb throws, 0 items completed
test('forceFatal → doWeb throws, 0 items completed', async () => {
  const { translator, fakeZotero } = loadTranslator();
  const { M0, doWeb } = translator;

  M0.forceFatal = true;

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  let threw = false;
  try {
    await doWeb(doc, doc.location.href);
  } catch (e) {
    assert.equal(e.message, 'M0 forced fatal');
    threw = true;
  }
  assert.equal(threw, true, 'doWeb should throw when forceFatal is true');
  assert.equal(fakeZotero.getCompleteCount(), 0, 'No items should be completed when forceFatal');

  // Reset for other tests
  M0.forceFatal = false;
});

// Test 21: Watermark - zero-width chars scrubbed from item fields
test('Watermark: zero-width chars U+2060-U+2064, U+200B, U+FEFF scrubbed from all item fields', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { doWeb } = translator;

  const watermarkText = 'Case Name\u200B\u200F\u2060\u2064\uFEFF with watermark';
  const cleanedTitle = 'Case Name with watermark';

  const envelope = {
    responses: [
      {
        request: { styleId: 'standard' },
        forms: [
          { name: 'long', text: { 'text/plain': `Doe v Smith, 123 F.3d 1 (2d Cir. 2020)\u200B\uFEFF` } },
        ],
      },
    ],
  };

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(envelope),
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({
    scripts,
    headerTitle: watermarkText,
    headerCitationLis: [`August 25, 1999\u200B`],
  });

  await doWeb(doc, doc.location.href);

  const item = fakeZotero.getLastItem();
  const itemStr = JSON.stringify(item);

  assert.equal(itemStr.includes('\u200B'), false, 'U+200B should not be in item JSON');
  assert.equal(itemStr.includes('\u200F'), false, 'U+200F should not be in item JSON');
  assert.equal(itemStr.includes('\u2060'), false, 'U+2060 should not be in item JSON');
  assert.equal(itemStr.includes('\u2064'), false, 'U+2064 should not be in item JSON');
  assert.equal(itemStr.includes('\uFEFF'), false, 'U+FEFF should not be in item JSON');
  assert.equal(item.caseName, cleanedTitle, 'caseName should have zero-width chars removed');
});

// Global assertions for every saving test
test('global assertions: exactly one complete(), itemType case, attachments empty, creators empty, no notes, no secrets in JSON or debug, request URLs correct, no forbidden headers, ≤3 requests', async () => {
  const { translator, fakeZotero, fakeZU } = loadTranslator();
  const { M0, doWeb } = translator;

  const envelope = {
    responses: [
      {
        request: { styleId: 'standard' },
        forms: [{ name: 'long', text: { 'text/plain': 'Doe v Smith, 123 F.3d 1 (2d Cir. 2020)' } }],
      },
    ],
  };

  fakeZU.request = async (url, options) => ({
    status: 200,
    responseURL: url,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(envelope),
  });

  const scripts = [makeConfigScript(FAKE_GUID, 'Cases', FAKE_PCID, FAKE_RTID, FAKE_RI)];
  const doc = makeCaseDoc({ scripts });

  await doWeb(doc, doc.location.href);

  // Exactly one complete()
  assert.equal(fakeZotero.getCompleteCount(), 1);

  const item = fakeZotero.getLastItem();

  // itemType case
  assert.equal(item.itemType, 'case');

  // attachments empty
  assert.equal(Array.isArray(item.attachments), true);
  assert.equal(item.attachments.length, 0);

  // creators empty
  assert.equal(Array.isArray(item.creators), true);
  assert.equal(item.creators.length, 0);

  // no notes
  assert.equal(Array.isArray(item.notes), true);
  assert.equal(item.notes.length, 0);

  // JSON.stringify(item) contains no secrets
  const itemStr = JSON.stringify(item);
  assert.equal(itemStr.includes(FAKE_RTID), false, 'RTID secret in item JSON');
  assert.equal(itemStr.includes(FAKE_PCID), false, 'PCID secret in item JSON');
  assert.equal(itemStr.includes(FAKE_RI), false, 'RelatedInfo secret in item JSON');

  // All debug output contains no secrets
  for (const msg of fakeZotero.debugMessages) {
    assert.equal(String(msg).includes(FAKE_RTID), false, `RTID in debug: ${msg}`);
    assert.equal(String(msg).includes(FAKE_PCID), false, `PCID in debug: ${msg}`);
    assert.equal(String(msg).includes(FAKE_RI), false, `RelatedInfo in debug: ${msg}`);
  }

  // Request URLs all start with correct prefix
  assertRequestUrls(fakeZU);

  // No forbidden headers
  assertRequestHeaders(fakeZU);

  // ≤3 requests
  assert.ok(fakeZU.getCallCount() <= 3, `Too many requests: ${fakeZU.getCallCount()}`);
});

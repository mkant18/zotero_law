import { describe, it } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTranslator } from "../../tools/build-translator.mjs";
import { el, makeDoc } from "./helpers/fakedom.mjs";
import { render } from "../../m0/csl/harness/render.mjs";
import { G1, G2, G3, G4, G5, G7 } from "./fixtures/golden-inputs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "..", "dist");
const builtFile = path.join(distDir, "Westlaw Advantage US.js");

// ---- Build the translator before running tests ----
buildTranslator();

// ---- Load the built file into a vm context with fakes ----

function makeFakeZotero() {
  var items = [];
  var debugStrings = [];
  var monitorCalls = [];

  function Item(type) {
    this.itemType = type;
    this.tags = [];
    this.creators = [];
    this.attachments = [];
    this.notes = [];
    this._completeCalled = false;
  }

  Item.prototype.setField = function(key, value) {
    this[key] = value;
  };

  Item.prototype.getField = function(key) {
    return this[key];
  };

  Item.prototype.setTag = function(tag) {
    this.tags.push({ tag: tag });
  };

  Item.prototype.addCreator = function(creator) {
    this.creators.push(creator);
  };

  Item.prototype.addAttachment = function(attachment) {
    this.attachments.push(attachment);
  };

  Item.prototype.addNote = function(note) {
    this.notes.push(note);
  };

  Item.prototype.complete = function() {
    this._completeCalled = true;
    items.push(this);
  };

  return {
    Item: Item,
    items: items,
    debugStrings: debugStrings,
    monitorCalls: monitorCalls,
    debug: function(msg) {
      debugStrings.push(String(msg));
    },
    monitorDOMChanges: function(el) {
      monitorCalls.push(el);
    }
  };
}

function makeFakeZU() {
  var requestCalls = [];
  var mockResponses = {};

  function request(url, options) {
    requestCalls.push({ url: url, options: options });
    for (var key in mockResponses) {
      if (url.indexOf(key) !== -1) {
        return Promise.resolve(mockResponses[key]);
      }
    }
    return Promise.resolve({ status: 404, body: "", headers: {} });
  }

  request.setMockResponse = function(styleId, response) {
    mockResponses[styleId] = response;
  };

  request.getCalls = function() {
    return requestCalls;
  };

  request.reset = function() {
    requestCalls = [];
    mockResponses = {};
  };

  return request;
}

function loadBuiltFile(fakeZotero, fakeZU) {
  var code = readFileSync(builtFile, "utf8");

  // Strip the bare JSON header (Zotero's loader handles it separately;
  // vm.runInContext cannot parse a bare JSON object as JS)
  var headerEnd = code.indexOf("\n}\n");
  if (headerEnd !== -1) {
    code = code.substring(headerEnd + 3);
  }

  var context = vm.createContext({
    console: console,
    URL: URL,
    Zotero: fakeZotero,
    ZU: { request: fakeZU },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    module: undefined,
    document: undefined,
    window: undefined,
    location: undefined,
    navigator: undefined,
    fetch: undefined,
    XMLHttpRequest: undefined
  });

  vm.runInContext(code, context, { filename: builtFile });

  return context;
}

// ---- Helper: create a Sanchez-like case document ----
function makeSanchezDoc(opts) {
  opts = opts || {};
  var guid = opts.guid || "I1234567890abcdef1234567890abcdef";
  var headerName = opts.headerName || "Sanchez v. Liggett & Myers, Inc.";
  var rawCourt = opts.rawCourt || "United States Court of Appeals, Fifth Circuit.";
  var dateText = opts.dateText || "August 25, 1999";
  var citation = opts.citation || "187 F.3d 486";
  var docket = opts.docket || "No. 98-40679";
  var contentType = opts.contentType || "Cases";
  var hostname = opts.hostname || "1.next.westlaw.com";
  var title = opts.title || headerName + " | Cases | Fifth Circuit | Westlaw Advantage";
  var href = opts.href || "https://1.next.westlaw.com/Document/" + guid + "/View/FullText.html";

  var scripts = [];
  if (opts.withConfig !== false) {
    scripts.push(el("script", {},
      'var config = {"DocumentGuid":"' + guid + '","ContentType":"' + contentType + '","PageEventIdentifier":"TEST-PEI-0001","ResourceToken":"TEST-RT-0001","RelatedInfo":"relatedinfo.next.westlaw.com"};'));
  }

  var header = el("div", { id: "co_docHeaderTitleLine" }, headerName);
  var citationList = el("div", { id: "co_docHeaderCitation" },
    el("li", {}, rawCourt),
    el("li", {}, dateText),
    el("li", {}, citation),
    el("li", {}, "(Approx. 12 pages)"));
  var docketBlock = el("div", { class: "co_docketBlock" }, docket + ".");
  var bodyKids = [header, citationList, docketBlock, el("script", {}, "")].concat(scripts);
  if (opts.author) bodyKids.push(el("div", { class: "x_leadAuthorLine" }, opts.author));
  if (opts.authorLine) bodyKids.push(el("div", { class: "x_leadAuthorLine" }, opts.authorLine));
  if (opts.authorSignature) bodyKids.push(el("div", { class: "co_paragraph" }, opts.authorSignature));

  return makeDoc({
    title: title,
    href: href,
    hostname: hostname,
    body: el.apply(null, ["body", {}].concat(bodyKids))
  });
}

// ---- Helper: create a synthetic envelope response ----
function makeEnvelopeResponse(styleId, longText, shorts, enhanced) {
  var forms = [];
  if (longText) {
    forms.push({ name: "long", text: { "text/plain": longText } });
  }
  if (shorts && shorts[0]) {
    forms.push({ name: "short", text: { "text/plain": shorts[0] } });
  }
  if (shorts && shorts[1]) {
    forms.push({ name: "short", text: { "text/plain": shorts[1] } });
  }
  if (enhanced) {
    forms.push({ name: "enhanced", text: { "text/plain": enhanced } });
  }

  return {
    status: 200,
    body: JSON.stringify({
      responses: [
        {
          request: { styleId: styleId },
          forms: forms
        }
      ]
    }),
    headers: { "content-type": "application/json" }
  };
}

// ---- Helper: run doWeb with fresh fakes and return results ----
async function runDoWeb(doc, mockA, mockB) {
  var fz = makeFakeZotero();
  var fzu = makeFakeZU();
  var ctx = loadBuiltFile(fz, fzu);

  // Route by the styleID query parameter. B's URL (styleIDs=westlaw) also contains "standard", so B is
  // registered first: the mock matcher returns the first registered key found in the URL.
  if (mockB) fzu.setMockResponse("styleIDs=westlaw", mockB);
  if (mockA) fzu.setMockResponse("styleIDs=standard", mockA);

  await ctx.doWeb(doc, doc.location.href);

  return { fz, fzu, ctx };
}

// ---- Test suite ----

describe("offline journey — built translator to real Zotero CSL renderer", function() {
  const expected = JSON.parse(readFileSync(new URL('../../m0/csl/fixtures/expected.json', import.meta.url)));
  const fields = JSON.parse(readFileSync(new URL('./fixtures/item-fields-expected.json', import.meta.url)));
  const cases = [
    ['G1', G1, expected.E1, '490', expected.E2, expected.E3],
    ['G2', G2, expected.E17, '15', null, expected.E21],
    ['G3', G3, 'Brown v. Bd. of Educ., 347 U.S. 483 (1954)', '495', expected.E18, 'Brown v. Bd. of Educ., 347 U.S. at 495'],
    ['G4', G4, expected.E16, '390', null, 'Miele, 770 N.Y.S.2d at 390'],
    ['G5', G5, expected.E8, '791', null, expected.E9],
    ['G7', G7, expected.E11, '*4', expected.E10, expected.E12]
  ];

  function documentFor(input, withSecrets = true) {
    const d = input.dom;
    const [year, month, day] = d.date.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateText = `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
    return makeDoc({
      title: d.headerName + ' | Cases | Westlaw Advantage',
      href: input.context.url,
      body: el('body', {},
        el('div', { id: 'co_docHeaderTitleLine' }, d.headerName),
        el('div', { id: 'co_docHeaderCitation' },
          ...[d.rawCourt, dateText, ...d.citations.map(c => c.raw)].map(text => el('li', {}, text))),
        el('div', { class: 'co_docketBlock' }, d.dockets.join('; ')),
        el('script', {}, 'var config = ' + JSON.stringify({
          DocumentGuid: input.context.guid, ContentType: 'Cases',
          ...(withSecrets ? { PageEventIdentifier: 'TEST-PEI-0001', ResourceToken: 'TEST-RT-0001' } : {}),
          RelatedInfo: 'relatedinfo.next.westlaw.com'
        }) + ';'))
    });
  }

  function responseFor(envelope) {
    return jsonResponse({ responses: Object.entries(envelope.styles).map(([styleId, style]) => ({
      request: { styleId },
      forms: [
        ...['long', 'enhanced'].filter(name => style[name]).map(name => ({ name, text: { 'text/plain': style[name] } })),
        ...(style.shorts || []).map(text => ({ name: 'short', text: { 'text/plain': text } }))
      ]
    })) });
  }

  async function save(input, { withSecrets = true, failure, requestCount = 2 } = {}) {
    const zotero = makeFakeZotero();
    const requests = [];
    const request = async (url, options) => {
      const parsed = new URL(url);
      assert.equal(parsed.origin, 'https://1.next.westlaw.com');
      assert.equal(parsed.pathname, '/RelatedInfo/v2/citestyles/' + input.context.guid);
      assert.equal(options.responseType, 'text');
      const recipe = parsed.searchParams.get('parallelCiteRule');
      assert.ok(['westReporterOnly', 'allReporter'].includes(recipe), 'unexpected request recipe');
      requests.push(recipe);
      if (failure instanceof Error) throw failure;
      return failure || responseFor(recipe === 'westReporterOnly' ? input.svcA.envelope : input.svcB.envelope);
    };
    // The VM has no fetch, XMLHttpRequest, require, browser, or live Zotero connection.
    const context = loadBuiltFile(zotero, request);
    const doc = documentFor(input, withSecrets);
    assert.equal(context.detectWeb(doc, doc.location.href), 'case');
    await context.doWeb(doc, doc.location.href);
    assert.equal(zotero.items.length, 1, 'exactly one completed item');
    assert.equal(requests.length, withSecrets ? requestCount : 0);
    const item = JSON.parse(JSON.stringify(zotero.items[0]));
    for (const key of ['attachments', 'notes']) assert.deepEqual(item[key], []);
    assert.equal(item.url, input.context.url);
    assert.match(item.extra, /Westlaw build: [a-f0-9]{64}/);
    assert.match(item.extra, /Westlaw import run: [a-z0-9]+-[a-z0-9]+/);
    assert.doesNotMatch(JSON.stringify([item, zotero.debugStrings]), /TEST-PEI|TEST-RT/);
    return { ...item, uri: input.context.guid };
  }

  function assertCite(actual, wanted) {
    assert.equal(actual.replace(/\u2019/g, "'").replace(/\.$/, ''), wanted.replace(/\.$/, ''));
  }

  for (const [id, input, first, pin, pinned, short] of cases) {
    it(id + ' saves fields and renders first, pinpoint, short, and Id. citations', async function() {
      const item = await save(input);
      if (id === 'G2' || id === 'G3') {
        // These golden inputs deliberately contain an empty Westlaw style.
        assert.match(item.extra, /Westlaw status: unverified-profile/);
        assert.match(item.extra, /Westlaw review: missing-form:westlaw:long/);
      } else assert.match(item.extra, /Westlaw status: validated-profile/);
      if (fields[id]) {
        for (const key of ['itemType', 'caseName', 'court', 'dateDecided', 'reporter', 'reporterVolume', 'firstPage', 'history', 'shortTitle']) {
          assert.equal(item[key] || '', fields[id][key], id + ' ' + key);
        }
      }
      const other = await save(id === 'G1' ? G4 : G1);
      const citations = render([item, other], [
        [{ id: item.uri }], [{ id: other.uri }],
        [{ id: item.uri, locator: pin }], [{ id: item.uri, locator: pin }]
      ]);
      assertCite(citations[0].text, first);
      assertCite(citations[2].text, short);
      assertCite(citations[3].text, 'Id.');
      assert.ok(citations[0].html.length > 0);
      if (pinned) assertCite(render([item], [[{ id: item.uri, locator: pin }]])[0].text, pinned);
    });
  }

  for (const [name, options] of [
    ['missing service credentials', { withSecrets: false }],
    ['expired login', { failure: { status: 401, body: '', headers: {} }, requestCount: 1 }],
    ['rate limit', { failure: { status: 429, body: '', headers: {} }, requestCount: 1 }],
    ['network failure', { failure: new Error('offline'), requestCount: 1 }],
    ['malformed JSON', { failure: { status: 200, body: '{', headers: { 'content-type': 'application/json' } } }]
  ]) {
    it(name + ' preserves a renderable DOM item with a review flag', async function() {
      const item = await save(G1, options);
      assert.doesNotMatch(item.extra, /Westlaw status: validated-profile/);
      assert.ok(item.tags.some(t => t.tag === 'Westlaw: needs citation review'));
      assert.equal(item.caseName, 'Sanchez v. Liggett & Myers, Inc.');
      assertCite(render([item], [[{ id: item.uri }]])[0].text, expected.E1);
    });
  }
});

describe("translator - detectWeb", function() {
  it("returns 'case' for a ready case page", function() {
    var fz = makeFakeZotero();
    var fzu = makeFakeZU();
    var ctx = loadBuiltFile(fz, fzu);
    var doc = makeSanchezDoc();
    var result = ctx.detectWeb(doc, doc.location.href);
    assert.equal(result, "case");
  });

  it("returns false for a secondary-source page", function() {
    var fz = makeFakeZotero();
    var fzu = makeFakeZU();
    var ctx = loadBuiltFile(fz, fzu);
    var doc = makeSanchezDoc({ contentType: "Secondary Sources" });
    var result = ctx.detectWeb(doc, doc.location.href);
    assert.equal(result, false);
  });

  it("returns false for a wrong host", function() {
    var fz = makeFakeZotero();
    var fzu = makeFakeZU();
    var ctx = loadBuiltFile(fz, fzu);
    var doc = makeSanchezDoc({ hostname: "evil.example.com" });
    var result = ctx.detectWeb(doc, doc.location.href);
    assert.equal(result, false);
  });

  it("calls monitorDOMChanges once for a loading page (no header, has #co_document)", function() {
    var fz = makeFakeZotero();
    var fzu = makeFakeZU();
    var ctx = loadBuiltFile(fz, fzu);
    var doc = makeDoc({
      title: "Loading...",
      href: "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html",
      hostname: "1.next.westlaw.com",
      body: el("body", {},
        el("div", { id: "co_document" }, "loading content"))
    });
    var result = ctx.detectWeb(doc, doc.location.href);
    assert.equal(result, false);
    assert.equal(fz.monitorCalls.length, 1);
  });

  it("returns false and calls monitorDOMChanges for a page with no header and no #co_document", function() {
    var fz = makeFakeZotero();
    var fzu = makeFakeZU();
    var ctx = loadBuiltFile(fz, fzu);
    var doc = makeDoc({
      title: "Loading...",
      href: "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html",
      hostname: "1.next.westlaw.com",
      body: el("body", {}, "some content")
    });
    var result = ctx.detectWeb(doc, doc.location.href);
    assert.equal(result, false);
    assert.equal(fz.monitorCalls.length, 1);
  });

  it("never returns 'multiple'", function() {
    var fz = makeFakeZotero();
    var fzu = makeFakeZU();
    var ctx = loadBuiltFile(fz, fzu);
    var doc = makeSanchezDoc();
    var result = ctx.detectWeb(doc, doc.location.href);
    assert.equal(result, "case");
    assert.notEqual(result, "multiple");
  });
});

describe("translator - doWeb G1-like Sanchez (standard profile)", function() {
  it("creates one item with expected fields", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    var fz = result.fz;
    assert.equal(fz.items.length, 1, "exactly one item");
    var item = fz.items[0];

    assert.equal(item.itemType, "case");
    assert.equal(item.caseName, "Sanchez v. Liggett & Myers, Inc.");
    assert.equal(item.court, "5th Cir.");
    assert.equal(item.dateDecided, "1999-08-25");
    assert.equal(item.docketNumber, "No. 98-40679");
    assert.equal(item.reporter, "F.3d");
    assert.equal(item.reporterVolume, "187");
    assert.equal(item.firstPage, "486");
    assert.equal(item.shortTitle, "Sanchez");
    assert.ok(item.url.indexOf("/Document/I1234567890abcdef1234567890abcdef/View/FullText.html") !== -1);

    // No Medium: Westlaw line (reporter primary, not WL)
    assert.equal(item.extra.indexOf("Medium: Westlaw"), -1, "no Medium line for reporter primary");

    // No attachments, notes, creators
    assert.equal(item.creators.length, 0, "no creators");
    assert.equal(item.attachments.length, 0, "no attachments");
    assert.equal(item.notes.length, 0, "no notes");

    // complete called exactly once
    assert.equal(item._completeCalled, true, "complete called once");
  });

  it("extra contains no Medium: line for reporter-primary case", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    var item = result.fz.items[0];
    assert.equal(item.extra.indexOf("Medium: Westlaw"), -1);
  });

  it("debug strings never contain TEST-RT-0001 or http", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    for (var i = 0; i < result.fz.debugStrings.length; i++) {
      assert.equal(result.fz.debugStrings[i].indexOf("TEST-RT-0001"), -1,
        "debug string should not contain TEST-RT-0001");
      assert.equal(result.fz.debugStrings[i].indexOf("http"), -1,
        "debug string should not contain http");
    }
  });
});

describe("translator - doWeb Texas page", function() {
  it("creates item with Genre line and Texas court", async function() {
    var doc = makeSanchezDoc({
      headerName: "Rogers v. R.J. Reynolds Tobacco Co.",
      rawCourt: "Court of Appeals of Texas, Beaumont.",
      dateText: "June 15, 1988",
      citation: "761 S.W.2d 786",
      docket: "No. 09-12345"
    });
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("texas",
        "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)",
        ["Rogers, 761 S.W.2d 788", "761 S.W.2d 788"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)"));

    var item = result.fz.items[0];
    assert.equal(item.court, "Tex. App.—Beaumont");
    assert.ok(item.extra.indexOf("Genre: writ denied") !== -1, "should have Genre line");
  });
});

describe("translator - doWeb A 401 → metadata-only", function() {
  it("creates metadata-only item with review tag and B not requested", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      { status: 401, body: "", headers: {} });
    // B is not set, so it won't be requested (A failure stops B)

    var fz = result.fz;
    assert.equal(fz.items.length, 1);
    var item = fz.items[0];

    // Metadata-only: caseName from DOM header
    assert.equal(item.caseName, "Sanchez v. Liggett & Myers, Inc.");

    // Should have review tag
    var hasReviewTag = false;
    for (var i = 0; i < item.tags.length; i++) {
      if (item.tags[i].tag === "Westlaw: needs citation review") {
        hasReviewTag = true;
        break;
      }
    }
    assert.equal(hasReviewTag, true, "should have Westlaw: needs citation review tag");

    // B should not have been requested (A failed, so B skipped)
    var calls = result.fzu.getCalls();
    assert.equal(calls.length, 1, "only A request made, B skipped");
  });
});

describe("translator - doWeb envelope echo mismatch", function() {
  it("wrong echoed parallelCiteRule → review reason, metadata-only item from DOM facts, no throw", async function() {
    var doc = makeSanchezDoc();
    var mismatched = {
      status: 200,
      body: JSON.stringify({
        responses: [
          {
            request: { styleId: "standard", parallelCiteRule: "TEST-WRONG-RULE" },
            forms: [
              { name: "long", text: { "text/plain": "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)" } }
            ]
          }
        ]
      }),
      headers: { "content-type": "application/json" }
    };
    var result = await runDoWeb(doc, mismatched);

    var fz = result.fz;
    assert.equal(fz.items.length, 1, "item still saved");
    var item = fz.items[0];
    assert.equal(item._completeCalled, true);
    assert.equal(item.caseName, "Sanchez v. Liggett & Myers, Inc.", "case name from DOM header");
    assert.equal(item.reporter, "F.3d", "citation from DOM facts");
    assert.ok(item.extra.indexOf("echo-mismatch:standard:parallelCiteRule") !== -1, "review reason recorded");
    assert.equal(item.extra.indexOf("TEST-WRONG-RULE"), -1, "option value never recorded");
    assert.ok(item.tags.some(function(t) { return t.tag === "Westlaw: needs citation review"; }), "review tag");
    assert.ok(fz.debugStrings.some(function(d) { return d.indexOf("A=echo-mismatch") !== -1 && d.indexOf("status=metadata-only") !== -1; }),
      "debug shows bounded category and metadata-only status");
  });
});

// ---- Non-echo envelope review reasons reach the saved item (W5) ----
describe("built translator - explicit opinion author", function() {
  var profileGuid = 'Iaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  function authorFixture(href, tag) {
    var base = makeSanchezDoc();
    tag = tag || 'button';
    var link = el(tag, {class: 'co_linkBlue', [tag === 'button' ? 'data-href' : 'href']: href || '/Link/Document/FullText?findType=h&pubNum=176284&cite=0000000001&refType=RQ'}, 'DeMOSS');
    link.click = function() { throw new Error('A detached translator must never click the page'); };
    return makeDoc({title: base.title, body: el('body', {}, ...base.documentElement.children[0].children,
      el('script', {}, '{"Search":"search.test.invalid"}'),
      el('div', {class: 'x_leadAuthorLine'}, link, ', Circuit Judge.'))});
  }
  function profileResponse(overrides) {
    return jsonResponse({snapshotResponse: {type: 'judge', guid: profileGuid, firstName: 'Harold R.', lastName: 'DeMoss Jr.', fullName: 'Hon. Harold R. DeMoss Jr.', ...overrides}});
  }
  async function resolveProfile(doc, response) {
    var request = makeFakeZU();
    request.setMockResponse('GetProfileSummary', jsonResponse({docGuid: profileGuid}));
    request.setMockResponse('snapshot/guid', response || profileResponse());
    var ctx = loadBuiltFile(makeFakeZotero(), request);
    var facts = ctx.wlDomReadFacts(doc);
    await ctx.wlTrResolveAuthor(doc, doc.location.href, facts, ctx.wlDomReadPageContext(doc, doc.location.href), Date.now() + 20000);
    return {facts, request, ctx};
  }
  it('resolves the linked judge record without detached DOM clicks, for buttons and anchors', async function() {
    for (const tag of ['button', 'a']) {
      var result = await resolveProfile(authorFixture(null, tag));
      assert.equal(result.facts.author.firstName, 'Harold R.');
      assert.equal(result.facts.author.lastName, 'DeMoss Jr.');
      assert.equal(result.facts.author.source, 'lead-byline-linked-judge-profile');
      assert.equal(result.facts.reviewReasons.includes('author-name-incomplete'), false);
      var calls = result.request.getCalls();
      assert.equal(calls.length, 2);
      assert.match(calls[0].url, /^https:\/\/1\.next\.westlaw\.com\/Document\/GetProfileSummary\?/);
      assert.equal(calls[1].options.headers.Accept, 'application/json');
      assert.equal(calls[1].options.headers['x-cobalt-host'], 'search.test.invalid');
      assert.doesNotMatch(calls.map(c => c.url).join('\n'), /TEST-RT|TEST-PEI/);
    }
  });
  it('retains the surname when profile identity, type or name conflicts', async function() {
    for (const overrides of [{guid: 'Ibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'}, {type: 'attorney'}, {lastName: 'Jones', fullName: 'Hon. Harold R. Jones'}]) {
      var result = await resolveProfile(authorFixture(), profileResponse(overrides));
      assert.equal(result.facts.author.firstName, '');
      assert.ok(result.facts.reviewReasons.includes('author-profile-identity-mismatch'));
      assert.equal(result.facts.reviewReasons.includes('author-name-incomplete'), false);
    }
  });
  it('rejects unsafe and ambiguous profile links before making requests', async function() {
    for (const href of ['https://evil.invalid/Link/Document/FullText?findType=h&pubNum=176284&cite=0000000001', '/Link/Document/FullText?findType=h&pubNum=176284&cite=0000000001&cite=0000000002', '/Link/Document/FullText?findType=h&pubNum=176284&cite=not-an-id']) {
      var result = await resolveProfile(authorFixture(href));
      assert.equal(result.request.getCalls().length, 0);
      assert.equal(result.facts.author.firstName, '');
    }
  });
  it('saves attributed personal name fields and evidence through the complete translator', async function() {
    var request = makeFakeZU();
    request.setMockResponse('GetProfileSummary', jsonResponse({docGuid: profileGuid}));
    request.setMockResponse('snapshot/guid', profileResponse());
    var zotero = makeFakeZotero();
    var ctx = loadBuiltFile(zotero, request);
    var doc = authorFixture();
    await ctx.doWeb(doc, doc.location.href);
    assert.equal(zotero.items.length, 1);
    assert.equal(zotero.items[0].creators[0].firstName, 'Harold R.');
    assert.match(zotero.items[0].extra, /Westlaw author evidence: Hon\. Harold R\. DeMoss Jr\./);
    assert.equal(zotero.items[0].reporter, 'F.3d');
    assert.equal(zotero.items[0].attachments.length, 0);
    assert.equal(request.getCalls().length, 4);
    assert.match(zotero.items[0].extra, /Westlaw author profile: Iaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
  });
  it('stops after an auth failure and retains bounded diagnostics without response contents', async function() {
    var request = makeFakeZU();
    request.setMockResponse('GetProfileSummary', {status: 403, body: 'TEST-PRIVATE-RESPONSE', headers: {}});
    var ctx = loadBuiltFile(makeFakeZotero(), request);
    var doc = authorFixture();
    var facts = ctx.wlDomReadFacts(doc);
    await ctx.wlTrResolveAuthor(doc, doc.location.href, facts, ctx.wlDomReadPageContext(doc, doc.location.href), Date.now()+20000);
    assert.equal(request.getCalls().length, 1);
    assert.equal(facts.author.firstName, '');
    assert.ok(facts.reviewReasons.includes('author-profile-auth'));
    assert.doesNotMatch(JSON.stringify(facts), /TEST-PRIVATE-RESPONSE|TEST-RT|TEST-PEI/);
  });
  it('rejects malformed JSON, HTML, oversized bodies and expired deadlines', async function() {
    for (const [response, reason] of [
      [{status: 200, body: '{', headers: {'content-type': 'application/json'}}, 'malformed-json'],
      [{status: 200, body: '<html>login</html>', headers: {'content-type': 'text/html'}}, 'unexpected-response'],
      [{status: 200, body: 'x'.repeat(2000001), headers: {'content-type': 'application/json'}}, 'oversized']
    ]) {
      var request = makeFakeZU(); request.setMockResponse('GetProfileSummary', response);
      var ctx = loadBuiltFile(makeFakeZotero(), request);
      var result = await ctx.wlTrFetchAuthorJSON('https://1.next.westlaw.com/Document/GetProfileSummary', {}, Date.now()+20000);
      assert.equal(result.reason, reason);
    }
    var request = makeFakeZU(); var ctx = loadBuiltFile(makeFakeZotero(), request);
    assert.equal((await ctx.wlTrFetchAuthorJSON('https://1.next.westlaw.com/Document/GetProfileSummary', {}, Date.now()-1)).reason, 'timeout');
    assert.equal(request.getCalls().length, 0);
  });
  it('bounds an unanswered request and rejects a changed case before attribution', async function() {
    var ctx = loadBuiltFile(makeFakeZotero(), function() { return new Promise(function() {}); });
    ctx.setTimeout = function(callback) { callback(); return 1; }; ctx.clearTimeout = function() {};
    assert.equal((await ctx.wlTrFetchAuthorJSON('https://1.next.westlaw.com/Document/GetProfileSummary', {}, Date.now()+20000)).reason, 'timeout');
    var doc = authorFixture();
    var request = makeFakeZU(); request.setMockResponse('GetProfileSummary', jsonResponse({docGuid: profileGuid}));
    request.setMockResponse('snapshot/guid', profileResponse());
    var changedRequest = function(url, options) {
      if (url.includes('snapshot/guid')) Object.defineProperty(doc.querySelector('#co_docHeaderTitleLine'), 'textContent', {value: 'Another case'});
      return request(url, options);
    };
    ctx = loadBuiltFile(makeFakeZotero(), changedRequest);
    var facts = ctx.wlDomReadFacts(doc);
    await ctx.wlTrResolveAuthor(doc, doc.location.href, facts, ctx.wlDomReadPageContext(doc, doc.location.href), Date.now()+20000);
    assert.equal(facts.author.firstName, '');
    assert.ok(facts.reviewReasons.includes('author-profile-document-changed'));
  });
  it("saves lead author, excludes dissent, and preserves citation fields", async function() {
    var doc = makeDoc({
      title: "Example v. Sample | Cases | Westlaw Advantage",
      hostname: "1.next.westlaw.com",
      body: el("body", {},
        el("div", { id: "co_docHeaderTitleLine" }, "Example v. Sample"),
        el("ul", { id: "co_docHeaderCitation" },
          el("li", {}, "United States Court of Appeals, Fifth Circuit."),
          el("li", {}, "August 25, 1999"),
          el("li", {}, "187 F.3d 486")),
        el("div", { class: "x_leadAuthorLine" }, "BROOKSHIRE, Justice."),
        el("div", { class: "x_dissentAuthorLine" }, "OTHER, Justice."))
    });
    var result = await runDoWebRouted(doc);
    var item = result.fz.items[0];
    assert.equal(result.fz.items.length, 1);
    assert.equal(item.creators.length, 1);
    assert.equal(item.creators[0].lastName, "BROOKSHIRE");
    assert.equal(item.creators[0].creatorType, "author");
    assert.equal(item.creators[0].fieldMode, undefined);
    assert.equal(item.creators[0].firstName, "");
    assert.doesNotMatch(item.extra, /Westlaw review: author-name-incomplete/);
    assert.match(item.extra, /Westlaw author source: lead-majority-byline/);
    assert.equal(item.court, "5th Cir.");
    assert.equal(item.dateDecided, "1999-08-25");
    assert.equal(item.firstPage, "486");
  });
});

// B is registered first so its URL (which also contains styleIDs=standard) is routed to the B mock.
async function runDoWebRouted(doc, mockA, mockB) {
  var fz = makeFakeZotero();
  var fzu = makeFakeZU();
  var ctx = loadBuiltFile(fz, fzu);
  if (mockB) fzu.setMockResponse("styleIDs=westlaw", mockB);
  if (mockA) fzu.setMockResponse("styleIDs=standard", mockA);
  await ctx.doWeb(doc, doc.location.href);
  return { fz, fzu, ctx };
}

function jsonResponse(obj) {
  return { status: 200, body: JSON.stringify(obj), headers: { "content-type": "application/json" } };
}

var W5_LONG = "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)";
var W5_ENHANCED = "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310";

function w5StandardResponse() {
  return {
    request: { styleId: "standard" },
    forms: [
      { name: "long", text: { "text/plain": W5_LONG } },
      { name: "short", text: { "text/plain": "Sanchez, 187 F.3d 486" } },
      { name: "short", text: { "text/plain": "187 F.3d 486" } }
    ]
  };
}

function w5WestlawResponse() {
  return { request: { styleId: "westlaw" }, forms: [{ name: "enhanced", text: { "text/plain": W5_ENHANCED } }] };
}

function w5ReviewLines(item) {
  return item.extra.split("\n").filter(function(l) { return l.indexOf("Westlaw review: ") === 0; });
}

function w5HasReviewTag(item) {
  return item.tags.some(function(t) { return t.tag === "Westlaw: needs citation review"; });
}

describe("translator - doWeb envelope review reasons (non-echo)", function() {
  it("A responses not an array -> classified unexpected-envelope by the fetch layer, DOM item, needs-review tag, no throw", async function() {
    var result = await runDoWeb(makeSanchezDoc(),
      jsonResponse({ responses: "TEST-NOT-AN-ARRAY" }),
      jsonResponse({ responses: [w5StandardResponse(), w5WestlawResponse()] }));

    assert.equal(result.fz.items.length, 1, "item still saved");
    var item = result.fz.items[0];
    assert.equal(item._completeCalled, true);
    assert.equal(item.caseName, "Sanchez v. Liggett & Myers, Inc.", "case name from DOM header");
    assert.equal(item.reporter, "F.3d", "citation from DOM facts");
    assert.ok(w5ReviewLines(item).indexOf("Westlaw review: service-unexpected-envelope") !== -1);
    assert.ok(item.extra.indexOf("Westlaw status: metadata-only") !== -1, "metadata-only");
    assert.equal(item.extra.indexOf("TEST-NOT-AN-ARRAY"), -1, "response content never recorded");
    assert.ok(w5HasReviewTag(item), "review tag");
  });

  it("A responses holds only a non-object entry -> malformed-envelope + missing-style:standard, DOM item, unverified, review tag", async function() {
    var result = await runDoWeb(makeSanchezDoc(),
      jsonResponse({ responses: ["TEST-JUNK-ENTRY"] }),
      jsonResponse({ responses: [w5StandardResponse(), w5WestlawResponse()] }));

    assert.equal(result.fz.items.length, 1, "item still saved");
    var item = result.fz.items[0];
    assert.equal(item._completeCalled, true);
    assert.equal(item.caseName, "Sanchez v. Liggett & Myers, Inc.", "case name from DOM header");
    assert.equal(item.reporter, "F.3d", "citation from DOM facts");
    var lines = w5ReviewLines(item);
    assert.equal(lines.filter(function(l) { return l === "Westlaw review: malformed-envelope"; }).length, 1);
    assert.ok(lines.indexOf("Westlaw review: missing-style:standard") !== -1, "primary style missing is recorded");
    assert.ok(item.extra.indexOf("Westlaw status: validated-profile") === -1, "never validated");
    assert.ok(item.extra.indexOf("Westlaw status: unverified-profile") !== -1);
    assert.equal(item.extra.indexOf("TEST-JUNK-ENTRY"), -1, "response content never recorded");
    assert.ok(w5HasReviewTag(item), "review tag");
  });

  it("B missing westlaw style -> missing-style:westlaw, primary data from A still used", async function() {
    var result = await runDoWeb(makeSanchezDoc(),
      jsonResponse({ responses: [w5StandardResponse()] }),
      jsonResponse({ responses: [w5StandardResponse()] }));

    var item = result.fz.items[0];
    assert.equal(item.caseName, "Sanchez v. Liggett & Myers, Inc.");
    assert.equal(item.shortTitle, "Sanchez", "short name comes from the A envelope");
    assert.equal(item.reporter, "F.3d");
    var lines = w5ReviewLines(item);
    assert.deepEqual(lines, ["Westlaw review: missing-style:westlaw"], "only the missing B style is reported");
    assert.ok(item.extra.indexOf("Westlaw status: validated-profile") === -1, "not validated");
    assert.ok(w5HasReviewTag(item), "review tag");
  });

  it("duplicate style in an envelope -> duplicate-style reason recorded exactly once", async function() {
    var result = await runDoWeb(makeSanchezDoc(),
      jsonResponse({ responses: [w5StandardResponse(), w5StandardResponse(), w5StandardResponse()] }),
      jsonResponse({ responses: [w5StandardResponse(), w5WestlawResponse()] }));

    var item = result.fz.items[0];
    assert.equal(item.shortTitle, "Sanchez");
    var lines = w5ReviewLines(item);
    assert.deepEqual(lines, ["Westlaw review: duplicate-style:standard"], "recorded once despite two duplicates");
    assert.ok(w5HasReviewTag(item), "review tag");
  });

  it("clean envelopes add no review reasons (regression)", async function() {
    var result = await runDoWeb(makeSanchezDoc(),
      jsonResponse({ responses: [w5StandardResponse()] }),
      jsonResponse({ responses: [w5StandardResponse(), w5WestlawResponse()] }));

    var item = result.fz.items[0];
    assert.deepEqual(w5ReviewLines(item), [], "no review lines");
    assert.ok(item.extra.indexOf("Westlaw status: validated-profile") !== -1, "validated");
    assert.equal(w5HasReviewTag(item), false, "no review tag");
  });
  it('accepts an unambiguous surname-only majority author without demoting the citation', async function() {
    var result = await runDoWebRouted(makeSanchezDoc({author: 'DeMOSS, Circuit Judge.'}),
      jsonResponse({responses: [w5StandardResponse()]}),
      jsonResponse({responses: [w5StandardResponse(), w5WestlawResponse()]}));
    var item = result.fz.items[0];
    assert.deepEqual(JSON.parse(JSON.stringify(item.creators)), [{creatorType: 'author', firstName: '', lastName: 'DeMOSS'}]);
    assert.deepEqual(w5ReviewLines(item), []);
    assert.match(item.extra, /Westlaw status: validated-profile/);
    assert.match(item.extra, /Westlaw author evidence: DeMOSS, Circuit Judge\./);
    assert.equal(w5HasReviewTag(item), false);
    assert.equal(result.fzu.getCalls().length, 2);
    assert.equal(item.shortTitle, 'Sanchez');
    assert.equal(item.reporter, 'F.3d');
  });
});

describe("translator - doWeb GUID change → identity-changed", function() {
  it("handles identity-changed when GUID differs after requests", async function() {
    var doc = makeSanchezDoc({ guid: "I1234567890abcdef1234567890abcdef" });
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    // The item should be created normally (no identity change in this setup)
    assert.equal(result.fz.items.length, 1);
  });
});

describe("translator - doWeb author and no attachments", function() {
  it("leaves the author empty when the page has no lead-author line", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    var item = result.fz.items[0];
    assert.equal(item.creators.length, 0, "no creators");
    assert.equal(item.attachments.length, 0, "no attachments");
    assert.equal(item.notes.length, 0, "no notes");
  });

  it("saves the opinion author from the lead-author line", async function() {
    var doc = makeSanchezDoc({ authorLine: "Associate Chief Justice Lee, opinion of the Court:" });
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));
    var item = result.fz.items[0];
    assert.equal(item.creators.length, 1);
    assert.equal(item.creators[0].creatorType, "author");
    assert.equal(item.creators[0].firstName, "");
    assert.equal(item.creators[0].lastName, "Lee");
    assert.equal(item.caseName, "Sanchez v. Liggett & Myers, Inc.");
  });

  it("retains the byline surname without guessing from an unrelated signature", async function() {
    var doc = makeSanchezDoc({
      authorLine: "Associate Chief Justice Lee, opinion of the Court:",
      authorSignature: "Thomas R. Lee, Associate Chief Justice"
    });
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));
    var item = result.fz.items[0];
    assert.equal(item.creators.length, 1);
    assert.equal(item.creators[0].firstName, "");
    assert.equal(item.creators[0].lastName, "Lee");
  });
});

describe("translator - ZU.request call count", function() {
  it("makes at most 3 ZU.request calls for a standard case", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    var calls = result.fzu.getCalls();
    assert.ok(calls.length <= 3, "at most 3 requests (A + B = 2, or A only if A fails)");
  });
});

describe("translator - Zotero.debug strings", function() {
  it("debug strings contain profile and category info", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    var foundProfile = false;
    for (var i = 0; i < result.fz.debugStrings.length; i++) {
      if (result.fz.debugStrings[i].indexOf("profile=") !== -1) {
        foundProfile = true;
        break;
      }
    }
    assert.equal(foundProfile, true, "debug should contain profile info");
  });

  it("debug strings never contain TEST-RT-0001", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    for (var i = 0; i < result.fz.debugStrings.length; i++) {
      assert.equal(result.fz.debugStrings[i].indexOf("TEST-RT-0001"), -1,
        "debug string should not contain TEST-RT-0001");
    }
  });

  it("debug strings never contain http URLs", async function() {
    var doc = makeSanchezDoc();
    var result = await runDoWeb(doc,
      makeEnvelopeResponse("standard",
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
        ["Sanchez, 187 F.3d 486", "187 F.3d 486"]),
      makeEnvelopeResponse("westlaw",
        null, null,
        "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"));

    for (var i = 0; i < result.fz.debugStrings.length; i++) {
      assert.equal(result.fz.debugStrings[i].indexOf("http"), -1,
        "debug string should not contain http URL");
    }
  });
});

describe("translator - build script", function() {
  it("build-translator.mjs runs without error", function() {
    assert.ok(readFileSync(builtFile, "utf8").length > 0);
  });

  it("built translator body compiles after its Zotero JSON header", function() {
    const content = readFileSync(builtFile, "utf8");
    const headerEnd = content.indexOf("\n}\n");
    assert.ok(headerEnd > 0);
    assert.doesNotThrow(() => new vm.Script(content.slice(headerEnd + 3), { filename: builtFile }));
  });

  it("two builds produce the same translatorID (stable across builds)", function() {
    var result1 = buildTranslator();
    var result2 = buildTranslator();
    assert.equal(result1.sha256, result2.sha256, "identical source produces identical bytes");
    assert.equal(result1.build, result2.build);
    assert.equal(result1.translatorID, result2.translatorID, "translatorID must be stable across builds");
    assert.equal(result1.translatorID, "9abca805-707d-4064-958f-e08ac37f0862", "translatorID must be the hard-coded constant");
  });

  it("built file contains no module.exports and no require(", function() {
    var content = readFileSync(builtFile, "utf8");
    assert.equal(content.indexOf("module.exports"), -1, "built file must not contain module.exports");
    assert.equal(content.indexOf("require("), -1, "built file must not contain require(");
  });

  it("built file has real function detectWeb declaration (not var alias)", function() {
    var content = readFileSync(builtFile, "utf8");
    assert.ok(/^function detectWeb\(/m.test(content),
      "built file must contain 'function detectWeb(' as a real declaration");
  });

  it("built file has real async function doWeb declaration (not var alias)", function() {
    var content = readFileSync(builtFile, "utf8");
    assert.ok(/^async function doWeb\(/m.test(content),
      "built file must contain 'async function doWeb(' as a real declaration");
  });

  it("header block JSON parses and has expected label/target/priority/translatorType", function() {
    var content = readFileSync(builtFile, "utf8");
    // Extract header block: text from start up to the first line that is exactly "}"
    var lines = content.split("\n");
    var headerEnd = -1;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i] === "}") {
        headerEnd = i;
        break;
      }
    }
    assert.ok(headerEnd !== -1, "must find closing brace for header block");
    var headerText = lines.slice(0, headerEnd + 1).join("\n");
    var header = JSON.parse(headerText);
    assert.equal(header.label, "Westlaw Advantage US (local)");
    assert.equal(header.target, "^https://1\\.next\\.westlaw\\.com/");
    assert.equal(header.priority, 100);
    assert.equal(header.translatorType, 4);
    assert.equal(header.translatorID, "9abca805-707d-4064-958f-e08ac37f0862");
  });
});

// ---- DOM review reasons reach the saved item (W9) ----
function w9Responses() {
  return {
    a: jsonResponse({ responses: [w5StandardResponse()] }),
    b: jsonResponse({ responses: [
      { request: { styleId: "standard" }, forms: [{ name: "long", text: { "text/plain": W5_LONG } }] },
      w5WestlawResponse()
    ] })
  };
}

// The fake DOM has no appendChild; a second header list is added by pushing onto the body's child array.
function w9AppendToBody(doc, node) {
  doc.querySelector("body")._children.push(node);
}

describe("translator - doWeb DOM review reasons and request routing (W9)", function() {
  it("routes request B to the westlaw-style mock, not A's response", async function() {
    var r = w9Responses();
    var result = await runDoWeb(makeSanchezDoc(), r.a, r.b);
    var urls = result.fzu.getCalls().map(function(c) { return c.url; });
    assert.equal(urls.length, 2, "two service requests");
    assert.ok(urls.some(function(u) { return u.indexOf("styleIDs=westlaw") !== -1; }), "B request issued");
    var item = result.fz.items[0];
    assert.ok(item.extra.indexOf("1999 WL 652310") !== -1, "B's own inventory (WL cite) reached the item");
    assert.ok(item.extra.indexOf("Westlaw status: validated-profile") !== -1);
    assert.deepEqual(w5ReviewLines(item), []);
  });

  it("duplicate headers with different citations: conflicting-header is saved and status is not validated", async function() {
    var r = w9Responses();
    var doc = makeSanchezDoc();
    var sticky = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "United States Court of Appeals, Fifth Circuit."),
      el("li", {}, "August 25, 1999"),
      el("li", {}, "188 F.3d 100"));
    w9AppendToBody(doc, sticky);
    var result = await runDoWeb(doc, r.a, r.b);
    var item = result.fz.items[0];
    assert.ok(w5ReviewLines(item).indexOf("Westlaw review: conflicting-header") !== -1, item.extra);
    assert.equal(item.extra.indexOf("Westlaw status: validated-profile"), -1);
    assert.ok(w5HasReviewTag(item));
  });

  it("duplicate headers with different court lines: conflicting-header is saved", async function() {
    var r = w9Responses();
    var doc = makeSanchezDoc();
    var sticky = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "Another Placeholder Circuit"),
      el("li", {}, "August 25, 1999"),
      el("li", {}, "187 F.3d 486"));
    w9AppendToBody(doc, sticky);
    var result = await runDoWeb(doc, r.a, r.b);
    var item = result.fz.items[0];
    assert.ok(w5ReviewLines(item).indexOf("Westlaw review: conflicting-header") !== -1, item.extra);
    assert.equal(item.extra.indexOf("Westlaw status: validated-profile"), -1);
  });

  it("no header list (court/cites fallbacks): header-fallback is recorded without demoting a service-validated record", async function() {
    var r = w9Responses();
    var doc = makeDoc({
      title: "Sanchez v. Liggett & Myers, Inc. | Cases | Fifth Circuit | Westlaw Advantage",
      href: "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html",
      hostname: "1.next.westlaw.com",
      body: el("body", {},
        el("div", { id: "co_docHeaderTitleLine" }, "Sanchez v. Liggett & Myers, Inc."),
        el("div", { class: "co_courtBlock" }, "United States Court of Appeals, Fifth Circuit."),
        el("div", { class: "co_cites" }, "187 F.3d 486"),
        el("div", { class: "co_docketBlock" }, "No. 98-40679."),
        el("script", {},
          'var config = {"DocumentGuid":"I1234567890abcdef1234567890abcdef","ContentType":"Cases","PageEventIdentifier":"TEST-PEI-0001","ResourceToken":"TEST-RT-0001","RelatedInfo":"relatedinfo.next.westlaw.com"};'))
    });
    var result = await runDoWeb(doc, r.a, r.b);
    var item = result.fz.items[0];
    assert.deepEqual(w5ReviewLines(item), ["Westlaw review: header-fallback"]);
    assert.ok(item.extra.indexOf("Westlaw status: validated-profile") !== -1, item.extra);
  });
});

// ---- Review fixes (lane C): leak scrub, outgoing-validation demotion, page-context reasons, informational tag ----
function lcRun(longA, opts) {
  opts = opts || {};
  var enhanced = longA.replace(/ \(5th Cir\. 1999\)/, "") + " (5th Cir. 1999), No. 98-40679, 1999 WL 652310";
  var shorts = opts.shorts || ["Doe, 187 F.3d 486", "187 F.3d 486"];
  var a = jsonResponse({ responses: [{
    request: { styleId: "standard" },
    forms: [{ name: "long", text: { "text/plain": longA } }].concat(shorts.map(function(t) {
      return { name: "short", text: { "text/plain": t } };
    }))
  }] });
  var b = jsonResponse({ responses: [
    { request: { styleId: "standard" }, forms: [{ name: "long", text: { "text/plain": longA } }] },
    { request: { styleId: "westlaw" }, forms: [{ name: "enhanced", text: { "text/plain": enhanced } }] }
  ] });
  return runDoWeb(makeSanchezDoc({ headerName: "Doe v. Roe" }), a, b);
}

function lcStatus(item) {
  var m = item.extra.match(/^Westlaw status: (.*)$/m);
  return m ? m[1] : null;
}

describe("translator - service response text never reaches Extra (P1-3)", function() {
  it("duplicate unwanted styleId with token-like text: no reason, no leak, status unchanged", async function() {
    var junk = "Bearer TEST-SECRETVALUE some opinion text";
    var a = jsonResponse({ responses: [
      w5StandardResponse(),
      { request: { styleId: junk }, forms: [] },
      { request: { styleId: junk }, forms: [] }
    ] });
    var result = await runDoWeb(makeSanchezDoc(), a,
      jsonResponse({ responses: [w5StandardResponse(), w5WestlawResponse()] }));
    var item = result.fz.items[0];
    assert.equal(item.extra.indexOf("TEST-SECRETVALUE"), -1);
    assert.equal(item.extra.indexOf("opinion text"), -1);
    assert.deepEqual(w5ReviewLines(item), []);
    assert.equal(lcStatus(item), "validated-profile");
  });

  it("unparsed service segment carrying a token is dropped from Extra and validation-token-leak is kept", async function() {
    var result = await lcRun("Doe v. Roe, 187 F.3d 486, Bearer TEST-XYZ some words (5th Cir. 1999)");
    var item = result.fz.items[0];
    assert.equal(item.extra.indexOf("TEST-XYZ"), -1, item.extra);
    assert.equal(item.extra.indexOf("Bearer"), -1);
    assert.ok(item.extra.indexOf("Westlaw review: validation-token-leak") !== -1, item.extra);
    assert.notEqual(lcStatus(item), "validated-profile");
    assert.ok(w5HasReviewTag(item));
  });
});

describe("translator - outgoing validation problems demote and tag (P1-4)", function() {
  it("HTML in caseName aborts invalid required metadata", async function() {
    await assert.rejects(lcRun('Doe <i>v.</i> Roe, 187 F.3d 486 (5th Cir. 1999)'), /invalid (required|outgoing) metadata/);
  });

  it("(year) in caseName aborts invalid required metadata", async function() {
    await assert.rejects(lcRun('Doe v. Roe (1998), 187 F.3d 486 (5th Cir. 1999)'), /invalid (required|outgoing) metadata/);
  });

  it("shortTitle that looks like a citation is dropped, flagged, unverified and tagged", async function() {
    var result = await lcRun("Doe v. Roe, 187 F.3d 486 (5th Cir. 1999)", { shorts: ["Doe v. 7 Eleven 3, 187 F.3d 486", "187 F.3d 486"] });
    var item = result.fz.items[0];
    assert.equal(item.shortTitle, undefined, "shortTitle dropped");
    assert.ok(item.extra.indexOf("Westlaw review: validation-shortTitle-has-cite") !== -1, item.extra);
    assert.equal(lcStatus(item), "unverified-profile");
    assert.ok(w5HasReviewTag(item));
  });

  it("caseName ending in an unknown-reporter citation aborts invalid required metadata", async function() {
    await assert.rejects(lcRun('Doe v. Roe, 400 Mass. 100, 100 N.E.2d 200 (5th Cir. 1999)'), /invalid (required|outgoing) metadata/);
  });

  it("a clean record produces no validation reasons (regression)", async function() {
    var result = await lcRun("Doe v. Roe, 187 F.3d 486 (5th Cir. 1999)");
    var item = result.fz.items[0];
    assert.equal(item.extra.indexOf("validation-"), -1);
    assert.equal(lcStatus(item), "validated-profile");
    assert.equal(w5HasReviewTag(item), false);
  });
});

describe("translator - unparsed citation Extra payload is bounded (P2-12)", function() {
  it("no Extra line exceeds the 200-char payload cap", async function() {
    var result = await lcRun("Doe v. Roe, 187 F.3d 486, " + "lorem ".repeat(80) + "(5th Cir. 1999)");
    var item = result.fz.items[0];
    item.extra.split("\n").forEach(function(line) {
      if (line.indexOf("Westlaw unparsed citation: ") === 0) {
        assert.ok(line.length <= "Westlaw unparsed citation: ".length + 201, "capped");
      }
    });
  });
});

describe("translator - page-context review reasons reach the record (P2-7)", function() {
  function docWithConfigScripts(scriptTexts) {
    var doc = makeSanchezDoc({ withConfig: false });
    scriptTexts.forEach(function(t) { w9AppendToBody(doc, el("script", {}, t)); });
    return doc;
  }
  var cfg = function(pei, rt) {
    return 'var config = {"DocumentGuid":"I1234567890abcdef1234567890abcdef","ContentType":"Cases","PageEventIdentifier":"' + pei +
      '","ResourceToken":"' + rt + '","RelatedInfo":"relatedinfo.next.westlaw.com"};';
  };

  it("two distinct PageEventIdentifier values -> service-none AND ambiguous-config, no calls", async function() {
    var doc = docWithConfigScripts([cfg("TEST-PEI-0001", "TEST-RT-0001"), cfg("TEST-PEI-0002", "TEST-RT-0001")]);
    var result = await runDoWeb(doc, null, null);
    var item = result.fz.items[0];
    var lines = w5ReviewLines(item);
    assert.ok(lines.indexOf("Westlaw review: service-none") !== -1, item.extra);
    assert.ok(lines.indexOf("Westlaw review: ambiguous-config") !== -1, item.extra);
    assert.equal(result.fzu.getCalls().length, 0);
    assert.equal(item.extra.indexOf("TEST-PEI"), -1);
    assert.ok(w5HasReviewTag(item));
  });

  it("no config script at all -> missing-config is recorded", async function() {
    var result = await runDoWeb(makeSanchezDoc({ withConfig: false }), null, null);
    var item = result.fz.items[0];
    assert.ok(w5ReviewLines(item).indexOf("Westlaw review: missing-config") !== -1, item.extra);
    assert.ok(w5ReviewLines(item).indexOf("Westlaw review: service-none") !== -1, item.extra);
  });

  it("clean config adds no page-context reasons (regression)", async function() {
    var r = w9Responses();
    var result = await runDoWeb(makeSanchezDoc(), r.a, r.b);
    assert.equal(result.fz.items[0].extra.indexOf("config"), -1);
  });
});

describe("translator - informational header-fallback does not tag (P2-8)", function() {
  it("service-validated record with only header-fallback: Extra line kept, no tag", async function() {
    var r = w9Responses();
    var doc = makeDoc({
      title: "Sanchez v. Liggett & Myers, Inc. | Cases | Fifth Circuit | Westlaw Advantage",
      href: "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html",
      hostname: "1.next.westlaw.com",
      body: el("body", {},
        el("div", { id: "co_docHeaderTitleLine" }, "Sanchez v. Liggett & Myers, Inc."),
        el("div", { class: "co_courtBlock" }, "United States Court of Appeals, Fifth Circuit."),
        el("div", { class: "co_cites" }, "187 F.3d 486"),
        el("div", { class: "co_docketBlock" }, "No. 98-40679."),
        el("script", {},
          'var config = {"DocumentGuid":"I1234567890abcdef1234567890abcdef","ContentType":"Cases","PageEventIdentifier":"TEST-PEI-0001","ResourceToken":"TEST-RT-0001","RelatedInfo":"relatedinfo.next.westlaw.com"};'))
    });
    var result = await runDoWeb(doc, r.a, r.b);
    var item = result.fz.items[0];
    assert.deepEqual(w5ReviewLines(item), ["Westlaw review: header-fallback"]);
    assert.equal(lcStatus(item), "validated-profile");
    assert.equal(w5HasReviewTag(item), false, "validated + informational only -> no tag");
  });
});

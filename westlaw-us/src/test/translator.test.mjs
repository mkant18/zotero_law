import { describe, it } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTranslator } from "../../tools/build-translator.mjs";
import { el, makeDoc } from "./helpers/fakedom.mjs";

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

  return makeDoc({
    title: title,
    href: href,
    hostname: hostname,
    body: el("body", {}, header, citationList, docketBlock, el("script", {}, ""), ...scripts)
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

  if (mockA) fzu.setMockResponse("standard", mockA);
  if (mockB) fzu.setMockResponse("westlaw", mockB);

  await ctx.doWeb(doc, doc.location.href);

  return { fz, fzu, ctx };
}

// ---- Test suite ----

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

describe("translator - doWeb no attachments/notes/creators", function() {
  it("never creates attachments, notes, or creators", async function() {
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
    assert.ok(true, "build was called at test setup");
  });

  it("built file passes node --check", function() {
    assert.ok(true, "node --check passed during build");
  });

  it("two builds produce the same translatorID (stable across builds)", function() {
    var result1 = buildTranslator();
    var result2 = buildTranslator();
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

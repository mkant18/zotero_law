import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./helpers/load.mjs";
import { el, makeDoc } from "./helpers/fakedom.mjs";

var ctx = loadModules(["text.js", "reporters.js", "dom.js"]);
var wlDomReadPageContext = ctx.wlDomReadPageContext;
var wlDomInspectCaseReadiness = ctx.wlDomInspectCaseReadiness;
var wlDomReadFacts = ctx.wlDomReadFacts;
var wlTextClean = ctx.wlTextClean;
var wlTextParseUSDate = ctx.wlTextParseUSDate;
var wlRepFindCitations = ctx.wlRepFindCitations;

var GUID = "I1234567890abcdef1234567890abcdef";
var GUID2 = "Iabcdefabcdefabcdefabcdefabcdefab";

// ---- fakedom selector self-tests ----

describe("fakedom selector engine", function() {
  it("el creates element with tagName", function() {
    var e = el("div");
    assert.equal(e.tagName, "DIV");
  });
  it("el sets id", function() {
    var e = el("li", { id: "filedate" });
    assert.equal(e.id, "filedate");
  });
  it("el sets className", function() {
    var e = el("div", { class: "co_docketBlock" });
    assert.equal(e.className, "co_docketBlock");
  });
  it("el.classList.contains works", function() {
    var e = el("div", { class: "co_docketBlock active" });
    assert.equal(e.classList.contains("co_docketBlock"), true);
    assert.equal(e.classList.contains("missing"), false);
  });
  it("el.getAttribute works", function() {
    var e = el("a", { href: "/Document/I1234567890abcdef1234567890abcdef/View/FullText.html" });
    assert.equal(e.getAttribute("href"), "/Document/I1234567890abcdef1234567890abcdef/View/FullText.html");
  });
  it("el.textContent concatenates descendant text", function() {
    var parent = el("div", {}, "hello ", el("span", {}, "world"));
    assert.equal(parent.textContent, "hello world");
  });
  it("el.children filters to elements only", function() {
    var parent = el("div", {}, "text", el("span", {}, "child"));
    assert.equal(parent.children.length, 1);
    assert.equal(parent.children[0].tagName, "SPAN");
  });
  it("querySelector finds by tag", function() {
    var doc = makeDoc({ body: el("div", {}, el("span", { id: "x" }, "hi")) });
    assert.equal(doc.querySelector("span").id, "x");
  });
  it("querySelector finds by #id", function() {
    var doc = makeDoc({ body: el("div", {}, el("span", { id: "x" }, "hi")) });
    assert.equal(doc.querySelector("#x").id, "x");
  });
  it("querySelector finds by .class", function() {
    var doc = makeDoc({ body: el("div", {}, el("span", { class: "foo" }, "hi")) });
    assert.equal(doc.querySelector(".foo").className, "foo");
  });
  it("querySelector finds by [attr]", function() {
    var doc = makeDoc({ body: el("div", {}, el("span", { href: "/test" }, "hi")) });
    assert.equal(doc.querySelector("[href]").getAttribute("href"), "/test");
  });
  it("querySelector finds by [attr=\"v\"]", function() {
    var doc = makeDoc({ body: el("div", {}, el("span", { href: "/test" }, "hi")) });
    assert.equal(doc.querySelector("[href=\"/test\"]").getAttribute("href"), "/test");
  });
  it("querySelector finds by [attr*=\"v\"]", function() {
    var doc = makeDoc({ body: el("div", {}, el("span", { href: "/Document/I123" }, "hi")) });
    assert.equal(doc.querySelector("[href*=\"/Document/\"]").getAttribute("href"), "/Document/I123");
  });
  it("querySelector finds compound selector", function() {
    var doc = makeDoc({ body: el("div", {}, el("li", { id: "filedate" }, "Aug 25, 1999")) });
    assert.equal(doc.querySelector("li#filedate").id, "filedate");
  });
  it("querySelector finds descendant combinator", function() {
    var doc = makeDoc({ body: el("div", {}, el("li", {}, "item")) });
    assert.equal(doc.querySelector("div li").tagName, "LI");
  });
  it("querySelector finds child combinator", function() {
    var doc = makeDoc({ body: el("div", {}, el("ul", {}, el("li", {}, "item")), "text") });
    assert.equal(doc.querySelector("div > ul").tagName, "UL");
  });
  it("querySelector finds comma list", function() {
    var doc = makeDoc({ body: el("div", {}, el("span", { class: "a" }, "x"), el("span", { class: "b" }, "y")) });
    var results = doc.querySelectorAll(".a, .b");
    assert.equal(results.length, 2);
  });
  it("querySelectorAll returns array", function() {
    var doc = makeDoc({ body: el("div", {}, el("li", {}, "a"), el("li", {}, "b")) });
    var results = doc.querySelectorAll("li");
    assert.equal(Array.isArray(results), true);
    assert.equal(results.length, 2);
  });
  it("querySelector returns null for missing", function() {
    var doc = makeDoc({ body: el("div", {}, "hello") });
    assert.equal(doc.querySelector(".missing"), null);
  });
  it("makeDoc returns document with title and documentElement", function() {
    var doc = makeDoc({ title: "Test Title", body: el("body", {}, "content") });
    assert.equal(doc.title, "Test Title");
    assert.equal(doc.documentElement.tagName, "HTML");
  });
  it("querySelector on document", function() {
    var doc = makeDoc({ body: el("body", {}, el("div", { id: "main" }, "content")) });
    assert.equal(doc.querySelector("#main").id, "main");
  });
});

// ---- wlDomReadPageContext ----

describe("wlDomReadPageContext", function() {
  function makeDocWithScripts(scripts, title, href) {
    return makeDoc({
      title: title || "Case Name | Cases | Jurisdiction | Westlaw Advantage",
      body: el("body", {},
        el("div", { id: "co_docHeaderTitleLine" }, "Case Name"),
        el("div", { id: "co_docHeaderCitation" }, el("li", {}, "187 F.3d 486")),
        el("div", { class: "co_docketBlock" }, "No. 98-40679."),
        el("script", {}, ""),
        ...scripts
      ),
    });
  }

  it("extracts guid, contentType, relatedInfoHost from script config", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","RelatedInfo":"relatedinfo.test.invalid"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.ok, true);
    assert.equal(result.config.guid, GUID);
    assert.equal(result.config.contentType, "Cases");
    assert.equal(result.config.relatedInfoHost, "relatedinfo.test.invalid");
  });

  it("validates GUID format", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"not-a-valid-guid","ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/not-a-valid-guid/View/FullText.html");
    assert.equal(result.ok, false);
    assert.equal(result.config.guid, null);
  });

  it("sets ambiguous when duplicate keys have different values", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","DocumentGuid":"' + GUID2 + '","ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.ambiguous, true);
  });

  it("never includes token values in config or reviewReasons", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","PageEventIdentifier":"SECRET-PCID","ResourceToken":"SECRET-RTID"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    var json = JSON.stringify(result);
    assert.equal(json.includes("SECRET-PCID"), false);
    assert.equal(json.includes("SECRET-RTID"), false);
  });

  it("returns identity-mismatch when URL GUID differs from config GUID", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID2 + "/View/FullText.html");
    assert.equal(result.config.identityReason, "identity-mismatch");
    assert.equal(result.config.guid, null);
  });

  it("returns ok:true when config has valid GUID", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.ok, true);
  });

  it("returns ok:false when no valid GUIDs found", function() {
    var scripts = [el("script", {}, 'var config = {"ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.ok, false);
  });

  it("handles /Link/ URLs with header anchor GUID", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" },
      el("a", { href: "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html" }, "Case Name")
    );
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];
    var doc = makeDoc({
      title: "Case Name | Cases | Jurisdiction | Westlaw Advantage",
      body: el("body", {}, header, el("div", { id: "co_docHeaderCitation" }, el("li", {}, "187 F.3d 486")), el("div", { class: "co_docketBlock" }, "No. 98-40679."), el("script", {}, ""), ...scripts)
    });
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Link/Document/FullText?findType=Y&cite=123");
    assert.equal(result.config.guid, GUID);
  });
});

// ---- wlDomInspectCaseReadiness ----

describe("wlDomInspectCaseReadiness", function() {
  function makeCaseDoc(opts) {
    var scripts = opts.scripts || [];
    var headerTitle = opts.headerTitle || "Sanchez v Liggett & Myers, Inc.";
    var href = opts.href || "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html";
    var hostname = opts.hostname || "1.next.westlaw.com";
    var title = opts.title || "Sanchez v Liggett & Myers, Inc. | Cases | Fifth Circuit | Westlaw Advantage";

    var header = el("div", { id: "co_docHeaderTitleLine" }, headerTitle);
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"), el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "No. 98-40679.");

    return makeDoc({
      title: title,
      href: href,
      hostname: hostname,
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });
  }

  it("detects case with ContentType Cases and | Cases | title", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];
    var doc = makeCaseDoc({ scripts: scripts });
    var result = wlDomInspectCaseReadiness(doc, doc.title);
    assert.equal(result.isCase, true);
    assert.equal(result.capability, "service");
  });

  it("returns dom-only when config missing but title + case DOM agree", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '"};')];
    var doc = makeCaseDoc({ scripts: scripts, title: "Sanchez v Liggett & Myers, Inc. | Cases | Fifth Circuit | Westlaw Advantage" });
    var result = wlDomInspectCaseReadiness(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.isCase, true);
    assert.equal(result.capability, "dom-only");
  });

  it("returns not-a-case for secondary source ContentType with stale | Cases | title", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Secondary Sources"};')];
    var doc = makeCaseDoc({ scripts: scripts, title: "Some Title | Cases | Jurisdiction | Westlaw Advantage" });
    var result = wlDomInspectCaseReadiness(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.isCase, false);
    assert.equal(result.capability, null);
  });

  it("returns not-a-case for wrong host", function() {
    var doc = makeCaseDoc({ hostname: "evil.example.com" });
    var result = wlDomInspectCaseReadiness(doc, "https://evil.example.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.isCase, false);
    assert.equal(result.capability, null);
    assert.equal(result.reason, "wrong-host");
  });

  it("returns not-a-case when no header and no header citation", function() {
    var doc = makeDoc({
      title: "Some Title | Cases | Jurisdiction | Westlaw Advantage",
      href: "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html",
      hostname: "1.next.westlaw.com",
      body: el("body", {}, el("div", {}, "no header here"))
    });
    var result = wlDomInspectCaseReadiness(doc, doc.title);
    assert.equal(result.isCase, false);
    assert.equal(result.capability, null);
    assert.equal(result.reason, "no-header");
  });

  it("returns not-a-case for URL/title alone without case DOM", function() {
    var doc = makeDoc({
      title: "Sanchez v Liggett & Myers, Inc. | Cases | Fifth Circuit | Westlaw Advantage",
      href: "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html",
      hostname: "1.next.westlaw.com",
      body: el("body", {}, el("div", {}, "no header element"))
    });
    var result = wlDomInspectCaseReadiness(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.isCase, false);
  });

  it("returns identity-mismatch when /Document/ URL GUID differs from config GUID", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];
    var doc = makeCaseDoc({ scripts: scripts, href: "https://1.next.westlaw.com/Document/" + GUID2 + "/View/FullText.html" });
    var result = wlDomInspectCaseReadiness(doc, doc.location.href);
    assert.equal(result.isCase, false);
    assert.equal(result.reason, "identity-mismatch");
  });

  it("returns not-a-case for explicit non-Cases ContentType even with stale Cases title", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Secondary Sources"};')];
    var doc = makeCaseDoc({ scripts: scripts });
    var result = wlDomInspectCaseReadiness(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.isCase, false);
    assert.equal(result.capability, null);
  });

  it("detects case via headerCitation presence when no config ContentType", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '"};')];
    var doc = makeCaseDoc({ scripts: scripts, title: "Sanchez v Liggett & Myers, Inc. | Cases | Fifth Circuit | Westlaw Advantage" });
    var result = wlDomInspectCaseReadiness(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.isCase, true);
  });
});

// ---- wlDomReadFacts ----

describe("wlDomReadFacts", function() {
  it("reads Sanchez-like page: 5th Cir, August 25 1999, 187 F.3d 486, docket No. 98-40679", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Sanchez v Liggett & Myers, Inc.");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "United States Court of Appeals, Fifth Circuit."),
      el("li", {}, "August 25, 1999"),
      el("li", {}, "187 F.3d 486"),
      el("li", {}, "(Approx. 12 pages)")
    );
    var docket = el("div", { class: "co_docketBlock" }, "No. 98-40679.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Sanchez v Liggett & Myers, Inc. | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.ok, true);
    assert.equal(result.guid, GUID);
    assert.equal(result.contentType, "Cases");
    assert.equal(result.headerName, "Sanchez v Liggett & Myers, Inc.");
    assert.equal(result.rawCourt, "United States Court of Appeals, Fifth Circuit.");
    assert.equal(result.date, "1999-08-25");
    assert.equal(result.dateText, "August 25, 1999");
    assert.equal(result.citations.length, 1);
    assert.equal(result.citations[0].kind, "reporter");
    assert.equal(result.citations[0].volume, "187");
    assert.equal(result.citations[0].reporter, "F.3d");
    assert.equal(result.citations[0].page, "486");
    assert.equal(result.dockets.length, 1);
    assert.equal(result.dockets[0], "No. 98-40679");
    assert.equal(result.pageCountText, "(Approx. 12 pages)");
  });

  it("does not treat (Approx. N pages) as a citation or date", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"),
      el("li", {}, "(Approx. 12 pages)"));
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.date, "1999-08-25");
    assert.equal(result.pageCountText, "(Approx. 12 pages)");
    assert.equal(result.citations.length, 0);
  });

  it("handles NY-official variant with chapter/chapter0 IDs and 2 citations", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "People v Smith");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", { id: "courtline" }, "New York Court of Appeals"),
      el("li", { id: "filedate" }, "March 15, 2020"),
      el("li", { id: "cite0" }, "2020 NY Slip Op 1234"),
      el("li", { id: "chapter0" }, "14 N.Y.3d 500"));
    var docket = el("div", { class: "co_docketBlock" }, "No. 123.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "People v Smith | Cases | New York | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.rawCourt, "New York Court of Appeals");
    assert.equal(result.date, "2020-03-15");
    assert.equal(result.citations.length, 2);
  });

  it("deduplicates sticky header list by normalized text", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"),
      el("li", {}, "187 F.3d 486"),
      el("li", {}, "August 25, 1999"),
      el("li", {}, "187 F.3d 486"));
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    var dateCites = result.citations.filter(function(c) { return c.kind === "reporter"; });
    assert.equal(dateCites.length, 1);
  });

  it("strips zero-width watermark from header name", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Case Name\u200B\uFEFF");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Case Name | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.headerName, "Case Name");
    assert.equal(result.headerName.indexOf("\u200B"), -1);
    assert.equal(result.headerName.indexOf("\uFEFF"), -1);
  });

  it("classifies unknown reporter-like pattern as unparsed", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"),
      el("li", {}, "Some weird citation pattern XYZ 123"));
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    var unparsed = result.citations.filter(function(c) { return c.kind === "unparsed"; });
    assert.equal(unparsed.length, 1);
  });

  it("falls back to .co_courtBlock for court when no court line in header", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"), el("li", {}, "187 F.3d 486"));
    var courtBlock = el("div", { class: "co_courtBlock" }, "United States Court of Appeals, Fifth Circuit.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, courtBlock, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.rawCourt, "United States Court of Appeals, Fifth Circuit.");
  });

  it("falls back to .co_cites for citations when no citations in header", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"));
    var citesBlock = el("div", { class: "co_cites" }, "187 F.3d 486, 14 N.Y.3d 500");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, citesBlock, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.citations.length, 2);
  });

  it("records conflicting-header review reason for two different dates", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"),
      el("li", {}, "March 15, 2020"),
      el("li", {}, "187 F.3d 486"));
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.reviewReasons.indexOf("conflicting-header") !== -1, true);
  });

  it("parses multiple dockets from .co_docketBlock", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "No. 98-40679.; No. 99-12345");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.dockets.length, 2);
  });

  it("strips trailing period from docket text", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "No. 98-40679.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.dockets[0], "No. 98-40679");
  });

  it("never reads .co_title wholesale", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Case Name");
    var titleDiv = el("div", { class: "co_title" }, "Hidden opinion text that should not be read");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Case Name | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, titleDiv, citationList, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    var resultStr = JSON.stringify(result);
    assert.equal(resultStr.indexOf("Hidden opinion text"), -1);
  });

  it("handles missing config (dom-only) gracefully", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Case Name");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "No. 98-40679.");

    var doc = makeDoc({
      title: "Case Name | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.ok, true);
    assert.equal(result.guid, null);
    assert.equal(result.contentType, null);
  });

  it("watermark scrub on all output strings", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Case Name\u200B");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "August 25, 1999"),
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "No. 98-40679.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Case Name\u200B | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.headerName.indexOf("\u200B"), -1);
    assert.equal(result.rawCourt.indexOf("\u200B"), -1);
    var resultStr = JSON.stringify(result);
    assert.equal(resultStr.indexOf("\u200B"), -1);
  });
});
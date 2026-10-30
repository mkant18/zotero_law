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

describe("majority author identity evidence", function() {
  function facts(...nodes) { return wlDomReadFacts(makeDoc({ body: el("body", {}, ...nodes) })); }
  it("preserves initials, particles, suffixes and diacritics in separate fields", function() {
    var author = facts(el("div", { class: "x_leadAuthorLine" }, "José A. de la Cruz, Jr., Circuit Judge.")).author;
    assert.equal(author.firstName, "José A.");
    assert.equal(author.lastName, "de la Cruz Jr.");
    assert.equal(author.fieldMode, undefined);
  });
  it("accepts title-first byline and explicitly linked full name", function() {
    var result = facts(el("div", { class: "x_leadAuthorLine" }, "Judge ", el("a", { title: "Harold R. DeMoss" }, "DeMoss"), ":"));
    assert.equal(result.author.firstName, "Harold R.");
    assert.equal(result.author.lastName, "DeMoss");
    assert.equal(result.author.source, "lead-byline-linked-title");
    assert.equal(result.reviewReasons.includes("author-name-incomplete"), false);
  });
  it("reads the Supreme Court's explicit delivered-opinion byline without taking narrative text as a name", function() {
    var result = facts(el("div", { class: "x_leadAuthorLine" }, "Mr. Chief Justice WARREN delivered the opinion of the Court."));
    assert.equal(result.author.lastName, "WARREN");
    assert.equal(result.author.firstName, "");
    assert.equal(result.reviewReasons.includes("author-name-incomplete"), false);
    var ambiguous = facts(el("div", { class: "x_leadAuthorLine" }, "Mr. Chief Justice WARREN delivered the opinion of the Court and discussed BLACK."));
    assert.equal(ambiguous.author, null);
  });
  it('ignores structured star pages inside a majority byline', function() {
    var result = facts(el('div', {class: 'x_leadAuthorLine'}, ' ',
      el('span', {class: 'co_starPage', 'aria-label': 'Star page 486'}, el('span', {'aria-hidden': 'true'}, '*486')),
      ' Mr. Chief Justice WARREN delivered the opinion of the Court.'));
    assert.equal(result.author.lastName, 'WARREN');
    assert.equal(result.reviewReasons.includes('author-unparsed'), false);
    assert.equal(facts(el('div', {class: 'x_leadAuthorLine'}, '*486 Mr. Chief Justice WARREN delivered the opinion of the Court.')).author, null);
  });
  it("never scans unrelated opinions, panel members or dissent for matching surname", function() {
    var result = facts(el("div", { class: "x_leadAuthorLine" }, "DeMOSS, Circuit Judge."),
      el("p", {}, "Harold R. DeMOSS, Circuit Judge"),
      el("div", { class: "co_panelBlock" }, el("div", { class: "x_leadAuthorLine" }, "Other Person, Judge.")),
      el("div", { class: "x_dissentAuthorLine" }, el("div", { class: "x_leadAuthorLine" }, "Wrong DeMOSS, Judge.")));
    assert.equal(result.author.firstName, "");
    assert.equal(result.author.lastName, "DeMOSS");
    assert.equal(result.reviewReasons.includes("author-name-incomplete"), false);
  });
  it("retains surname and flags conflicting linked records", function() {
    var result = facts(el("div", { class: "x_leadAuthorLine", title: "One Smith", "aria-label": "Two Smith" }, "Smith, Judge."));
    assert.equal(result.author.firstName, "");
    assert.ok(result.reviewReasons.includes("author-identity-conflict"));
  });
  it("leaves unnamed majority empty even when dissent has author", function() {
    assert.equal(facts(el("div", { class: "x_dissentAuthorLine" }, "Named Person, Judge.")).author, null);
  });
  it("keeps per curiam institutional", function() {
    var author = facts(el("div", { class: "x_leadAuthorLine" }, "PER CURIAM:")).author;
    assert.equal(author.fieldMode, 1);
    assert.equal(author.lastName, "Per Curiam");
  });
  it("does not choose between conflicting majority bylines", function() {
    var result = facts(el("div", { class: "x_leadAuthorLine" }, "One Smith, Judge."), el("div", { class: "x_leadAuthorLine" }, "Two Jones, Judge."));
    assert.equal(result.author, null);
    assert.ok(result.reviewReasons.includes("author-conflict"));
  });
  it("rejects wrong surname and narrative popup headings", function() {
    var partial = { firstName: "", lastName: "Smith" };
    assert.equal(ctx.wlDomLinkedAuthor("Hon. Jane Jones", partial), null);
    assert.equal(ctx.wlDomLinkedAuthor("Jane Smith dissent opinion", partial), null);
  });
  it('preserves explicit profile name fields, suffixes and provenance', function() {
    var guid = 'Iaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    var profile = {snapshotResponse: {guid: guid.toUpperCase(), type: 'judge', firstName: 'José A.', lastName: 'de la Cruz, Jr.', fullName: 'Hon. José A. de la Cruz, Jr.'}};
    var author = ctx.wlDomReadJudgeProfile(profile, {lastName: 'de la Cruz'}, guid);
    assert.equal(author.firstName, 'José A.');
    assert.equal(author.lastName, 'de la Cruz, Jr.');
    assert.equal(author.source, 'lead-byline-linked-judge-profile');
    assert.equal(ctx.wlDomReadJudgeProfile({...profile, snapshotResponse: {...profile.snapshotResponse, firstName: '<José A.'}}, {lastName: 'de la Cruz'}, guid), null);
    assert.equal(ctx.wlDomReadJudgeProfile(profile, {lastName: 'Wrong'}, guid), null);
    assert.equal(ctx.wlDomReadJudgeProfile(profile, {lastName: 'de la Cruz'}, null), null);
  });
});

it("preserves seven bare numeric dockets from observed official Westlaw docket block", function() {
  var doc = makeDoc({ body: el("body", {}, el("div", { class: "co_contentBlock co_briefItState co_docketBlock" }, "019125/97,2001-07484,2001-07486,2001-07487,2001-07488,2001-07489,2002-01777")) });
  assert.deepEqual(JSON.parse(JSON.stringify(wlDomReadFacts(doc).dockets)), ["No. 019125/97", "No. 2001-07484", "No. 2001-07486", "No. 2001-07487", "No. 2001-07488", "No. 2001-07489", "No. 2002-01777"]);
});

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
  it('uses a unique bounded Search routing value without degrading case readiness when it is unavailable', function() {
    function context(extra) {
      return wlDomReadPageContext(makeDocWithScripts([el('script', {}, '{"DocumentGuid":"' + GUID + '","Search":"search.test.invalid"' + extra + '}')]), 'https://1.next.westlaw.com/Document/' + GUID + '/View/FullText.html');
    }
    assert.equal(context('').config.searchHost, 'search.test.invalid');
    assert.equal(context(',"Search":"other.test.invalid"').config.searchHost, undefined);
    assert.equal(context(',"Search":"other.test.invalid"').ambiguous, false);
    var unsafe = wlDomReadPageContext(makeDocWithScripts([el('script', {}, '{"Search":"bad\r\nheader"}')]), 'https://1.next.westlaw.com/');
    assert.equal(unsafe.config.searchHost, undefined);
  });

  it("validates GUID format", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"not-a-valid-guid","ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/not-a-valid-guid/View/FullText.html");
    assert.equal(result.ok, false);
    assert.equal(result.config.guid, null);
  });
  it("accepts bounded pipe-delimited tokens without exposing them", function() {
    var doc = makeDocWithScripts([el("script", {}, JSON.stringify({ DocumentGuid: GUID, ContentType: "Cases", RelatedInfo: "relatedinfo.test.invalid", PageEventIdentifier: "TEST-PE-0001", ResourceToken: "TEST|RT|0001" }))]);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID);
    assert.equal(result.secrets.resourceToken, "TEST|RT|0001");
    assert.equal(wlDomInspectCaseReadiness(doc, "https://1.next.westlaw.com/Document/" + GUID).capability, "service");
    assert.doesNotMatch(JSON.stringify(result.config) + JSON.stringify(result.reviewReasons), /TEST\|RT\|0001/);
    var invalid = makeDocWithScripts([el("script", {}, JSON.stringify({ DocumentGuid: GUID, PageEventIdentifier: "TEST-PE-0001", ResourceToken: "TEST|RT\r\nInjected" }))]);
    assert.equal(wlDomReadPageContext(invalid, "").secrets, null);
  });

  it("refuses service identity when distinct document GUIDs coexist", function() {
    var result = wlDomReadPageContext(makeDocWithScripts([el("script", {}, JSON.stringify({ DocumentGuid: GUID })), el("script", {}, JSON.stringify({ DocumentGuid: GUID2 }))]), "https://1.next.westlaw.com/Document/" + GUID);
    assert.equal(result.config.guid, null);
    assert.equal(result.config.identityReason, "identity-ambiguous");
  });

  it("sets ambiguous when duplicate keys have different values", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","DocumentGuid":"' + GUID2 + '","ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.ambiguous, true);
  });

  it("never includes token values in config or reviewReasons", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","PageEventIdentifier":"TEST-PE-0001","ResourceToken":"TEST-RT-0001"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    var configJson = JSON.stringify(result.config);
    var reviewJson = JSON.stringify(result.reviewReasons);
    assert.equal(configJson.includes("TEST-PE-0001"), false);
    assert.equal(configJson.includes("TEST-RT-0001"), false);
    assert.equal(reviewJson.includes("TEST-PE-0001"), false);
    assert.equal(reviewJson.includes("TEST-RT-0001"), false);
  });

  it("returns secrets with validated tokens when both are valid and unambiguous", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","PageEventIdentifier":"TEST-PE-0001","ResourceToken":"TEST-RT-0001"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.secrets !== null, true);
    assert.equal(result.secrets.pageEventId, "TEST-PE-0001");
    assert.equal(result.secrets.resourceToken, "TEST-RT-0001");
  });

  it("returns secrets null with missing-config when tokens are missing", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.secrets, null);
    assert.equal(result.reviewReasons.indexOf("missing-config") !== -1, true);
  });

  it("returns secrets null with ambiguous-config when tokens have duplicate different values", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","PageEventIdentifier":"TEST-PE-0001","PageEventIdentifier":"TEST-PE-0002","ResourceToken":"TEST-RT-0001"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.secrets, null);
    assert.equal(result.reviewReasons.indexOf("ambiguous-config") !== -1, true);
  });

  it("returns secrets null when token fails validation", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","PageEventIdentifier":"short","ResourceToken":"TEST-RT-0001"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    assert.equal(result.secrets, null);
  });

  it("asserts JSON.stringify of config/reviewReasons never contains token values", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","PageEventIdentifier":"TEST-PE-0001","ResourceToken":"TEST-RT-0001"};')];
    var doc = makeDocWithScripts(scripts);
    var result = wlDomReadPageContext(doc, "https://1.next.westlaw.com/Document/" + GUID + "/View/FullText.html");
    var json = JSON.stringify({ config: result.config, reviewReasons: result.reviewReasons });
    assert.equal(json.includes("TEST-PE-0001"), false);
    assert.equal(json.includes("TEST-RT-0001"), false);
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

  it("detects case with ContentType Cases and | Cases | title and all secrets → service", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases","PageEventIdentifier":"TEST-PE-0001","ResourceToken":"TEST-RT-0001","RelatedInfo":"relatedinfo.test.invalid"};')];
    var doc = makeCaseDoc({ scripts: scripts });
    var result = wlDomInspectCaseReadiness(doc, doc.title);
    assert.equal(result.isCase, true);
    assert.equal(result.capability, "service");
  });

  it("detects case with ContentType Cases but missing secrets → dom-only", function() {
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];
    var doc = makeCaseDoc({ scripts: scripts });
    var result = wlDomInspectCaseReadiness(doc, doc.title);
    assert.equal(result.isCase, true);
    assert.equal(result.capability, "dom-only");
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

  it("parses Nos. list with en dashes into separate dockets", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "Nos. 98\u201340679, 98\u201340680.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.dockets.length, 2);
    assert.equal(result.dockets[0], "No. 98\u201340679");
    assert.equal(result.dockets[1], "No. 98\u201340680");
  });

  it("parses Nos. list with 'and' connector into separate dockets", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "Nos. 1, 2 and 3.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.dockets.length, 3);
    assert.equal(result.dockets[0], "No. 1");
    assert.equal(result.dockets[1], "No. 2");
    assert.equal(result.dockets[2], "No. 3");
  });

  it("parses Nos. list with semicolons into separate dockets", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "Nos. 1; 2; 3.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.dockets.length, 3);
    assert.equal(result.dockets[0], "No. 1");
    assert.equal(result.dockets[1], "No. 2");
    assert.equal(result.dockets[2], "No. 3");
  });

  it("handles two separate .co_docketBlock elements", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket1 = el("div", { class: "co_docketBlock" }, "No. 98-40679.");
    var docket2 = el("div", { class: "co_docketBlock" }, "No. 99-12345.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket1, docket2, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.dockets.length, 2);
  });

  it("dedupes duplicate docket entries from sticky header", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Test Case");
    var citationList = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "187 F.3d 486"));
    var docket = el("div", { class: "co_docketBlock" }, "No. 98-40679.");
    var scripts = [el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};')];

    var doc = makeDoc({
      title: "Test Case | Cases | Fifth Circuit | Westlaw Advantage",
      body: el("body", {}, header, citationList, docket, docket, el("script", {}, ""), ...scripts)
    });

    var result = wlDomReadFacts(doc);
    assert.equal(result.dockets.length, 1);
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

// ---- plan §12 selector and schema fallbacks (synthetic placeholder text only) ----

function fallbackDoc(bodyNodes) {
  var header = el("div", { id: "co_docHeaderTitleLine" }, "Placeholder v. Example");
  var config = el("script", {}, 'var config = {"DocumentGuid":"' + GUID + '","ContentType":"Cases"};');
  return makeDoc({
    title: "Placeholder v. Example | Cases | Test Court | Westlaw Advantage",
    body: el.apply(null, ["body", {}, header].concat(bodyNodes, [config]))
  });
}

function citeRaws(result) {
  return Array.from(result.citations, function(c) { return c.raw; });
}

function plain(v) {
  return JSON.parse(JSON.stringify(v));
}

describe("wlDomReadFacts — plan §12 selector fallbacks", function() {
  it("reads court/date/cites from courtline/filedate/cite0/cite1 ids", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", { id: "courtline" }, "Placeholder Court of Appeals"),
      el("li", { id: "filedate" }, "March 15, 2020"),
      el("li", { id: "cite0" }, "100 F.3d 200"),
      el("li", { id: "cite1" }, "300 F. Supp. 2d 400"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.equal(result.rawCourt, "Placeholder Court of Appeals");
    assert.equal(result.date, "2020-03-15");
    assert.deepEqual(citeRaws(result), ["100 F.3d 200", "300 F. Supp. 2d 400"]);
    assert.equal(result.citations.every(function(c) { return c.kind === "reporter"; }), true);
    assert.deepEqual(plain(result.reviewReasons), []);
  });

  it("reads citations from chapter0/chapter1 ids", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", { id: "courtline" }, "Placeholder Court of Appeals"),
      el("li", { id: "filedate" }, "March 15, 2020"),
      el("li", { id: "chapter0" }, "100 F.3d 200"),
      el("li", { id: "chapter1" }, "300 F. Supp. 2d 400"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.deepEqual(citeRaws(result), ["100 F.3d 200", "300 F. Supp. 2d 400"]);
    assert.equal(result.rawCourt, "Placeholder Court of Appeals");
  });

  it("reads a single un-numbered chapter id as a citation", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", { id: "courtline" }, "Placeholder Court of Appeals"),
      el("li", { id: "chapter" }, "100 F.3d 200"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.deepEqual(citeRaws(result), ["100 F.3d 200"]);
  });

  it("classifies semantically, ignoring misleading li ids", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", { id: "cite0" }, "March 15, 2020"),
      el("li", { id: "filedate" }, "100 F.3d 200"),
      el("li", { id: "courtline" }, "(Approx. 4 pages)"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.equal(result.date, "2020-03-15");
    assert.deepEqual(citeRaws(result), ["100 F.3d 200"]);
    assert.equal(result.pageCountText, "(Approx. 4 pages)");
    assert.equal(result.rawCourt, "");
  });

  it("classifies id-less direct li children semantically in court, date, cite, page-count order", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "Placeholder Court of Appeals"),
      el("li", {}, "March 15, 2020"),
      el("li", {}, "100 F.3d 200"),
      el("li", {}, "(Approx. 4 pages)"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.equal(result.rawCourt, "Placeholder Court of Appeals");
    assert.equal(result.date, "2020-03-15");
    assert.equal(result.citations.length, 1);
    assert.equal(result.pageCountText, "(Approx. 4 pages)");
  });

  it("classifies id-less li children even when the court line follows the date", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "March 15, 2020"),
      el("li", {}, "100 F.3d 200"),
      el("li", {}, "Placeholder Court of Appeals"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.equal(result.rawCourt, "Placeholder Court of Appeals");
    assert.equal(result.date, "2020-03-15");
    assert.deepEqual(citeRaws(result), ["100 F.3d 200"]);
    assert.equal(result.citations.some(function(c) { return c.kind === "unparsed"; }), false);
  });

  it("does not turn a page-count li (\"2 pages\" style) into a date or citation", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "March 15, 2020"),
      el("li", {}, "100 F.3d 200"),
      el("li", {}, "(Approx. 2 pages)"),
      el("li", {}, "(Approx. 1 page)"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.equal(result.date, "2020-03-15");
    assert.equal(result.dateText, "March 15, 2020");
    assert.deepEqual(citeRaws(result), ["100 F.3d 200"]);
    assert.equal(result.pageCountText, "(Approx. 1 page)");
    assert.equal(result.rawCourt, "");
    assert.deepEqual(plain(result.reviewReasons), []);
  });

  it("a page-count-only header yields no date, citation, or court", function() {
    var list = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "(Approx. 2 pages)"));
    var result = wlDomReadFacts(fallbackDoc([list]));
    assert.equal(result.date, null);
    assert.equal(result.dateText, null);
    assert.deepEqual(plain(result.citations), []);
    assert.equal(result.rawCourt, "");
    assert.equal(result.pageCountText, "(Approx. 2 pages)");
  });

  it("flags conflicting-header for two headers with different citations", function() {
    var first = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "March 15, 2020"), el("li", {}, "100 F.3d 200"));
    var second = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "March 15, 2020"), el("li", {}, "300 F. Supp. 2d 400"));
    var result = wlDomReadFacts(fallbackDoc([first, second]));
    assert.equal(result.reviewReasons.indexOf("conflicting-header") !== -1, true);
  });

  it("does not flag conflicting-header for two identical (sticky) headers", function() {
    var first = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "Placeholder Court of Appeals"), el("li", {}, "March 15, 2020"), el("li", {}, "100 F.3d 200"));
    var second = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "Placeholder Court of Appeals"), el("li", {}, "March 15, 2020"), el("li", {}, "100 F.3d 200"));
    var result = wlDomReadFacts(fallbackDoc([first, second]));
    assert.deepEqual(plain(result.reviewReasons), []);
    assert.equal(result.citations.length, 1);
    assert.equal(result.rawCourt, "Placeholder Court of Appeals");
  });

  it("does not flag conflicting-header when one header list is a subset of the other (truncated sticky copy)", function() {
    var first = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "100 F.3d 200"), el("li", {}, "300 F. Supp. 2d 400"));
    var second = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "100 F.3d 200"));
    var result = wlDomReadFacts(fallbackDoc([first, second]));
    assert.equal(result.reviewReasons.indexOf("conflicting-header"), -1);
    assert.deepEqual(citeRaws(result), ["100 F.3d 200", "300 F. Supp. 2d 400"]);
  });

  it("does not silently pick the first of two headers with different dates", function() {
    var first = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "March 15, 2020"));
    var second = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "April 16, 2021"));
    var result = wlDomReadFacts(fallbackDoc([first, second]));
    assert.equal(result.reviewReasons.indexOf("conflicting-header") !== -1, true);
  });

  it("with no header list, falls back to .co_courtBlock and .co_cites and leaves date empty", function() {
    var courtBlock = el("div", { class: "co_courtBlock" }, "Placeholder Court of Appeals");
    var cites = el("div", { class: "co_cites" }, "100 F.3d 200");
    var result = wlDomReadFacts(fallbackDoc([courtBlock, cites]));
    assert.equal(result.ok, true);
    assert.equal(result.rawCourt, "Placeholder Court of Appeals");
    assert.deepEqual(citeRaws(result), ["100 F.3d 200"]);
    assert.equal(result.date, null);
    assert.equal(result.dateText, null);
    assert.equal(result.reviewReasons.indexOf("conflicting-header"), -1);
  });

  it("with no header list, marks the result as fallback-sourced via a review reason", function() {
    var courtBlock = el("div", { class: "co_courtBlock" }, "Placeholder Court of Appeals");
    var cites = el("div", { class: "co_cites" }, "100 F.3d 200");
    var result = wlDomReadFacts(fallbackDoc([courtBlock, cites]));
    assert.equal(result.reviewReasons.indexOf("header-fallback") !== -1, true);
  });

  it("does not mark header-fallback when the header list exists", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "Placeholder Court of Appeals"), el("li", {}, "100 F.3d 200"));
    var courtBlock = el("div", { class: "co_courtBlock" }, "Other Court");
    var result = wlDomReadFacts(fallbackDoc([list, courtBlock]));
    assert.equal(result.reviewReasons.indexOf("header-fallback"), -1);
  });

  it("flags conflicting-header when two header lists name different courts", function() {
    var first = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "United States Court of Appeals, Fifth Circuit."));
    var second = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "United States District Court, District of Kansas."));
    var result = wlDomReadFacts(fallbackDoc([first, second]));
    assert.equal(result.reviewReasons.indexOf("conflicting-header") !== -1, true);
  });

  it("prefers header li values over .co_courtBlock/.co_cites when the header is present", function() {
    var list = el("div", { id: "co_docHeaderCitation" },
      el("li", {}, "Placeholder Court of Appeals"), el("li", {}, "March 15, 2020"), el("li", {}, "100 F.3d 200"));
    var courtBlock = el("div", { class: "co_courtBlock" }, "Placeholder Court of Appeals");
    var cites = el("div", { class: "co_cites" }, "100 F.3d 200");
    var result = wlDomReadFacts(fallbackDoc([list, courtBlock, cites]));
    assert.equal(result.rawCourt, "Placeholder Court of Appeals");
    assert.deepEqual(citeRaws(result), ["100 F.3d 200"]);
    assert.deepEqual(plain(result.reviewReasons), []);
  });

  it(".co_docketBlock is read independently of the header list", function() {
    var docket = el("div", { class: "co_docketBlock" }, "No. 20-1234.");
    var result = wlDomReadFacts(fallbackDoc([docket]));
    assert.deepEqual(plain(result.dockets), ["No. 20-1234"]);
    assert.equal(result.headerName, "Placeholder v. Example");
  });

  it("headerName is the sanitized header text without the | Cases | suffix", function() {
    var header = el("div", { id: "co_docHeaderTitleLine" }, "Placeholder v. Example | Cases | Test Court");
    var doc = makeDoc({ title: "x | Cases | y", body: el("body", {}, header) });
    assert.equal(wlDomReadFacts(doc).headerName, "Placeholder v. Example");
  });
});

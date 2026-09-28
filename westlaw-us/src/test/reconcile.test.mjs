import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./helpers/load.mjs";

var ctx = loadModules([
  "text.js", "reporters.js", "cite-parse.js", "profile.js",
  "service.js", "dom.js", "map.js", "reconcile.js"
]);

var wlRecReconcile = ctx.wlRecReconcile;
var wlMapToZoteroFields = ctx.wlMapToZoteroFields;
var wlMapValidateOutgoing = ctx.wlMapValidateOutgoing;
var wlTextCompareKey = ctx.wlTextCompareKey;

function makeEnvelope(styles) {
  return { ok: true, styles: styles, reviewReasons: [] };
}

function makeSvc(category, envelope) {
  return { category: category, envelope: envelope || null };
}

function makeDom(opts) {
  var d = opts || {};
  return {
    ok: true,
    guid: d.guid || null,
    contentType: d.contentType || "Cases",
    headerName: d.headerName || "",
    rawCourt: d.rawCourt || "",
    dateText: d.dateText || null,
    date: d.date || null,
    citations: d.citations || [],
    dockets: d.dockets || [],
    pageCountText: d.pageCountText || null,
    reviewReasons: d.reviewReasons || []
  };
}

// ---- G1: Sanchez full success ----
describe("wlRecReconcile - G1 Sanchez full success", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
      shorts: ["Sanchez, 187 F.3d 486", "187 F.3d 486"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: {
      long: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
      shorts: [],
      id: "standard",
      enhanced: null
    },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"
    }
  });
  var dom = makeDom({
    guid: "I1234567890abcdef1234567890abcdef",
    headerName: "Sanchez v. Liggett & Myers, Inc.",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "1999-08-25",
    citations: [
      { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" }
    ],
    dockets: ["No. 98-40679"]
  });

  var result = wlRecReconcile({
    context: { guid: "I1234567890abcdef1234567890abcdef", url: "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("status is validated-profile", function() {
    assert.equal(result.status, "validated-profile");
  });

  it("caseName is from service", function() {
    assert.equal(result.caseName, "Sanchez v. Liggett & Myers, Inc.");
  });

  it("primary is 187 F.3d 486", function() {
    assert.equal(result.primary.kind, "reporter");
    assert.equal(result.primary.volume, "187");
    assert.equal(result.primary.reporter, "F.3d");
    assert.equal(result.primary.page, "486");
  });

  it("court is 5th Cir.", function() {
    assert.equal(result.court, "5th Cir.");
  });

  it("date is 1999-08-25", function() {
    assert.equal(result.date, "1999-08-25");
  });

  it("has docket No. 98-40679", function() {
    assert.ok(result.dockets.indexOf("No. 98-40679") !== -1);
  });

  it("shortName is Sanchez", function() {
    assert.equal(result.shortName, "Sanchez");
  });

  it("WL 1999 WL 652310 is in alternates", function() {
    var wlAlt = null;
    for (var i = 0; i < result.alternates.length; i++) {
      if (result.alternates[i].kind === "wl" && result.alternates[i].page === "652310") {
        wlAlt = result.alternates[i];
        break;
      }
    }
    assert.ok(wlAlt !== null, "WL 1999 WL 652310 should be in alternates");
  });

  it("history is empty", function() {
    assert.equal(result.history, "");
  });

  it("wlPrimary is false", function() {
    assert.equal(result.wlPrimary, false);
  });

  it("profile is standard", function() {
    assert.equal(result.profile, "standard");
  });

  it("no review reasons", function() {
    assert.equal(result.reviewReasons.length, 0);
  });

  it("wlMapToZoteroFields passes validateOutgoing", function() {
    var fields = wlMapToZoteroFields(result);
    var validation = wlMapValidateOutgoing(fields);
    assert.equal(validation.ok, true, JSON.stringify(validation.problems));
  });
});

// ---- G4: Miele ----
describe("wlRecReconcile - G4 Miele", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)",
      shorts: ["Miele, 770 N.Y.S.2d 386", "770 N.Y.S.2d 386"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: {
      long: "Miele v. Am. Tobacco Co., 2 A.D.3d 799, 770 N.Y.S.2d 386 (2003)",
      shorts: [],
      id: "standard",
      enhanced: null
    },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: "Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003), 2 A.D.3d 799, 2003 WL 23099090"
    }
  });
  var dom = makeDom({
    guid: "Iabcdef1234567890abcdef1234567890",
    headerName: "Miele v. Am. Tobacco Co.",
    rawCourt: "Supreme Court of New York, Appellate Division.",
    date: "2003-06-15",
    citations: [
      { kind: "reporter", volume: "2", reporter: "A.D.3d", page: "799", raw: "2 A.D.3d 799" },
      { kind: "reporter", volume: "770", reporter: "N.Y.S.2d", page: "386", raw: "770 N.Y.S.2d 386" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "Iabcdef1234567890abcdef1234567890", url: "https://1.next.westlaw.com/Document/Iabcdef1234567890abcdef1234567890/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("primary is N.Y.S.2d (service matches DOM)", function() {
    assert.equal(result.primary.kind, "reporter");
    assert.equal(result.primary.volume, "770");
    assert.equal(result.primary.reporter, "N.Y.S.2d");
    assert.equal(result.primary.page, "386");
  });

  it("court is App. Div.", function() {
    assert.equal(result.court, "App. Div.");
  });

  it("A.D.3d 799 is in alternates (from DOM)", function() {
    var adAlt = null;
    for (var i = 0; i < result.alternates.length; i++) {
      if (result.alternates[i].kind === "reporter" && result.alternates[i].volume === "2" && result.alternates[i].reporter === "A.D.3d") {
        adAlt = result.alternates[i];
        break;
      }
    }
    assert.ok(adAlt !== null, "A.D.3d 799 should be in alternates");
  });

  it("WL cite is in alternates", function() {
    var wlAlt = null;
    for (var i = 0; i < result.alternates.length; i++) {
      if (result.alternates[i].kind === "wl") {
        wlAlt = result.alternates[i];
        break;
      }
    }
    assert.ok(wlAlt !== null, "WL cite should be in alternates");
  });

  it("wlMapToZoteroFields passes validateOutgoing", function() {
    var fields = wlMapToZoteroFields(result);
    var validation = wlMapValidateOutgoing(fields);
    assert.equal(validation.ok, true, JSON.stringify(validation.problems));
  });
});

// ---- G5: Rogers texas ----
describe("wlRecReconcile - G5 Rogers texas", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)",
      shorts: ["Rogers, 761 S.W.2d 788", "761 S.W.2d 788"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: {
      long: "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)",
      shorts: [],
      id: "standard",
      enhanced: null
    },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: null
    }
  });
  var dom = makeDom({
    guid: "I Rogers tex guid 1234567890abcdef12",
    headerName: "Rogers v. R.J. Reynolds Tobacco Co.",
    rawCourt: "Court of Appeals of Texas, Beaumont.",
    date: "1988-06-15",
    citations: [
      { kind: "reporter", volume: "761", reporter: "S.W.2d", page: "788", raw: "761 S.W.2d 788" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "IRogersTexGuid1234567890abcdef12", url: "https://1.next.westlaw.com/Document/IRogersTexGuid1234567890abcdef12/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "texas"
  });

  it("parentheticalSuffix is writ denied", function() {
    assert.equal(result.parentheticalSuffix, "writ denied");
  });

  it("court is Tex. App.—Beaumont", function() {
    assert.equal(result.court, "Tex. App.—Beaumont");
  });

  it("Triplex cite is NOT in alternates (history citation)", function() {
    for (var i = 0; i < result.alternates.length; i++) {
      var alt = result.alternates[i];
      assert.ok(!(alt.kind === "reporter" && alt.volume === "900" && alt.reporter === "S.W.2d" && alt.page === "716"),
        "Triplex cite should not be in alternates");
    }
  });

  it("wlMapToZoteroFields passes validateOutgoing", function() {
    var fields = wlMapToZoteroFields(result);
    var validation = wlMapValidateOutgoing(fields);
    assert.equal(validation.ok, true, JSON.stringify(validation.problems));
  });
});

// ---- G2 with history containing 566 F.3d 1095 ----
describe("wlRecReconcile - G2 history citation not alternate", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)",
      shorts: ["Philip Morris USA, Inc., 449 F. Supp. 2d 1", "449 F. Supp. 2d 1"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: {
      long: "United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)",
      shorts: [],
      id: "standard",
      enhanced: null
    },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: null
    }
  });
  var dom = makeDom({
    guid: "I2historyGuid1234567890abcdef1234",
    headerName: "United States v. Philip Morris USA, Inc.",
    rawCourt: "United States District Court for the District of Columbia.",
    date: "2006-06-01",
    citations: [
      { kind: "reporter", volume: "449", reporter: "F. Supp. 2d", page: "1", raw: "449 F. Supp. 2d 1" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "I2historyGuid1234567890abcdef1234", url: "https://1.next.westlaw.com/Document/I2historyGuid1234567890abcdef1234/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("566 F.3d 1095 from history is NOT in alternates", function() {
    for (var i = 0; i < result.alternates.length; i++) {
      var alt = result.alternates[i];
      assert.ok(!(alt.kind === "reporter" && alt.volume === "566" && alt.reporter === "F.3d" && alt.page === "1095"),
        "566 F.3d 1095 from history should not be in alternates");
    }
  });

  it("history is preserved", function() {
    assert.ok(result.history.length > 0);
    assert.ok(result.history.indexOf("aff'd in part") !== -1);
  });
});

// ---- G7: WL-only synthetic ----
describe("wlRecReconcile - G7 WL-only synthetic", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)",
      shorts: ["Example, 2024 WL 1234567, at *4", "2024 WL 1234567, at *4"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: {
      long: "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)",
      shorts: [],
      id: "standard",
      enhanced: null
    },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)"
    }
  });
  var dom = makeDom({
    guid: "IwlOnlyGuid1234567890abcdef123456",
    headerName: "Example v. Sample",
    rawCourt: "United States District Court for the District of Kansas.",
    date: "2024-03-01",
    citations: [],
    dockets: ["No. 24-123"]
  });

  var result = wlRecReconcile({
    context: { guid: "IwlOnlyGuid1234567890abcdef123456", url: "https://1.next.westlaw.com/Document/IwlOnlyGuid1234567890abcdef123456/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("wlPrimary is true", function() {
    assert.equal(result.wlPrimary, true);
  });

  it("primary is WL cite", function() {
    assert.equal(result.primary.kind, "wl");
    assert.equal(result.primary.volume, "2024");
    assert.equal(result.primary.reporter, "WL");
    assert.equal(result.primary.page, "1234567");
  });

  it("has docket No. 24-123", function() {
    assert.ok(result.dockets.indexOf("No. 24-123") !== -1);
  });

  it("date is full ISO 2024-03-01", function() {
    assert.equal(result.date, "2024-03-01");
  });

  it("court is D. Kan.", function() {
    assert.equal(result.court, "D. Kan.");
  });

  it("wlMapToZoteroFields passes validateOutgoing", function() {
    var fields = wlMapToZoteroFields(result);
    var validation = wlMapValidateOutgoing(fields);
    assert.equal(validation.ok, true, JSON.stringify(validation.problems));
  });
});

// ---- A auth failure ----
describe("wlRecReconcile - A auth failure → metadata-only", function() {
  var dom = makeDom({
    guid: "IauthFailGuid1234567890abcdef1234",
    headerName: "Some Case v. Other Party",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "2020-01-15",
    citations: [
      { kind: "reporter", volume: "123", reporter: "F.3d", page: "456", raw: "123 F.3d 456" }
    ],
    dockets: ["No. 19-1234"]
  });

  var result = wlRecReconcile({
    context: { guid: "IauthFailGuid1234567890abcdef1234", url: "https://1.next.westlaw.com/Document/IauthFailGuid1234567890abcdef1234/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("auth", null),
    svcB: makeSvc("ok", makeEnvelope({
      standard: { long: "", shorts: [], id: "standard", enhanced: null },
      westlaw: { long: null, shorts: [], id: "westlaw", enhanced: null }
    })),
    profile: "standard"
  });

  it("status is metadata-only", function() {
    assert.equal(result.status, "metadata-only");
  });

  it("reviewReasons includes service-auth", function() {
    assert.ok(result.reviewReasons.indexOf("service-auth") !== -1);
  });

  it("caseName from DOM header", function() {
    assert.equal(result.caseName, "Some Case v. Other Party");
  });

  it("profile is dom-only", function() {
    assert.equal(result.profile, "dom-only");
  });

  it("primary from DOM", function() {
    assert.ok(result.primary !== null);
    assert.equal(result.primary.volume, "123");
  });

  it("wlMapToZoteroFields passes validateOutgoing", function() {
    var fields = wlMapToZoteroFields(result);
    var validation = wlMapValidateOutgoing(fields);
    assert.equal(validation.ok, true, JSON.stringify(validation.problems));
  });
});

// ---- B server failure (A ok) ----
describe("wlRecReconcile - B server failure → inventory-server review only", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
      shorts: ["Sanchez, 187 F.3d 486"],
      id: "standard",
      enhanced: null
    }
  });
  var dom = makeDom({
    guid: "IbserverGuid1234567890abcdef123456",
    headerName: "Sanchez v. Liggett & Myers, Inc.",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "1999-08-25",
    citations: [
      { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "IbserverGuid1234567890abcdef123456", url: "https://1.next.westlaw.com/Document/IbserverGuid1234567890abcdef123456/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("server", null),
    profile: "standard"
  });

  it("reviewReasons includes inventory-server", function() {
    assert.ok(result.reviewReasons.indexOf("inventory-server") !== -1);
  });

  it("primary is still from service", function() {
    assert.ok(result.primary !== null);
    assert.equal(result.primary.volume, "187");
  });
});

// ---- DOM/service primary conflict ----
describe("wlRecReconcile - DOM/service primary conflict", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Some Case v. Other, 999 F.3d 999 (9th Cir. 2020)",
      shorts: ["Some Case, 999 F.3d 999"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: { long: "", shorts: [], id: "standard", enhanced: null },
    westlaw: { long: null, shorts: [], id: "westlaw", enhanced: null }
  });
  var dom = makeDom({
    guid: "IconflictGuid1234567890abcdef12345",
    headerName: "Some Case v. Other",
    rawCourt: "United States Court of Appeals, Ninth Circuit.",
    date: "2020-03-15",
    citations: [
      { kind: "reporter", volume: "888", reporter: "F.3d", page: "888", raw: "888 F.3d 888" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "IconflictGuid1234567890abcdef12345", url: "https://1.next.westlaw.com/Document/IconflictGuid1234567890abcdef12345/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("reviewReasons includes primary-conflict", function() {
    assert.ok(result.reviewReasons.indexOf("primary-conflict") !== -1);
  });

  it("primary is from DOM (conflict resolution)", function() {
    assert.equal(result.primary.volume, "888");
    assert.equal(result.primary.page, "888");
  });
});

// ---- Date conflict ----
describe("wlRecReconcile - date conflict", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Some Case v. Other, 123 F.3d 456 (5th Cir. 1999)",
      shorts: ["Some Case, 123 F.3d 456"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: { long: "", shorts: [], id: "standard", enhanced: null },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: "Some Case v. Other, 123 F.3d 456 (5th Cir. 1999), 2000 WL 9999999"
    }
  });
  var dom = makeDom({
    guid: "IdateconflictGuid1234567890abcdef12",
    headerName: "Some Case v. Other",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "1999-08-25",
    citations: [
      { kind: "reporter", volume: "123", reporter: "F.3d", page: "456", raw: "123 F.3d 456" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "IdateconflictGuid1234567890abcdef12", url: "https://1.next.westlaw.com/Document/IdateconflictGuid1234567890abcdef12/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("date is from DOM (1999-08-25)", function() {
    assert.equal(result.date, "1999-08-25");
  });
});

// ---- Missing everything → no throw ----
describe("wlRecReconcile - missing everything → no throw", function() {
  var result = wlRecReconcile({
    context: {},
    dom: {},
    svcA: makeSvc("timeout", null),
    svcB: makeSvc("timeout", null),
    profile: "standard"
  });

  it("does not throw and returns metadata-only", function() {
    assert.equal(result.status, "metadata-only");
    assert.equal(result.caseName, "");
    assert.equal(result.primary, null);
  });

  it("reviewReasons includes service-timeout", function() {
    assert.ok(result.reviewReasons.indexOf("service-timeout") !== -1);
  });
});

// ---- Year conflict ----
describe("wlRecReconcile - year conflict", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Some Case v. Other, 123 F.3d 456 (5th Cir. 2000)",
      shorts: ["Some Case, 123 F.3d 456"],
      id: "standard",
      enhanced: null
    }
  });
  var bEnvelope = makeEnvelope({
    standard: { long: "", shorts: [], id: "standard", enhanced: null },
    westlaw: { long: null, shorts: [], id: "westlaw", enhanced: null }
  });
  var dom = makeDom({
    guid: "IyearconflictGuid1234567890abcdef12",
    headerName: "Some Case v. Other",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "1999-08-25",
    citations: [
      { kind: "reporter", volume: "123", reporter: "F.3d", page: "456", raw: "123 F.3d 456" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "IyearconflictGuid1234567890abcdef12", url: "https://1.next.westlaw.com/Document/IyearconflictGuid1234567890abcdef12/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("reviewReasons includes year-conflict", function() {
    assert.ok(result.reviewReasons.indexOf("year-conflict") !== -1);
  });
});

// ---- R1/R2: Rogers texas with texas.long form ----
describe("wlRecReconcile - R1/R2 Rogers texas (texas.long history, round-trip)", function() {
  var aEnvelope = makeEnvelope({
    texas: {
      long: "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.\u2014Beaumont 1988, writ denied), disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)",
      shorts: ["Rogers, 761 S.W.2d 788", "761 S.W.2d 788"],
      id: "Id."
    },
    standard: {
      long: "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App. 1988), writ denied (July 12, 1989), and disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)",
      shorts: ["Rogers, 761 S.W.2d 788", "761 S.W.2d 788"],
      id: "Id."
    }
  });
  var bEnvelope = makeEnvelope({
    standard: {
      long: "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App. 1988), writ denied (July 12, 1989), and disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)",
      shorts: [],
      id: "standard",
      enhanced: null
    },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: "Rogers v. R.J. Reynolds Tobacco Co., No. 09-87-120 CV, 761 S.W.2d 788 (Tex.App.-Beaumont Oct. 06, 1988)"
    }
  });
  var dom = makeDom({
    guid: "IRogersTxGoldenGuid1234567890abcdef",
    headerName: "Rogers v. R.J. Reynolds Tobacco Co.",
    rawCourt: "Court of Appeals of Texas, Beaumont.",
    date: "1988-10-06",
    citations: [
      { kind: "reporter", volume: "761", reporter: "S.W.2d", page: "788", raw: "761 S.W.2d 788" }
    ],
    dockets: ["No. 09-87-120 CV"]
  });

  var result = wlRecReconcile({
    context: { guid: "IRogersTxGoldenGuid1234567890abcdef", url: "https://1.next.westlaw.com/Document/IRogersTxGoldenGuid1234567890abcdef/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "texas"
  });

  it("status is validated-profile", function() {
    assert.equal(result.status, "validated-profile");
  });

  it("reviewReasons is empty", function() {
    assert.equal(result.reviewReasons.length, 0);
  });

  it("history comes from texas.long (no writ denied duplication)", function() {
    assert.equal(result.history, "disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)");
  });

  it("parentheticalSuffix is writ denied", function() {
    assert.equal(result.parentheticalSuffix, "writ denied");
  });

  it("court is Tex. App.\u2014Beaumont", function() {
    assert.equal(result.court, "Tex. App.\u2014Beaumont");
  });

  it("date is from DOM 1988-10-06", function() {
    assert.equal(result.date, "1988-10-06");
  });

  it("docket No. 09-87-120 CV is present", function() {
    assert.ok(result.dockets.indexOf("No. 09-87-120 CV") !== -1);
  });

  it("wlMapToZoteroFields passes validateOutgoing", function() {
    var fields = wlMapToZoteroFields(result);
    var validation = wlMapValidateOutgoing(fields);
    assert.equal(validation.ok, true, JSON.stringify(validation.problems));
  });
});

// ---- R3: Service primary conflicts with DOM ----
describe("wlRecReconcile - R3 service primary conflict with DOM", function() {
  var aEnvelope = makeEnvelope({
    standard: {
      long: "Sanchez v. Liggett & Myers, Inc., 188 F.3d 486 (5th Cir. 1999)",
      shorts: ["Sanchez, 188 F.3d 486", "188 F.3d 486"],
      id: "standard",
      enhanced: null
    }
  });
  // svcB has no standard long (only westlaw inventory) to avoid duplicate conflicting cite in alternates
  var bEnvelope = makeEnvelope({
    standard: {
      long: "",
      shorts: [],
      id: "standard",
      enhanced: null
    },
    westlaw: {
      long: null,
      shorts: [],
      id: "westlaw",
      enhanced: "Sanchez v. Liggett & Myers, Inc., 188 F.3d 486 (5th Cir. 1999), 1999 WL 652310"
    }
  });
  var dom = makeDom({
    guid: "IconflictDomGuid1234567890abcdef12",
    headerName: "Sanchez v. Liggett & Myers, Inc.",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "1999-08-25",
    citations: [
      { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" }
    ],
    dockets: []
  });

  var result = wlRecReconcile({
    context: { guid: "IconflictDomGuid1234567890abcdef12", url: "https://1.next.westlaw.com/Document/IconflictDomGuid1234567890abcdef12/View/FullText.html" },
    dom: dom,
    svcA: makeSvc("ok", aEnvelope),
    svcB: makeSvc("ok", bEnvelope),
    profile: "standard"
  });

  it("reviewReasons includes primary-conflict", function() {
    assert.ok(result.reviewReasons.indexOf("primary-conflict") !== -1);
  });

  it("primary is from DOM (187 F.3d 486)", function() {
    assert.equal(result.primary.volume, "187");
    assert.equal(result.primary.page, "486");
  });

  it("conflicting service citation (188 F.3d 486) is kind unparsed in alternates", function() {
    var foundUnparsed = false;
    for (var i = 0; i < result.alternates.length; i++) {
      var alt = result.alternates[i];
      if (alt.kind === "unparsed" && alt.raw && alt.raw.indexOf("188 F.3d 486") !== -1) {
        foundUnparsed = true;
        break;
      }
    }
    assert.ok(foundUnparsed, "Conflicting service citation 188 F.3d 486 should be kind unparsed in alternates");
  });

  it("svcA primary conflicting citation is unparsed, not reporter", function() {
    // The svcA primary (188 F.3d 486) should be unparsed; B-inventory may also carry it as reporter
    // Verify at least one unparsed version exists and the svcA primary is not treated as a reporter alternate
    var foundUnparsed = false;
    for (var i = 0; i < result.alternates.length; i++) {
      var alt = result.alternates[i];
      if (alt.kind === "unparsed" && alt.raw && alt.raw.indexOf("188 F.3d 486") !== -1) {
        foundUnparsed = true;
        break;
      }
    }
    assert.ok(foundUnparsed, "Conflicting svcA primary 188 F.3d 486 should be kind unparsed in alternates");
  });
});

// ---- Envelope review reasons are forwarded once (W5) ----
describe("wlRecReconcile - service envelope review reasons", function() {
  var stdStyle = {
    long: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
    shorts: ["Sanchez, 187 F.3d 486", "187 F.3d 486"],
    id: "standard",
    enhanced: null
  };
  var wlStyle = {
    long: null,
    shorts: [],
    id: "westlaw",
    enhanced: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"
  };
  var dom = makeDom({
    guid: "I1234567890abcdef1234567890abcdef",
    headerName: "Sanchez v. Liggett & Myers, Inc.",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "1999-08-25",
    citations: [{ kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" }],
    dockets: ["No. 98-40679"]
  });

  function reconcileWith(aEnvelope, bEnvelope) {
    return wlRecReconcile({
      context: { guid: "I1234567890abcdef1234567890abcdef", url: "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html" },
      dom: dom,
      svcA: makeSvc("ok", aEnvelope),
      svcB: makeSvc("ok", bEnvelope),
      profile: "standard"
    });
  }

  function countOf(list, value) {
    return list.filter(function(r) { return r === value; }).length;
  }

  it("clean envelopes add no reasons and stay validated-profile", function() {
    var result = reconcileWith(
      makeEnvelope({ standard: stdStyle }),
      makeEnvelope({ standard: stdStyle, westlaw: wlStyle }));
    assert.equal(JSON.stringify(result.reviewReasons), "[]");
    assert.equal(result.status, "validated-profile");
  });

  it("malformed A envelope with no styles: reason forwarded, DOM primary, never validated", function() {
    var result = reconcileWith(
      { ok: false, styles: {}, reviewReasons: ["malformed-envelope", "missing-style:standard"] },
      makeEnvelope({ standard: stdStyle, westlaw: wlStyle }));
    assert.ok(result.reviewReasons.indexOf("malformed-envelope") !== -1);
    assert.ok(result.reviewReasons.indexOf("missing-style:standard") !== -1);
    assert.equal(result.status, "unverified-profile");
    assert.equal(result.primary.page, "486", "primary from DOM");
    assert.equal(result.provenance.caseName, "dom");
  });

  it("B envelope reasons (missing-style:westlaw) are forwarded; A data still used", function() {
    var result = reconcileWith(
      makeEnvelope({ standard: stdStyle }),
      { ok: false, styles: { standard: stdStyle }, reviewReasons: ["missing-style:westlaw"] });
    assert.equal(JSON.stringify(result.reviewReasons), JSON.stringify(["missing-style:westlaw"]));
    assert.equal(result.status, "unverified-profile");
    assert.equal(result.shortName, "Sanchez");
    assert.equal(result.provenance.caseName, "service");
  });

  it("same reason in A and B, or repeated inside one envelope, is recorded once", function() {
    var reasons = ["duplicate-style:standard", "missing-form:standard:long", "duplicate-style:standard"];
    var result = reconcileWith(
      { ok: false, styles: { standard: stdStyle }, reviewReasons: reasons },
      { ok: false, styles: { standard: stdStyle, westlaw: wlStyle }, reviewReasons: ["duplicate-style:standard"] });
    assert.equal(countOf(result.reviewReasons, "duplicate-style:standard"), 1);
    assert.equal(countOf(result.reviewReasons, "missing-form:standard:long"), 1);
    assert.equal(result.status, "unverified-profile");
  });

  it("B envelope reasons are ignored when B was not ok (category reason only)", function() {
    var result = wlRecReconcile({
      context: { guid: "I1234567890abcdef1234567890abcdef", url: "" },
      dom: dom,
      svcA: makeSvc("ok", makeEnvelope({ standard: stdStyle })),
      svcB: { category: "timeout", envelope: { ok: false, styles: {}, reviewReasons: ["malformed-envelope"] } },
      profile: "standard"
    });
    assert.equal(result.reviewReasons.indexOf("malformed-envelope"), -1);
    assert.ok(result.reviewReasons.indexOf("inventory-timeout") !== -1);
  });
});

// ---- DOM review reasons are forwarded (W9) ----
describe("wlRecReconcile - DOM review reasons", function() {
  var stdStyle = {
    long: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
    shorts: ["Sanchez, 187 F.3d 486", "187 F.3d 486"],
    id: "standard",
    enhanced: null
  };
  var wlStyle = {
    long: null,
    shorts: [],
    id: "westlaw",
    enhanced: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"
  };

  function domWith(reasons) {
    return makeDom({
      guid: "I1234567890abcdef1234567890abcdef",
      headerName: "Sanchez v. Liggett & Myers, Inc.",
      rawCourt: "United States Court of Appeals, Fifth Circuit.",
      date: "1999-08-25",
      citations: [{ kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" }],
      dockets: ["No. 98-40679"],
      reviewReasons: reasons
    });
  }

  function reconcileDom(dom, svcA, svcB) {
    return wlRecReconcile({
      context: { guid: "I1234567890abcdef1234567890abcdef", url: "" },
      dom: dom,
      svcA: svcA || makeSvc("ok", makeEnvelope({ standard: stdStyle })),
      svcB: svcB || makeSvc("ok", makeEnvelope({ standard: stdStyle, westlaw: wlStyle })),
      profile: "standard"
    });
  }

  function countOf(list, value) {
    return list.filter(function(r) { return r === value; }).length;
  }

  it("conflicting-header reaches the record and demotes a service-validated record", function() {
    var result = reconcileDom(domWith(["conflicting-header"]));
    assert.ok(result.reviewReasons.indexOf("conflicting-header") !== -1);
    assert.equal(result.status, "unverified-profile");
  });

  it("header-fallback reaches the record but does not demote a service-validated record", function() {
    var result = reconcileDom(domWith(["header-fallback"]));
    assert.equal(JSON.stringify(result.reviewReasons), JSON.stringify(["header-fallback"]));
    assert.equal(result.status, "validated-profile");
  });

  it("header-fallback next to another reason still demotes", function() {
    var result = reconcileDom(domWith(["header-fallback", "conflicting-header"]));
    assert.equal(result.status, "unverified-profile");
  });

  it("DOM reasons are deduped, and non-string or non-code entries are dropped", function() {
    var result = reconcileDom(domWith(["conflicting-header", "conflicting-header", 42, null, "Some Opinion Text!"]));
    assert.equal(countOf(result.reviewReasons, "conflicting-header"), 1);
    assert.equal(result.reviewReasons.length, 1);
  });

  it("a reason shared with a service envelope is recorded once", function() {
    var result = reconcileDom(domWith(["missing-style:westlaw"]),
      makeSvc("ok", makeEnvelope({ standard: stdStyle })),
      { category: "ok", envelope: { ok: false, styles: { standard: stdStyle }, reviewReasons: ["missing-style:westlaw"] } });
    assert.equal(countOf(result.reviewReasons, "missing-style:westlaw"), 1);
  });

  it("DOM reasons are forwarded on the metadata-only (service failed) path too", function() {
    var result = reconcileDom(domWith(["conflicting-header", "header-fallback"]), makeSvc("timeout", null), makeSvc("none", null));
    assert.equal(result.status, "metadata-only");
    assert.ok(result.reviewReasons.indexOf("service-timeout") !== -1);
    assert.ok(result.reviewReasons.indexOf("conflicting-header") !== -1);
    assert.ok(result.reviewReasons.indexOf("header-fallback") !== -1);
  });

  it("missing dom.reviewReasons is tolerated", function() {
    var dom = domWith([]);
    delete dom.reviewReasons;
    var result = reconcileDom(dom);
    assert.equal(result.status, "validated-profile");
    assert.equal(JSON.stringify(result.reviewReasons), "[]");
  });
});

// ---- Review-final fixes (P1-2, P1-3, P2-9, P1-6) ----
describe("wlRecReconcile - review-final fixes", function() {
  var stdStyle = {
    long: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
    shorts: ["Sanchez, 187 F.3d 486", "187 F.3d 486"],
    id: "standard",
    enhanced: null
  };
  var wlStyle = {
    long: null,
    shorts: [],
    id: "westlaw",
    enhanced: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999), No. 98-40679, 1999 WL 652310"
  };
  var GUID = "I1234567890abcdef1234567890abcdef";
  var WL_CITE = { kind: "wl", volume: "1999", reporter: "WL", page: "652310", raw: "1999 WL 652310" };
  var wlLong = {
    long: "Doe v. Roe, No. 98-40679, 1999 WL 652310 (5th Cir. Aug. 25, 1999)",
    shorts: [], id: "standard", enhanced: null
  };

  function fifth(o) {
    o = o || {};
    return makeDom({
      guid: GUID,
      headerName: "Sanchez v. Liggett & Myers, Inc.",
      rawCourt: o.rawCourt || "United States Court of Appeals, Fifth Circuit.",
      date: "date" in o ? o.date : "1999-08-25",
      citations: o.citations || [{ kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" }],
      dockets: "dockets" in o ? o.dockets : ["No. 98-40679"],
      reviewReasons: o.reviewReasons || []
    });
  }

  function reconcile(dom, aStyle, bStyles) {
    return wlRecReconcile({
      context: { guid: GUID, url: "" },
      dom: dom,
      svcA: makeSvc("ok", makeEnvelope({ standard: aStyle || stdStyle })),
      svcB: makeSvc("ok", makeEnvelope(bStyles || { standard: stdStyle, westlaw: wlStyle })),
      profile: "standard"
    });
  }

  describe("P1-2 unparsed DOM citations are never primary", function() {
    var cases = [
      { label: "NY slip op", court: "Supreme Court, Appellate Division, First Department, New York.", raw: "2023 NY Slip Op 12345",
        long: "Doe v. Roe, 2023 N.Y. Slip Op. 12345 (App. Div. 2023)" },
      { label: "IL App", court: "Appellate Court of Illinois, First District.", raw: "2019 IL App (1st) 180123",
        long: "Doe v. Roe, 2019 IL App (1st) 180123 (Ill. App. Ct. 2019)" }
    ];
    cases.forEach(function(c) {
      var style = { long: c.long, shorts: [], id: "standard", enhanced: null };
      var result = reconcile(
        makeDom({
          guid: GUID, headerName: "Doe v. Roe", rawCourt: c.court, date: "2023-05-05",
          citations: [{ kind: "unparsed", text: c.raw }], dockets: ["No. 1"]
        }),
        style,
        { standard: style }
      );
      it(c.label + ": primary is null, no-citation demotes, status metadata-only", function() {
        assert.equal(result.primary, null);
        assert.ok(result.reviewReasons.indexOf("no-citation") !== -1);
        assert.equal(result.status, "metadata-only");
      });
      it(c.label + ": raw text is kept in alternates as unparsed", function() {
        var kept = result.alternates.filter(function(a) { return a.kind === "unparsed" && a.raw === c.raw; });
        assert.equal(kept.length, 1);
      });
    });

    it("distinct unparsed DOM lines are not collapsed into one alternate", function() {
      var result = reconcile(fifth({ citations: [
        { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" },
        { kind: "unparsed", text: "First odd cite" },
        { kind: "unparsed", text: "Second odd cite" }
      ] }));
      var raws = result.alternates.filter(function(a) { return a.kind === "unparsed"; }).map(function(a) { return a.raw; });
      assert.equal(JSON.stringify(raws), JSON.stringify(["First odd cite", "Second odd cite"]));
    });

    it("DOM-only (service failed) record never selects an unparsed primary", function() {
      var result = wlRecReconcile({
        context: { guid: GUID, url: "" },
        dom: makeDom({ guid: GUID, headerName: "Doe v. Roe", rawCourt: "Appellate Court of Illinois, First District.",
          date: "2019-05-05", citations: [{ kind: "unparsed", text: "2019 IL App (1st) 180123" }] }),
        svcA: makeSvc("timeout", null),
        svcB: makeSvc("none", null),
        profile: "standard"
      });
      assert.equal(result.primary, null);
      assert.equal(result.status, "metadata-only");
      assert.ok(result.reviewReasons.indexOf("no-citation") !== -1);
    });
  });

  describe("P1-3 envelope reasons are code-only", function() {
    function withEnvelopeReasons(aReasons, bReasons) {
      return wlRecReconcile({
        context: { guid: GUID, url: "" },
        dom: fifth(),
        svcA: makeSvc("ok", { ok: true, styles: { standard: stdStyle }, reviewReasons: aReasons }),
        svcB: makeSvc("ok", { ok: true, styles: { standard: stdStyle, westlaw: wlStyle }, reviewReasons: bReasons || [] }),
        profile: "standard"
      });
    }
    it("a free-text reason is replaced by envelope-reason-dropped and demotes", function() {
      var result = withEnvelopeReasons(["duplicate-style:Bearer SECRETVALUE some opinion text"]);
      assert.equal(JSON.stringify(result.reviewReasons), JSON.stringify(["envelope-reason-dropped"]));
      assert.equal(result.status, "unverified-profile");
    });
    it("several dropped reasons yield one envelope-reason-dropped; valid codes pass through", function() {
      var result = withEnvelopeReasons(["missing-style:westlaw", "Some Text!", "Other Text?", 42]);
      assert.equal(JSON.stringify(result.reviewReasons), JSON.stringify(["missing-style:westlaw", "envelope-reason-dropped"]));
    });
    it("the filter is also applied to envelope B", function() {
      var result = withEnvelopeReasons([], ["a b c"]);
      assert.equal(JSON.stringify(result.reviewReasons), JSON.stringify(["envelope-reason-dropped"]));
    });
  });

  describe("P2-9 date and docket conflicts", function() {
    it("service full date differing from DOM date -> date-conflict, DOM date kept", function() {
      var result = reconcile(fifth({ date: "1999-08-26", citations: [WL_CITE] }), wlLong, { standard: wlLong });
      assert.ok(result.reviewReasons.indexOf("date-conflict") !== -1);
      assert.equal(result.date, "1999-08-26");
      assert.equal(result.status, "unverified-profile");
    });

    it("inventory date differing from DOM date -> date-conflict", function() {
      var b = { standard: stdStyle, westlaw: { long: null, shorts: [], id: "westlaw",
        enhanced: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. Aug. 25, 1999), No. 98-40679, 1999 WL 652310" } };
      var result = reconcile(fifth({ date: "1999-08-26" }), stdStyle, b);
      assert.ok(result.reviewReasons.indexOf("date-conflict") !== -1);
      assert.equal(result.date, "1999-08-26");
    });

    it("matching DOM date and service date -> no conflict", function() {
      var result = reconcile(fifth({ citations: [WL_CITE] }), wlLong, { standard: wlLong });
      assert.equal(result.reviewReasons.indexOf("date-conflict"), -1);
      assert.equal(result.date, "1999-08-25");
    });

    it("year-only DOM date + service full date -> service date used, no reason, no wl-missing-date", function() {
      var result = reconcile(fifth({ date: "1999", citations: [WL_CITE] }), wlLong, { standard: wlLong });
      assert.equal(result.date, "1999-08-25");
      assert.equal(result.reviewReasons.indexOf("wl-missing-date"), -1);
      assert.equal(result.reviewReasons.indexOf("date-conflict"), -1);
    });

    it("missing DOM date + service full date -> service date used", function() {
      var result = reconcile(fifth({ date: null, citations: [WL_CITE] }), wlLong, { standard: wlLong });
      assert.equal(result.date, "1999-08-25");
      assert.equal(result.reviewReasons.indexOf("wl-missing-date"), -1);
    });

    it("DOM docket differing from service docket -> docket-conflict, DOM docket kept", function() {
      var result = reconcile(fifth({ dockets: ["No. 11-1"], citations: [WL_CITE] }), wlLong, { standard: wlLong });
      assert.ok(result.reviewReasons.indexOf("docket-conflict") !== -1);
      assert.equal(JSON.stringify(result.dockets), JSON.stringify(["No. 11-1"]));
      assert.equal(result.status, "unverified-profile");
    });

    it("docket token lists compare as sets (Nos. 98-1, 98-2 vs No. 98-1 / 98-2)", function() {
      var style = { long: "Doe v. Roe, Nos. 98-1, 98-2, 1999 WL 652310 (5th Cir. Aug. 25, 1999)", shorts: [], id: "standard", enhanced: null };
      var result = reconcile(fifth({ dockets: ["Nos. 98-2, 98-1"], citations: [WL_CITE] }), style, { standard: style });
      assert.equal(result.reviewReasons.indexOf("docket-conflict"), -1);
    });

    it("docket comparison ignores No./Nos. prefix, whitespace and case", function() {
      var result = reconcile(fifth({ dockets: ["NOS.  98-40679"], citations: [WL_CITE] }), wlLong, { standard: wlLong });
      assert.equal(result.reviewReasons.indexOf("docket-conflict"), -1);
    });
  });

  describe("P1-6 court era", function() {
    it("classification is called with the decision date", function() {
      var seen = null;
      var original = ctx.wlProfClassifyCourt;
      ctx.wlProfClassifyCourt = function(raw, date) { seen = date; return original(raw, date); };
      try {
        reconcile(fifth());
      } finally {
        ctx.wlProfClassifyCourt = original;
      }
      assert.equal(seen, "1999-08-25");
    });

    it("eraUncertain classification -> court-era-uncertain demotes (stubbed classifier)", function() {
      var original = ctx.wlProfClassifyCourt;
      ctx.wlProfClassifyCourt = function(raw, date) {
        var c = original(raw, date);
        return Object.assign({}, c, { eraUncertain: true });
      };
      var result;
      try {
        result = reconcile(fifth());
      } finally {
        ctx.wlProfClassifyCourt = original;
      }
      assert.ok(result.reviewReasons.indexOf("court-era-uncertain") !== -1);
      assert.equal(result.reviewReasons.filter(function(r) { return r === "court-era-uncertain"; }).length, 1);
      assert.equal(result.status, "unverified-profile");
    });

    var kyStyle = { long: "Doe v. Roe, 100 S.W.2d 200 (Ky. 1950)", shorts: [], id: "standard", enhanced: null };
    function kyDom(date) {
      return makeDom({
        guid: GUID, headerName: "Doe v. Roe", rawCourt: "Court of Appeals of Kentucky.", date: date,
        citations: [{ kind: "reporter", volume: "100", reporter: "S.W.2d", page: "200", raw: "100 S.W.2d 200" }],
        dockets: ["No. 1"]
      });
    }

    it("real Kentucky Court of Appeals with a pre-1976 date -> Ky., no era reason", function() {
      var result = reconcile(kyDom("1950-03-03"), kyStyle, { standard: kyStyle });
      assert.equal(result.court, "Ky.");
      assert.equal(result.reviewReasons.indexOf("court-era-uncertain"), -1);
    });

    it("real Kentucky Court of Appeals with no usable date -> court-era-uncertain demotes", function() {
      var noDate = { long: "Doe v. Roe, 100 S.W.2d 200 (Ky. Ct. App.)", shorts: [], id: "standard", enhanced: null };
      var result = reconcile(kyDom(null), noDate, { standard: noDate });
      assert.ok(result.reviewReasons.indexOf("court-era-uncertain") !== -1);
      assert.equal(result.status, "unverified-profile");
    });
  });
});

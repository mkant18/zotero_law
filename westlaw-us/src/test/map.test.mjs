import { createRequire } from "node:module";
var require = createRequire(import.meta.url);
var test = require("node:test");
var assert = require("node:assert/strict");
var mod = require("../map.js");
var wlMapToZoteroFields = mod.wlMapToZoteroFields;
var wlMapValidateOutgoing = mod.wlMapValidateOutgoing;
var wlMapApply = mod.wlMapApply;

test("wlMapToZoteroFields - G1 Sanchez (reported, WL alternate, en-dash docket)", function() {
  var rec = {
    caseName: "Sanchez v. Liggett & Myers, Inc.",
    shortName: "Sanchez v. Liggett",
    court: "5th Cir.",
    date: "1999-08-25",
    dockets: ["No. 98\u201340679."],
    primary: { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" },
    alternates: [{ kind: "wl", volume: "1999", reporter: "WL", page: "652310", raw: "1999 WL 652310" }],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: "United States Court of Appeals, Fifth Circuit."
  };
  var fields = wlMapToZoteroFields(rec);
  assert.equal(fields.itemType, "case");
  assert.equal(fields.caseName, "Sanchez v. Liggett & Myers, Inc.");
  assert.equal(fields.court, "5th Cir.");
  assert.equal(fields.dateDecided, "1999-08-25");
  assert.equal(fields.docketNumber, "No. 98-40679");
  assert.equal(fields.reporter, "F.3d");
  assert.equal(fields.reporterVolume, "187");
  assert.equal(fields.firstPage, "486");
  assert.equal(fields.history, "");
  assert.equal(fields.shortTitle, "Sanchez v. Liggett");
  assert.equal(fields.url, "https://1.next.westlaw.com/Document/I00000000000000000000000000000000/View/FullText.html");
  assert.equal(fields.creators.length, 0);
  assert.equal(fields.attachments.length, 0);
  assert.equal(fields.notes.length, 0);
  assert.equal(fields.tags.length, 0);

  var extra = fields.extra;
  assert.equal(typeof extra, "string", "G1 extra should be a string");
  assert.equal(extra.indexOf("Medium: Westlaw"), -1, "G1 should not have Medium line");
  assert.equal(extra.indexOf("Genre:"), -1, "G1 should not have Genre line");
  assert.equal(extra.indexOf("Westlaw parallel citation:"), -1, "G1 should not have parallel citation for reporter kind alternate");
  assert.ok(extra.indexOf("Westlaw alternate WL citation: 1999 WL 652310") !== -1, "G1 should have WL alternate citation");
  assert.ok(extra.indexOf("Westlaw court (raw):") === 0 || extra.indexOf("\nWestlaw court (raw):") !== -1, "G1 should have court raw line");
  assert.ok(extra.indexOf("Westlaw profile: standard") !== -1, "G1 should have profile line");
  assert.ok(extra.indexOf("Westlaw status: validated-profile") !== -1, "G1 should have status line");
  assert.ok(extra.indexOf("Westlaw translator: 0.0.0-dev") !== -1, "G1 should have translator line");
  assert.equal(extra.indexOf("References:"), -1, "G1 should not have References line");
  assert.equal(extra, "Westlaw alternate WL citation: 1999 WL 652310\nWestlaw court (raw): United States Court of Appeals, Fifth Circuit.\nWestlaw profile: standard\nWestlaw status: validated-profile\nWestlaw translator: 0.0.0-dev", "G1 extra should be the exact joined string");
});

test("wlMapToZoteroFields - G5 Rogers texas (writ denied, Texas profile)", function() {
  var rec = {
    caseName: "Rogers v. State",
    shortName: "Rogers",
    court: "Tex. App.\u2014Beaumont",
    date: "2010-06-15",
    dockets: ["No. 09-12345."],
    primary: { kind: "reporter", volume: "256", reporter: "S.W.3d", page: "100", raw: "256 S.W.3d 100" },
    alternates: [],
    history: "aff'd, 300 S.W.3d 200 (Tex. 2011)",
    parentheticalSuffix: "writ denied",
    wlPrimary: false,
    profile: "texas",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I11111111111111111111111111111111",
    rawCourt: "Texas Court of Appeals, Beaumont."
  };
  var fields = wlMapToZoteroFields(rec);
  assert.equal(fields.court, "Tex. App.\u2014Beaumont");
  assert.equal(fields.history, "aff'd, 300 S.W.3d 200 (Tex. 2011)");
  assert.equal(fields.shortTitle, "Rogers");

  var extra = fields.extra;
  assert.equal(typeof extra, "string", "G5 extra should be a string");
  assert.ok(extra.indexOf("Genre: writ denied") !== -1, "G5 should have Genre: writ denied");
  assert.equal(extra.indexOf("Medium: Westlaw"), -1, "G5 should not have Medium line");
  assert.equal(extra.indexOf("References:"), -1, "G5 should not have References line");
  assert.equal(extra, "Genre: writ denied\nWestlaw court (raw): Texas Court of Appeals, Beaumont.\nWestlaw profile: texas\nWestlaw status: validated-profile\nWestlaw translator: 0.0.0-dev", "G5 extra should be the exact joined string");
});

test("wlMapToZoteroFields - G7 WL-only synthetic", function() {
  var rec = {
    caseName: "Example v. Sample",
    shortName: null,
    court: "D. Kan.",
    date: "2024-03-01",
    dockets: ["No. 24-123"],
    primary: { kind: "wl", volume: "2024", reporter: "WL", page: "1234567", raw: "2024 WL 1234567" },
    alternates: [],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: true,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I22222222222222222222222222222222",
    rawCourt: "District of Kansas."
  };
  var fields = wlMapToZoteroFields(rec);
  assert.equal(fields.reporter, "WL");
  assert.equal(fields.reporterVolume, "2024");
  assert.equal(fields.firstPage, "1234567");
  assert.equal(fields.docketNumber, "No. 24-123");
  assert.equal(fields.shortTitle, undefined, "G7 shortName is null so shortTitle should be omitted");
  assert.ok(fields.extra.indexOf("Medium: Westlaw") !== -1, "G7 should have Medium: Westlaw line");
  assert.equal(fields.extra.indexOf("Genre:"), -1, "G7 should not have Genre line");
  assert.equal(fields.extra.indexOf("References:"), -1, "G7 should not have References line");
  assert.equal(fields.tags.length, 0, "G7 should have no review tags");
  assert.equal(fields.extra, "Medium: Westlaw\nWestlaw court (raw): District of Kansas.\nWestlaw profile: standard\nWestlaw status: validated-profile\nWestlaw translator: 0.0.0-dev", "G7 extra should be the exact joined string");
});

test("wlMapToZoteroFields - multi-docket normalization", function() {
  var rec = {
    caseName: "Multi Docket Test",
    shortName: "Multi Docket",
    court: "",
    date: "2020-01-01",
    dockets: ["No. 019125/97", "2001-07484"],
    primary: { kind: "reporter", volume: "100", reporter: "F. Supp.", page: "1", raw: "100 F. Supp. 1" },
    alternates: [],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I33333333333333333333333333333333",
    rawCourt: ""
  };
  var fields = wlMapToZoteroFields(rec);
  assert.equal(fields.docketNumber, "Nos. 019125/97, 2001-07484");
});

test("wlMapToZoteroFields - metadata-only DOM record gets tag", function() {
  var rec = {
    caseName: "Metadata Only Case",
    shortName: null,
    court: "",
    date: "2020",
    dockets: [],
    primary: { kind: "reporter", volume: "100", reporter: "F. Supp.", page: "1", raw: "100 F. Supp. 1" },
    alternates: [],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "dom-only",
    status: "metadata-only",
    reviewReasons: ["service-unavailable"],
    provenance: { field: "dom" },
    guid: "",
    rawCourt: ""
  };
  var fields = wlMapToZoteroFields(rec);
  assert.equal(fields.shortTitle, undefined, "metadata-only with null shortName should omit shortTitle");
  assert.equal(fields.tags.length, 1, "metadata-only should have review tag");
  assert.equal(fields.tags[0].tag, "Westlaw: needs citation review");
  assert.ok(fields.extra.indexOf("Westlaw review: service-unavailable") !== -1, "should have review reason in extra");
  assert.equal(fields.url, undefined, "empty guid should omit url");
});

test("wlMapToZoteroFields - bad guid omits url and adds review reason", function() {
  var rec = {
    caseName: "Bad GUID Case",
    shortName: "Bad GUID",
    court: "",
    date: "2020-01-01",
    dockets: [],
    primary: { kind: "reporter", volume: "100", reporter: "F. Supp.", page: "1", raw: "100 F. Supp. 1" },
    alternates: [],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "not-a-valid-guid",
    rawCourt: ""
  };
  var fields = wlMapToZoteroFields(rec);
  assert.equal(fields.url, undefined, "bad guid should omit url");
  assert.ok(fields.extra.indexOf("Westlaw review: bad-guid") !== -1, "should have bad-guid review reason");
});

test("wlMapValidateOutgoing - passes all clean records", function() {
  var rec1 = {
    caseName: "Sanchez v. Liggett & Myers, Inc.",
    shortName: "Sanchez v. Liggett",
    court: "5th Cir.",
    date: "1999-08-25",
    dockets: ["No. 98\u201340679."],
    primary: { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" },
    alternates: [{ kind: "wl", volume: "1999", reporter: "WL", page: "652310", raw: "1999 WL 652310" }],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: "United States Court of Appeals, Fifth Circuit."
  };
  var fields1 = wlMapToZoteroFields(rec1);
  var v1 = wlMapValidateOutgoing(fields1);
  assert.equal(v1.ok, true, "G1 should pass validation");

  var rec7 = {
    caseName: "Example v. Sample",
    shortName: null,
    court: "D. Kan.",
    date: "2024-03-01",
    dockets: ["No. 24-123"],
    primary: { kind: "wl", volume: "2024", reporter: "WL", page: "1234567", raw: "2024 WL 1234567" },
    alternates: [],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: true,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I22222222222222222222222222222222",
    rawCourt: "District of Kansas."
  };
  var fields7 = wlMapToZoteroFields(rec7);
  var v7 = wlMapValidateOutgoing(fields7);
  assert.equal(v7.ok, true, "G7 should pass validation");
});

test("wlMapValidateOutgoing - fails on watermark char (direct fields)", function() {
  var fields = wlMapToZoteroFields({
    caseName: "Test Case",
    court: "",
    date: "2020-01-01",
    dockets: [],
    primary: { kind: "reporter", volume: "1", reporter: "F.", page: "1", raw: "1 F. 1" },
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: ""
  });
  fields.caseName = "Test\u200BCase";
  var result = wlMapValidateOutgoing(fields);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(function(p) { return p.indexOf("watermark") !== -1; }), "should detect watermark in caseName");
});

test("wlMapValidateOutgoing - fails on Id. shortTitle", function() {
  var fields = wlMapToZoteroFields({
    caseName: "Test Case",
    shortName: "Id.",
    court: "",
    date: "2020-01-01",
    dockets: [],
    primary: { kind: "reporter", volume: "1", reporter: "F.", page: "1", raw: "1 F. 1" },
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: ""
  });
  var result = wlMapValidateOutgoing(fields);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(function(p) { return p.indexOf("shortTitle-is-Id") !== -1; }), "should detect Id. shortTitle");
});

test("wlMapValidateOutgoing - fails on firstPage with range dash", function() {
  var fields = wlMapToZoteroFields({
    caseName: "Test Case",
    court: "",
    date: "2020-01-01",
    dockets: [],
    primary: { kind: "reporter", volume: "1", reporter: "F.", page: "486-490", raw: "1 F. 486-490" },
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: ""
  });
  var result = wlMapValidateOutgoing(fields);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(function(p) { return p.indexOf("firstPage-has-range") !== -1; }), "should detect firstPage range dash");
});

test("wlMapValidateOutgoing - fails on url with query", function() {
  var fields = wlMapToZoteroFields({
    caseName: "Test Case",
    court: "",
    date: "2020-01-01",
    dockets: [],
    primary: { kind: "reporter", volume: "1", reporter: "F.", page: "1", raw: "1 F. 1" },
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: ""
  });
  fields.url = "https://example.com?foo=bar";
  var result = wlMapValidateOutgoing(fields);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(function(p) { return p.indexOf("url-has-query") !== -1; }), "should detect url with query");
});

test("wlMapValidateOutgoing - fails on ResourceToken in extra", function() {
  var fields = wlMapToZoteroFields({
    caseName: "Test Case",
    court: "",
    date: "2020-01-01",
    dockets: [],
    primary: { kind: "reporter", volume: "1", reporter: "F.", page: "1", raw: "1 F. 1" },
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: ""
  });
  fields.extra = fields.extra + "\nResourceToken: leaked";
  var result = wlMapValidateOutgoing(fields);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(function(p) { return p.indexOf("token-leak") !== -1; }), "should detect ResourceToken in extra");
});

test("wlMapValidateOutgoing - fails on HTML in history", function() {
  var fields = wlMapToZoteroFields({
    caseName: "Test Case",
    court: "",
    date: "2020-01-01",
    dockets: [],
    primary: { kind: "reporter", volume: "1", reporter: "F.", page: "1", raw: "1 F. 1" },
    history: "<i>aff'd</i>",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I00000000000000000000000000000000",
    rawCourt: ""
  });
  var result = wlMapValidateOutgoing(fields);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(function(p) { return p.indexOf("html:history") !== -1; }), "should detect HTML in history");
});

test("wlMapApply - copies scalar fields and tags onto plain object", function() {
  var fields = {
    itemType: "case",
    caseName: "Test Case",
    court: "5th Cir.",
    dateDecided: "1999-08-25",
    docketNumber: "No. 123",
    reporter: "F.3d",
    reporterVolume: "187",
    firstPage: "486",
    history: "aff'd",
    shortTitle: "Test",
    url: "https://example.com",
    extra: "Medium: Westlaw",
    tags: [{ tag: "Westlaw: needs citation review" }],
    creators: [],
    attachments: [],
    notes: []
  };
  var item = { tags: [] };
  var result = wlMapApply(fields, item);
  assert.equal(result.itemType, "case");
  assert.equal(result.caseName, "Test Case");
  assert.equal(result.court, "5th Cir.");
  assert.equal(result.tags.length, 1);
  assert.equal(result.tags[0].tag, "Westlaw: needs citation review");
  assert.equal(result, item, "wlMapApply should return the same item object");
});

test("wlMapApply - ignores empty strings except court", function() {
  var fields = {
    itemType: "case",
    caseName: "",
    court: "",
    dateDecided: "",
    docketNumber: "",
    reporter: "",
    reporterVolume: "",
    firstPage: "",
    history: "",
    shortTitle: "",
    url: "",
    extra: [],
    tags: [],
    creators: [],
    attachments: [],
    notes: []
  };
  var item = { tags: [] };
  wlMapApply(fields, item);
  assert.equal(item.caseName, undefined, "empty caseName should not be set");
  assert.equal(item.court, "", "empty court should be set");
});

test("wlMapToZoteroFields - G4 Miele (parallel + WL alternate, not wlPrimary)", function() {
  var rec = {
    caseName: "Miele v. Manufacturer",
    shortName: "Miele",
    court: "N.Y. App. Div.",
    date: "2015-03-10",
    dockets: ["No. 12345."],
    primary: { kind: "reporter", volume: "100", reporter: "N.Y.S.2d", page: "500", raw: "100 N.Y.S.2d 500" },
    alternates: [
      { kind: "reporter", volume: "2", reporter: "A.D.3d", page: "799", raw: "2 A.D.3d 799" },
      { kind: "wl", volume: "2015", reporter: "WL", page: "123456", raw: "2015 WL 123456" }
    ],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "standard",
    status: "validated-profile",
    reviewReasons: [],
    provenance: { field: "service" },
    guid: "I44444444444444444444444444444444",
    rawCourt: "New York Appellate Division."
  };
  var fields = wlMapToZoteroFields(rec);
  var extra = fields.extra;
  assert.equal(extra.indexOf("Medium: Westlaw"), -1, "G4 should not have Medium line");
  assert.ok(extra.indexOf("Westlaw parallel citation: 2 A.D.3d 799") !== -1, "G4 should have parallel citation");
  assert.ok(extra.indexOf("Westlaw alternate WL citation: 2015 WL 123456") !== -1, "G4 should have WL alternate citation");
});

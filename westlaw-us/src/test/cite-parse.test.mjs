import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModules } from "./helpers/load.mjs";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var fixtures = JSON.parse(readFileSync(path.join(__dirname, "fixtures/cite-strings.json"), "utf8"));

var ctx = loadModules(["text.js", "reporters.js", "cite-parse.js"]);

describe("wlCiteParseStandardForm", function() {
  it("parses G1: Sanchez v. Liggett & Myers, Inc.", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G1.long);
    assert.equal(r.ok, true);
    assert.equal(r.dialect, "standard");
    assert.equal(r.name, fixtures.G1.expected.name);
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.citations[0].volume, "187");
    assert.equal(r.citations[0].reporter, "F.3d");
    assert.equal(r.citations[0].page, "486");
    assert.equal(r.court, "5th Cir.");
    assert.equal(r.year, "1999");
    assert.equal(r.pin, null);
    assert.equal(r.history, "");
    assert.equal(r.reviewReasons.length, 0);
  });

  it("parses G1b: United States v. Philip Morris USA Inc. (D.C. Cir.)", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G1b.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.G1b.expected.name);
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.citations[0].volume, "566");
    assert.equal(r.citations[0].reporter, "F.3d");
    assert.equal(r.citations[0].page, "1095");
    assert.equal(r.court, "D.C. Cir.");
    assert.equal(r.year, "2009");
  });

  it("parses G2: United States v. Philip Morris USA, Inc. with history", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G2.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.G2.expected.name);
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.citations[0].volume, "449");
    assert.equal(r.citations[0].reporter, "F. Supp. 2d");
    assert.equal(r.citations[0].page, "1");
    assert.equal(r.court, "D.D.C.");
    assert.equal(r.year, "2006");
    assert.ok(r.history.length > 0);
    assert.ok(r.history.includes("aff'd in part"));
    // History citations are NOT added to main citations
    assert.equal(r.citations.length, 1);
  });

  it("parses G4: Miele v. Am. Tobacco Co. with parallel citations", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G4.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.G4.expected.name);
    assert.equal(r.citations.length, 2);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.citations[0].volume, "2");
    assert.equal(r.citations[0].reporter, "A.D.3d");
    assert.equal(r.citations[0].page, "799");
    assert.equal(r.citations[1].kind, "reporter");
    assert.equal(r.citations[1].volume, "770");
    assert.equal(r.citations[1].reporter, "N.Y.S.2d");
    assert.equal(r.citations[1].page, "386");
    assert.equal(r.court, "");
    assert.equal(r.year, "2003");
  });

  it("parses pin in parallel run: Miele with pin 802", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G4pin.long);
    assert.equal(r.ok, true);
    assert.equal(r.pin, "802");
    assert.equal(r.citations.length, 2);
  });

  it("parses G5 Texas: Rogers v. R.J. Reynolds Tobacco Co.", function() {
    var r = ctx.wlCiteParseTexasForm(fixtures.G5.long);
    assert.equal(r.ok, true);
    assert.equal(r.dialect, "texas");
    assert.equal(r.name, fixtures.G5.expected.name);
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.citations[0].volume, "761");
    assert.equal(r.citations[0].reporter, "S.W.2d");
    assert.equal(r.citations[0].page, "788");
    assert.equal(r.court, "Tex. App.—Beaumont");
    assert.equal(r.year, "1988");
    assert.equal(r.parentheticalSuffix, "writ denied");
  });

  it("parses G7 WL-only via standard parser", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G7.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.G7.expected.name);
    assert.equal(JSON.stringify(r.dockets), JSON.stringify(fixtures.G7.expected.dockets));
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, "wl");
    assert.equal(r.citations[0].volume, "2024");
    assert.equal(r.citations[0].reporter, "WL");
    assert.equal(r.citations[0].page, "1234567");
    assert.equal(r.pin, "*4");
    assert.equal(r.court, "D. Kan.");
    assert.equal(r.year, "2024");
    assert.equal(r.date, "2024-03-01");
  });

  it("D1: unparsed segment between citation and parenthetical (N.Y. Slip Op.)", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.d1UnparsedBetweenCitationAndParen.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.synthetic.d1UnparsedBetweenCitationAndParen.expected.name);
    assert.equal(r.pin, null);
    assert.equal(r.citations.length, 2);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.citations[1].kind, "unparsed");
    assert.equal(r.citations[1].raw, "2003 N.Y. Slip Op. 19972");
    assert.equal(r.court, "App. Div.");
    assert.equal(r.year, "2003");
    assert.equal(r.reviewReasons.length, 1);
    assert.equal(r.reviewReasons[0], "unknown-reporter");
  });

  it("D2: No. inside party name is NOT treated as a docket", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.d2NoDocketInPartyName.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.synthetic.d2NoDocketInPartyName.expected.name);
    assert.equal(JSON.stringify(r.dockets), JSON.stringify([]));
    assert.equal(r.citations.length, 1);
    assert.equal(r.court, "5th Cir.");
    assert.equal(r.year, "1999");
  });

  it("D2: docket region stripped from name and returned as dockets", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G7.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, "Example v. Sample");
    assert.equal(JSON.stringify(r.dockets), JSON.stringify(["No. 24-123"]));
  });

  it("synthetic: Illinois case", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.illinois.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.synthetic.illinois.expected.name);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.court, "Ill. App. Ct.");
    assert.equal(r.year, "1950");
  });

  it("synthetic: Alabama case", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.alabama.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.synthetic.alabama.expected.name);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.court, "Ala.");
    assert.equal(r.year, "1942");
  });

  it("synthetic: name with numerals and comma (3M)", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.numeralsComma.long);
    assert.equal(r.ok, true);
    assert.equal(r.name, fixtures.synthetic.numeralsComma.expected.name);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.court, "Fed. Cir.");
    assert.equal(r.year, "2021");
  });

  it("synthetic: reporter-internal paren (CCH) → unparsed kind + review reason", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.reporterInternalParen.long);
    assert.equal(r.ok, true);
    assert.equal(r.citations[0].kind, "unparsed");
    assert.equal(r.reviewReasons.length, 1);
    assert.equal(r.reviewReasons[0], "unknown-reporter");
    assert.equal(r.court, "S.D.N.Y.");
    assert.equal(r.year, "2020");
  });

  it("synthetic: history with later year", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.historyLaterYear.long);
    assert.equal(r.ok, true);
    assert.equal(r.court, "Tex. App.");
    assert.equal(r.year, "1988");
    assert.ok(r.history.startsWith("writ denied"));
    assert.equal(r.citations.length, 1);
  });

  it("synthetic: parallel run with two citations", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.parallelRun.long);
    assert.equal(r.ok, true);
    assert.equal(r.citations.length, 2);
    assert.equal(r.court, "");
    assert.equal(r.year, "2003");
  });

  it("synthetic: unbalanced parens → ok:false", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.unbalanced.long);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "unbalanced-parens");
  });

  it("synthetic: empty input → ok:false", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.emptyInput.long);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "empty-input");
  });

  it("synthetic: no citation anchor → ok:false", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.noAnchor.long);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-citation-anchor");
  });
});

describe("wlCiteParseTexasForm", function() {
  it("parses Texas form with em-dash court and writ status", function() {
    var r = ctx.wlCiteParseTexasForm(fixtures.G5.long);
    assert.equal(r.ok, true);
    assert.equal(r.dialect, "texas");
    assert.equal(r.court, "Tex. App.—Beaumont");
    assert.equal(r.year, "1988");
    assert.equal(r.parentheticalSuffix, "writ denied");
  });

  it("round-trips Texas long form", function() {
    var r = ctx.wlCiteParseTexasForm(fixtures.G5.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.G5.long);
    assert.equal(rt.ok, true);
  });
});

describe("wlCiteParseWestlawInventory", function() {
  it("parses Sanchez westlaw inventory with docket", function() {
    var r = ctx.wlCiteParseWestlawInventory(fixtures.westlawInventory.sanchez.long);
    assert.equal(r.ok, true);
    assert.equal(r.dockets.length, 1);
    assert.equal(r.dockets[0], "No. 98-40679");
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.date, "1999-08-25");
    assert.equal(r.rawCourt, "5th Cir.(Tex.)");
    assert.equal(r.reviewReasons.length, 1);
    assert.equal(r.reviewReasons[0], "docket-in-long-form");
  });

  it("parses Miele westlaw inventory with many dockets and WL cite", function() {
    var r = ctx.wlCiteParseWestlawInventory(fixtures.westlawInventory.miele.long);
    assert.equal(r.ok, true);
    assert.equal(r.dockets.length, 7);
    assert.equal(r.dockets[0], "No. 019125/97");
    assert.equal(r.dockets[6], "2002-01777");
    assert.equal(r.citations.length, 2);
    assert.equal(r.citations[0].kind, "reporter");
    assert.equal(r.citations[1].kind, "wl");
    assert.equal(r.date, "2003-12-29");
    assert.equal(r.rawCourt, "N.Y.A.D. 2 Dept.");
    assert.ok(r.wl !== null);
    assert.equal(r.wl.kind, "wl");
    assert.equal(r.reviewReasons.length, 1);
    assert.equal(r.reviewReasons[0], "docket-in-long-form");
  });
});

describe("wlCiteRoundTrip", function() {
  it("round-trips G1 standard long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G1.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.G1.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips G2 standard long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G2.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.G2.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips G1b standard long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G1b.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.G1b.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips G4 standard long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.G4.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.G4.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips G5 texas long form", function() {
    var r = ctx.wlCiteParseTexasForm(fixtures.G5.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.G5.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips Illinois synthetic long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.illinois.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.synthetic.illinois.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips Alabama synthetic long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.alabama.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.synthetic.alabama.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips 3M synthetic long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.numeralsComma.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.synthetic.numeralsComma.long);
    assert.equal(rt.ok, true);
  });

  it("round-trips Texas history long form", function() {
    var r = ctx.wlCiteParseStandardForm(fixtures.synthetic.historyLaterYear.long);
    var rt = ctx.wlCiteRoundTrip(r, fixtures.synthetic.historyLaterYear.long);
    assert.equal(rt.ok, true);
  });
});

describe("wlCiteParseShortName", function() {
  it("extracts name from named short form: Sanchez, 187 F.3d 486", function() {
    var primary = { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" };
    var r = ctx.wlCiteParseShortName("Sanchez, 187 F.3d 486", primary);
    assert.equal(r, "Sanchez");
  });

  it("extracts name from named short form with at-locator: Philip Morris USA Inc., 566 F.3d at 1105", function() {
    var primary = { kind: "reporter", volume: "566", reporter: "F.3d", page: "1095", raw: "566 F.3d 1095" };
    var r = ctx.wlCiteParseShortName("Philip Morris USA Inc., 566 F.3d at 1105", primary);
    assert.equal(r, "Philip Morris USA Inc.");
  });

  it("returns null for citation-only form: 187 F.3d 486", function() {
    var primary = { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" };
    var r = ctx.wlCiteParseShortName("187 F.3d 486", primary);
    assert.equal(r, null);
  });

  it("returns null for Id.", function() {
    var primary = { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" };
    var r = ctx.wlCiteParseShortName("Id.", primary);
    assert.equal(r, null);
  });

  it("returns null for Id. at 490", function() {
    var primary = { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" };
    var r = ctx.wlCiteParseShortName("Id. at 490", primary);
    assert.equal(r, null);
  });

  it("returns null for incompatible citation", function() {
    var primary = { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" };
    var r = ctx.wlCiteParseShortName("Sanchez, 566 F.3d 1095", primary);
    assert.equal(r, null);
  });

  it("selects from array of short forms", function() {
    var primary = { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" };
    var r = ctx.wlCiteSelectShortName(["187 F.3d 486", "Sanchez, 187 F.3d 486"], primary);
    assert.equal(r, "Sanchez");
  });
});

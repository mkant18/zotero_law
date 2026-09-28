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

describe("wlCiteRoundTrip: dockets, full date text, pin forms (R4)", function() {
  function assertField(r, name, expected) {
    assert.equal(JSON.stringify(r[name]), JSON.stringify(expected), name);
  }

  it("R4-1: WL form with docket, at-pin and full date recomposes exactly", function() {
    var text = "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)";
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assert.equal(r.name, "Example v. Sample");
    assertField(r, "dockets", ["No. 24-123"]);
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].kind, "wl");
    assert.equal(r.citations[0].raw, "2024 WL 1234567");
    assert.equal(r.pin, "*4");
    assert.equal(r.court, "D. Kan.");
    assert.equal(r.year, "2024");
    assert.equal(r.date, "2024-03-01");
    assert.equal(r.dateText, "Mar. 1, 2024");
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, true);
    assert.equal(rt.residual, "");
  });

  it("R4-2: WL form with docket, no pin, Sept. date recomposes exactly", function() {
    var text = "Sample v. Example, No. 24-456, 2024 WL 7654321 (D. Kan. Sept. 5, 2024)";
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assert.equal(r.name, "Sample v. Example");
    assertField(r, "dockets", ["No. 24-456"]);
    assert.equal(r.pin, null);
    assert.equal(r.court, "D. Kan.");
    assert.equal(r.year, "2024");
    assert.equal(r.date, "2024-09-05");
    assert.equal(r.dateText, "Sept. 5, 2024");
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, true);
    assert.equal(rt.residual, "");
  });

  it("R4-3: bare pinpoint after a reporter citation recomposes without 'at'", function() {
    var text = "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486, 490 (5th Cir. 1999)";
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assert.equal(r.name, "Sanchez v. Liggett & Myers, Inc.");
    assert.equal(r.citations.length, 1);
    assert.equal(r.citations[0].raw, "187 F.3d 486");
    assert.equal(r.pin, "490");
    assert.equal(r.court, "5th Cir.");
    assert.equal(r.year, "1999");
    assert.equal(r.date, null);
    assert.equal(r.dateText, null);
    assertField(r, "dockets", []);
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, true);
    assert.equal(rt.residual, "");
  });

  it("R4-4a: Miele parallel run (A.D.3d + N.Y.S.2d) round-trips", function() {
    var text = fixtures.synthetic.parallelRun.long;
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assert.equal(r.citations.length, 2);
    assert.equal(r.citations[0].raw, "2 A.D.3d 799");
    assert.equal(r.citations[1].raw, "770 N.Y.S.2d 386");
    assert.equal(r.pin, null);
    assert.equal(r.court, "");
    assert.equal(r.year, "2003");
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, true);
    assert.equal(rt.residual, "");
  });

  it("R4-4b: Miele parallel run with a pinpoint between the parallels round-trips", function() {
    var text = fixtures.G4pin.long;
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assert.equal(r.citations.length, 2);
    assert.equal(r.pin, "802");
    assert.equal(r.pinAfter, 0);
    assert.equal(r.pinAt, false);
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, true);
    assert.equal(rt.residual, "");
  });

  it("R4-4c: Miele N.Y.S.2d + Slip Op. alternate round-trips", function() {
    var text = fixtures.synthetic.d1UnparsedBetweenCitationAndParen.long;
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assert.equal(r.citations.length, 2);
    assert.equal(r.citations[1].kind, "unparsed");
    assert.equal(r.court, "App. Div.");
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, true);
    assert.equal(rt.residual, "");
  });

  it("R4: multi-number docket list keeps original tokens and round-trips", function() {
    var text = "Foo v. Bar, Nos. 1-2, 3-4, 187 F.3d 486 (5th Cir. 1999)";
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assert.equal(r.name, "Foo v. Bar");
    assertField(r, "dockets", ["Nos. 1-2", "3-4"]);
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, true);
  });

  it("R4: bare numbers in a party name are not dockets", function() {
    var text = "Local 3, 5 Workers v. Roe, 1 F.3d 2 (5th Cir. 1999)";
    var r = ctx.wlCiteParseStandardForm(text);
    assert.equal(r.ok, true);
    assertField(r, "dockets", []);
    assert.equal(r.name, "Local 3, 5 Workers v. Roe");
  });

  it("R4 negative: mutated dateText is still a round-trip mismatch", function() {
    var text = "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)";
    var r = ctx.wlCiteParseStandardForm(text);
    r.dateText = "Mar. 2, 2024";
    var rt = ctx.wlCiteRoundTrip(r, text);
    assert.equal(rt.ok, false);
    assert.ok(rt.residual.indexOf("Mar. 2, 2024") !== -1);
  });

  it("R4 negative: dropped docket or altered original text is a mismatch", function() {
    var text = "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)";
    var r = ctx.wlCiteParseStandardForm(text);
    r.dockets = [];
    assert.equal(ctx.wlCiteRoundTrip(r, text).ok, false);
    var r2 = ctx.wlCiteParseStandardForm(text);
    assert.equal(ctx.wlCiteRoundTrip(r2, text.replace("Mar. 1, 2024", "Mar. 3, 2024")).ok, false);
  });
});

describe("W8: cite-parse defects from independent review", function() {
  function assertField(r, name, expected) {
    assert.equal(JSON.stringify(r[name]), JSON.stringify(expected), name);
  }
  var parsers = ["wlCiteParseStandardForm", "wlCiteParseTexasForm"];

  describe("P1-1: Texas parenthetical with a full date", function() {
    var withSuffix = "Smith v. Jones, No. 21-1, 2023 WL 123456 (Tex. App.—Houston [1st Dist.] Sept. 5, 2023, no pet.)";
    var noSuffix = "Smith v. Jones, No. 21-1, 2023 WL 123456 (Tex. App.—Austin June 1, 2023)";

    parsers.forEach(function(fn) {
      it(fn + ": full date + suffix keeps the court clean", function() {
        var r = ctx[fn](withSuffix);
        assert.equal(r.ok, true);
        assert.equal(r.court, "Tex. App.—Houston [1st Dist.]");
        assert.equal(r.date, "2023-09-05");
        assert.equal(r.dateText, "Sept. 5, 2023");
        assert.equal(r.year, "2023");
        assert.equal(r.parentheticalSuffix, "no pet.");
        assertField(r, "dockets", ["No. 21-1"]);
        var rt = ctx.wlCiteRoundTrip(r, withSuffix);
        assert.equal(rt.ok, true, rt.residual);
      });

      it(fn + ": full date without suffix", function() {
        var r = ctx[fn](noSuffix);
        assert.equal(r.ok, true);
        assert.equal(r.court, "Tex. App.—Austin");
        assert.equal(r.date, "2023-06-01");
        assert.equal(r.dateText, "June 1, 2023");
        assert.equal(r.year, "2023");
        assert.equal(r.parentheticalSuffix, "");
        var rt = ctx.wlCiteRoundTrip(r, noSuffix);
        assert.equal(rt.ok, true, rt.residual);
      });
    });

    it("G5 Rogers year-comma-writ form is unchanged", function() {
      var r = ctx.wlCiteParseTexasForm(fixtures.G5.long);
      assert.equal(r.court, "Tex. App.—Beaumont");
      assert.equal(r.year, "1988");
      assert.equal(r.date, null);
      assert.equal(r.dateText, null);
      assert.equal(r.parentheticalSuffix, "writ denied");
    });
  });

  describe("P1-2: dockets the old docket regex missed", function() {
    var cases = [
      ["parenthetical judge initials", "Smith v. Jones, No. 1:21-cv-123 (JPO), 2023 WL 123456 (S.D.N.Y. Sept. 5, 2023)", ["No. 1:21-cv-123 (JPO)"]],
      ["consolidated (L) lead marker", "Smith v. Jones, No. 21-1 (L), 21-2, 2023 WL 123456 (S.D.N.Y. Sept. 5, 2023)", ["No. 21-1 (L)", "21-2"]],
      ["ampersand list", "Smith v. Jones, Nos. 22-1 & 22-2, 2023 WL 123456 (S.D.N.Y. Sept. 5, 2023)", ["Nos. 22-1 & 22-2"]],
      ["comma + and list", "Smith v. Jones, Nos. 22-1, 22-2 and 22-3, 2023 WL 123456 (S.D.N.Y. Sept. 5, 2023)", ["Nos. 22-1", "22-2 and 22-3"]]
    ];
    cases.forEach(function(c) {
      parsers.forEach(function(fn) {
        it(fn + ": " + c[0], function() {
          var r = ctx[fn](c[1]);
          assert.equal(r.ok, true);
          assert.equal(r.name, "Smith v. Jones");
          assertField(r, "dockets", c[2]);
          assert.equal(r.reviewReasons.indexOf("docket-in-name"), -1);
          assert.equal(r.court, "S.D.N.Y.");
          assert.equal(r.dateText, "Sept. 5, 2023");
          var rt = ctx.wlCiteRoundTrip(r, c[1]);
          assert.equal(rt.ok, true, rt.residual);
        });
      });
    });

    [
      "Local 1199 v. Roe",
      "Doe No. 2 v. Roe",
      "In re Grand Jury Subpoena No. 7",
      "United States v. $124,700 in U.S. Currency",
      "No. 5 Corp."
    ].forEach(function(caseName) {
      it("name-safety: stays in the name, no docket, no flag: " + caseName, function() {
        var text = caseName + ", 1 F.3d 2 (5th Cir. 1999)";
        parsers.forEach(function(fn) {
          var r = ctx[fn](text);
          assert.equal(r.ok, true);
          assert.equal(r.name, caseName);
          assertField(r, "dockets", []);
          assertField(r, "reviewReasons", []);
          assert.equal(ctx.wlCiteRoundTrip(r, text).ok, true);
        });
      });
    });

    it("name-safety: Co., No. 5, Inc. stays in the name and is flagged docket-in-name", function() {
      var text = "Co., No. 5, Inc., 1 F.3d 2 (5th Cir. 1999)";
      parsers.forEach(function(fn) {
        var r = ctx[fn](text);
        assert.equal(r.ok, true);
        assert.equal(r.name, "Co., No. 5, Inc.");
        assertField(r, "dockets", []);
        assert.ok(r.reviewReasons.indexOf("docket-in-name") !== -1);
        assert.equal(ctx.wlCiteRoundTrip(r, text).ok, true);
      });
    });

    it("an unrecognized docket form is never silent: docket-in-name", function() {
      var text = "Smith v. Jones, No. 21-1 [sealed], 2023 WL 123456 (S.D.N.Y. Sept. 5, 2023)";
      parsers.forEach(function(fn) {
        var r = ctx[fn](text);
        assert.equal(r.ok, true);
        assert.equal(r.name, "Smith v. Jones, No. 21-1 [sealed]");
        assertField(r, "dockets", []);
        assert.ok(r.reviewReasons.indexOf("docket-in-name") !== -1);
      });
    });
  });

  describe("P2: Texas pin, history separator, court-less date", function() {
    it("Texas parser: pin after the last citation (shared logic with standard)", function() {
      var text = "Smith v. Jones, No. 24-123, 123 S.W.3d 456, 460 (Tex. App.—Austin 2003, pet. denied)";
      var r = ctx.wlCiteParseTexasForm(text);
      assert.equal(r.ok, true);
      assert.equal(r.pin, "460");
      assert.equal(r.pinAfter, 0);
      assert.equal(r.pinAt, false);
      assert.equal(r.citations.length, 1);
      assert.equal(r.court, "Tex. App.—Austin");
      assert.equal(r.parentheticalSuffix, "pet. denied");
      var rt = ctx.wlCiteRoundTrip(r, text);
      assert.equal(rt.ok, true, rt.residual);
      var s = ctx.wlCiteParseStandardForm(text);
      assert.equal(s.pin, "460");
      assert.equal(s.pinAfter, 0);
    });

    parsers.forEach(function(fn) {
      it(fn + ": history parenthetical with no leading comma round-trips", function() {
        var text = "Smith v. Jones, 123 F.3d 456 (2d Cir. Sept. 5, 2023) (unpublished table decision)";
        var r = ctx[fn](text);
        assert.equal(r.ok, true);
        assert.equal(r.court, "2d Cir.");
        assert.equal(r.dateText, "Sept. 5, 2023");
        assert.equal(r.history, "(unpublished table decision)");
        assert.equal(r.historySep, " ");
        var rt = ctx.wlCiteRoundTrip(r, text);
        assert.equal(rt.ok, true, rt.residual);
      });

      it(fn + ": comma-separated history keeps the ', ' separator", function() {
        var text = fixtures.G2.long;
        var r = ctx[fn](text);
        assert.equal(r.historySep, ", ");
        assert.equal(r.history, fixtures.G2.expected.history);
        assert.equal(ctx.wlCiteRoundTrip(r, text).ok, true);
      });

      it(fn + ": court-less date parenthetical", function() {
        var text = "Smith v. Jones, 123 F.3d 456 (Sept. 5, 2023)";
        var r = ctx[fn](text);
        assert.equal(r.ok, true);
        assert.equal(r.court, "");
        assert.equal(r.dateText, "Sept. 5, 2023");
        assert.equal(r.date, "2023-09-05");
        assert.equal(r.year, "2023");
        var rt = ctx.wlCiteRoundTrip(r, text);
        assert.equal(rt.ok, true, rt.residual);
      });
    });

    it("round trip stays an exact equality check for history separators", function() {
      var text = "Smith v. Jones, 123 F.3d 456 (2d Cir. Sept. 5, 2023) (unpublished table decision)";
      var r = ctx.wlCiteParseStandardForm(text);
      r.historySep = ", ";
      assert.equal(ctx.wlCiteRoundTrip(r, text).ok, false);
    });
  });

  describe("P2: input-length guard", function() {
    var base = " v. B, 1 F.3d 2 (5th Cir. 1999)";
    function textOfLength(n) { return "A".repeat(n - base.length) + base; }

    it("cleaned input longer than 2000 chars is rejected by every parse entry point", function() {
      var text = textOfLength(2001);
      assert.equal(text.length, 2001);
      var fns = ["wlCiteParseStandardForm", "wlCiteParseTexasForm", "wlCiteParseWestlawInventory"];
      fns.forEach(function(fn) {
        var r = ctx[fn](text);
        assert.equal(r.ok, false, fn);
        assert.equal(r.reason, "input-too-long", fn);
      });
    });

    it("input of exactly 2000 chars still parses", function() {
      var text = textOfLength(2000);
      assert.equal(text.length, 2000);
      var r = ctx.wlCiteParseStandardForm(text);
      assert.equal(r.ok, true);
      assert.equal(r.citations[0].raw, "1 F.3d 2");
    });

    it("long reporter-less input returns fast (no superlinear anchor scan)", function() {
      var text = "word ".repeat(8000);
      var t0 = Date.now();
      var r = ctx.wlCiteParseStandardForm(text);
      var anchors = ctx.wlCiteFindAnchorsInText(text);
      assert.equal(r.ok, false);
      assert.equal(r.reason, "input-too-long");
      assert.equal(anchors.length, 0);
      assert.ok(Date.now() - t0 < 200);
    });

    it("short-name parser returns null for oversized input", function() {
      var primary = { kind: "reporter", volume: "1", reporter: "F.3d", page: "2", raw: "1 F.3d 2" };
      assert.equal(ctx.wlCiteParseShortName("A".repeat(2001) + ", 1 F.3d 2", primary), null);
    });
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";
var require = createRequire(import.meta.url);
var mod = require("../reporters.js");

describe("wlRepLookup", function() {
  it("finds canonical abbreviation", function() {
    var entry = mod.wlRepLookup("F.3d");
    assert.ok(entry);
    assert.equal(entry.abbr, "F.3d");
  });
  it("finds alias F.Supp.2d for F. Supp. 2d", function() {
    var entry = mod.wlRepLookup("F.Supp.2d");
    assert.ok(entry);
    assert.equal(entry.abbr, "F. Supp. 2d");
  });
  it("finds canonical F. Supp. 2d", function() {
    var entry = mod.wlRepLookup("F. Supp. 2d");
    assert.ok(entry);
    assert.equal(entry.abbr, "F. Supp. 2d");
  });
  it("finds S.Ct. alias for S. Ct.", function() {
    var entry = mod.wlRepLookup("S.Ct.");
    assert.ok(entry);
    assert.equal(entry.abbr, "S. Ct.");
  });
  it("finds L.Ed.2d alias for L. Ed. 2d", function() {
    var entry = mod.wlRepLookup("L.Ed.2d");
    assert.ok(entry);
    assert.equal(entry.abbr, "L. Ed. 2d");
  });
  it("finds Fed.Appx. alias for F. App'x", function() {
    var entry = mod.wlRepLookup("Fed.Appx.");
    assert.ok(entry);
    assert.equal(entry.abbr, "F. App'x");
  });
  it("finds F.App'x alias for F. App'x", function() {
    var entry = mod.wlRepLookup("F.App'x");
    assert.ok(entry);
    assert.equal(entry.abbr, "F. App'x");
  });
  it("finds WL", function() {
    var entry = mod.wlRepLookup("WL");
    assert.ok(entry);
    assert.equal(entry.kind, "wl");
  });
  it("returns null for unknown", function() {
    assert.equal(mod.wlRepLookup("Unknown"), null);
  });
  it("returns null for null", function() {
    assert.equal(mod.wlRepLookup(null), null);
  });
  it("whitespace-insensitive around periods", function() {
    var e1 = mod.wlRepLookup("F.Supp.2d");
    var e2 = mod.wlRepLookup("F. Supp. 2d");
    assert.ok(e1 && e2 && e1.abbr === e2.abbr);
  });
});

describe("wlRepCanonical", function() {
  it("returns canonical for unspaced form", function() {
    assert.equal(mod.wlRepCanonical("F.Supp.2d"), "F. Supp. 2d");
  });
  it("returns canonical for spaced form", function() {
    assert.equal(mod.wlRepCanonical("F. Supp. 2d"), "F. Supp. 2d");
  });
  it("returns canonical for S.Ct.", function() {
    assert.equal(mod.wlRepCanonical("S.Ct."), "S. Ct.");
  });
  it("returns null for unknown", function() {
    assert.equal(mod.wlRepCanonical("Unknown"), null);
  });
});

describe("wlRepFindCitations", function() {
  it("finds one F.3d citation", function() {
    var result = mod.wlRepFindCitations("Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)");
    assert.equal(result.length, 1);
    assert.equal(result[0].kind, "reporter");
    assert.equal(result[0].volume, "187");
    assert.equal(result[0].reporter, "F.3d");
    assert.equal(result[0].page, "486");
    assert.equal(result[0].raw, "187 F.3d 486");
    assert.equal(result[0].index, 34);
  });
  it("finds two citations in order", function() {
    var result = mod.wlRepFindCitations("Miele v. Am. Tobacco Co., 2 A.D.3d 799, 770 N.Y.S.2d 386 (2003)");
    assert.equal(result.length, 2);
    assert.equal(result[0].reporter, "A.D.3d");
    assert.equal(result[0].volume, "2");
    assert.equal(result[0].page, "799");
    assert.equal(result[1].reporter, "N.Y.S.2d");
    assert.equal(result[1].volume, "770");
    assert.equal(result[1].page, "386");
  });
  it("finds N.Y.S.2d and WL citation", function() {
    var result = mod.wlRepFindCitations("770 N.Y.S.2d 386, 2003 N.Y. Slip Op. 19972, 2003 WL 23099090");
    assert.equal(result.length, 2);
    assert.equal(result[0].reporter, "N.Y.S.2d");
    assert.equal(result[0].volume, "770");
    assert.equal(result[0].page, "386");
    assert.equal(result[1].kind, "wl");
    assert.equal(result[1].volume, "2003");
    assert.equal(result[1].reporter, "WL");
    assert.equal(result[1].page, "23099090");
  });
  it("does not crash on Slip Op (unknown reporter)", function() {
    var result = mod.wlRepFindCitations("2003 N.Y. Slip Op. 19972");
    // N.Y. Slip Op is not a known reporter, so no citation should be found for it
    // (N.Y. is a known reporter but "Slip Op" is not part of the citation format)
    assert.ok(Array.isArray(result));
  });
  it("canonicalizes F.Supp.2d to F. Supp. 2d", function() {
    var result = mod.wlRepFindCitations("449 F.Supp.2d 1");
    assert.equal(result.length, 1);
    assert.equal(result[0].reporter, "F. Supp. 2d");
    assert.equal(result[0].volume, "449");
    assert.equal(result[0].page, "1");
    assert.equal(result[0].raw, "449 F. Supp. 2d 1");
  });
  it("page 1095 not 1105 in comma-separated pages", function() {
    var result = mod.wlRepFindCitations("566 F.3d 1095, 1105");
    assert.equal(result.length, 1);
    assert.equal(result[0].page, "1095");
  });
  it("finds citation in history string", function() {
    var result = mod.wlRepFindCitations("aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)");
    assert.equal(result.length, 1);
    assert.equal(result[0].reporter, "F.3d");
    assert.equal(result[0].volume, "566");
    assert.equal(result[0].page, "1095");
  });
  it("returns empty array for empty input", function() {
    var result = mod.wlRepFindCitations("");
    assert.equal(result.length, 0);
  });
  it("returns empty array for null input", function() {
    var result = mod.wlRepFindCitations(null);
    assert.equal(result.length, 0);
  });
  it("includes index and length on each citation", function() {
    var result = mod.wlRepFindCitations("187 F.3d 486");
    assert.equal(result.length, 1);
    assert.equal(typeof result[0].index, "number");
    assert.equal(typeof result[0].length, "number");
    assert.equal(result[0].index, 0);
    assert.equal(result[0].length, 12);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";
var require = createRequire(import.meta.url);
var mod = require("../text.js");

describe("wlTextClean", function() {
  it("returns empty string for null", function() {
    assert.equal(mod.wlTextClean(null), "");
  });
  it("returns empty string for undefined", function() {
    assert.equal(mod.wlTextClean(undefined), "");
  });
  it("removes zero-width watermark chars U+200B-U+200F", function() {
    for (var cp = 0x200B; cp <= 0x200F; cp++) {
      var ch = String.fromCharCode(cp);
      assert.equal(mod.wlTextClean("a" + ch + "b"), "ab");
    }
  });
  it("removes zero-width watermark chars U+2060-U+2064", function() {
    for (var cp = 0x2060; cp <= 0x2064; cp++) {
      var ch = String.fromCharCode(cp);
      assert.equal(mod.wlTextClean("a" + ch + "b"), "ab");
    }
  });
  it("removes U+FEFF", function() {
    assert.equal(mod.wlTextClean("a\uFEFFb"), "ab");
  });
  it("converts NBSP U+00A0 to space", function() {
    assert.equal(mod.wlTextClean("a\u00A0b"), "a b");
  });
  it("converts NBSP U+202F to space", function() {
    assert.equal(mod.wlTextClean("a\u202Fb"), "a b");
  });
  it("collapses runs of whitespace to one space", function() {
    assert.equal(mod.wlTextClean("a  b"), "a b");
    assert.equal(mod.wlTextClean("a\tb"), "a b");
    assert.equal(mod.wlTextClean("a\nb"), "a b");
  });
  it("trims leading and trailing whitespace", function() {
    assert.equal(mod.wlTextClean("  hello  "), "hello");
  });
  it("preserves em dash U+2014", function() {
    assert.equal(mod.wlTextClean("a\u2014b"), "a\u2014b");
  });
  it("preserves en dash U+2013", function() {
    assert.equal(mod.wlTextClean("a\u2013b"), "a\u2013b");
  });
  it("preserves apostrophes both forms", function() {
    assert.equal(mod.wlTextClean("it's"), "it's");
    assert.equal(mod.wlTextClean("it\u2019s"), "it\u2019s");
  });
  it("preserves accents via NFC", function() {
    var input = "e\u0301"; // e + combining acute accent
    var result = mod.wlTextClean(input);
    assert.equal(result, "\u00E9"); // NFC form of e + acute
  });
  it("preserves ampersand", function() {
    assert.equal(mod.wlTextClean("A & B"), "A & B");
  });
});

describe("wlTextNormalizeDashes", function() {
  it("converts U+2010 to hyphen", function() {
    assert.equal(mod.wlTextNormalizeDashes("a\u2010b"), "a-b");
  });
  it("converts U+2011 to hyphen", function() {
    assert.equal(mod.wlTextNormalizeDashes("a\u2011b"), "a-b");
  });
  it("converts U+2012 to hyphen", function() {
    assert.equal(mod.wlTextNormalizeDashes("a\u2012b"), "a-b");
  });
  it("converts U+2013 (en dash) to hyphen", function() {
    assert.equal(mod.wlTextNormalizeDashes("a\u2013b"), "a-b");
  });
  it("converts U+2014 (em dash) to hyphen", function() {
    assert.equal(mod.wlTextNormalizeDashes("a\u2014b"), "a-b");
  });
  it("converts U+2015 to hyphen", function() {
    assert.equal(mod.wlTextNormalizeDashes("a\u2015b"), "a-b");
  });
  it("converts U+2212 (minus) to hyphen", function() {
    assert.equal(mod.wlTextNormalizeDashes("a\u2212b"), "a-b");
  });
  it("does not convert em dash in clean output (this is for comparison keys only)", function() {
    // wlTextNormalizeDashes is for comparison keys only
    assert.equal(mod.wlTextNormalizeDashes("Tex. App.\u2014Beaumont"), "Tex. App.-Beaumont");
  });
});

describe("wlTextCompareKey", function() {
  it("makes F.Supp.2d and F. Supp. 2d equal", function() {
    assert.equal(mod.wlTextCompareKey("F.Supp.2d"), mod.wlTextCompareKey("F. Supp. 2d"));
  });
  it("makes Tex. App.—Beaumont and Tex. App.-Beaumont equal", function() {
    assert.equal(mod.wlTextCompareKey("Tex. App.\u2014Beaumont"), mod.wlTextCompareKey("Tex. App.-Beaumont"));
  });
  it("converts U+2019 to ASCII apostrophe", function() {
    assert.equal(mod.wlTextCompareKey("it\u2019s"), "it's");
  });
  it("lowercases", function() {
    assert.equal(mod.wlTextCompareKey("F.3d"), "f.3d");
  });
  it("removes spaces around periods", function() {
    assert.equal(mod.wlTextCompareKey("F. Supp. 2d"), "f.supp.2d");
  });
});

describe("wlTextParseUSDate", function() {
  it("parses August 25, 1999", function() {
    assert.equal(mod.wlTextParseUSDate("August 25, 1999"), "1999-08-25");
  });
  it("parses Aug. 25, 1999", function() {
    assert.equal(mod.wlTextParseUSDate("Aug. 25, 1999"), "1999-08-25");
  });
  it("parses Sept. 5, 2024", function() {
    assert.equal(mod.wlTextParseUSDate("Sept. 5, 2024"), "2024-09-05");
  });
  it("parses September 5, 2024", function() {
    assert.equal(mod.wlTextParseUSDate("September 5, 2024"), "2024-09-05");
  });
  it("parses Dec. 29, 2003", function() {
    assert.equal(mod.wlTextParseUSDate("Dec. 29, 2003"), "2003-12-29");
  });
  it("parses Oct. 06, 1988", function() {
    assert.equal(mod.wlTextParseUSDate("Oct. 06, 1988"), "1988-10-06");
  });
  it("parses year-only 1988", function() {
    assert.equal(mod.wlTextParseUSDate("1988"), "1988");
  });
  it("returns null for invalid month", function() {
    assert.equal(mod.wlTextParseUSDate("Junk 25, 1999"), null);
  });
  it("returns null for Feb 30", function() {
    assert.equal(mod.wlTextParseUSDate("February 30, 1999"), null);
  });
  it("returns null for empty string", function() {
    assert.equal(mod.wlTextParseUSDate(""), null);
  });
  it("returns null for null", function() {
    assert.equal(mod.wlTextParseUSDate(null), null);
  });
  it("returns null for just a day", function() {
    assert.equal(mod.wlTextParseUSDate("25"), null);
  });
  it("accepts Feb 29 in leap year", function() {
    assert.equal(mod.wlTextParseUSDate("February 29, 2000"), "2000-02-29");
  });
  it("rejects Feb 29 in non-leap year", function() {
    assert.equal(mod.wlTextParseUSDate("February 29, 1999"), null);
  });
});

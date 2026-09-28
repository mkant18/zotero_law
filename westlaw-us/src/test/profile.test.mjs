import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./helpers/load.mjs";

var ctx = loadModules(["text.js", "reporters.js", "profile.js"]);
var wlProfClassifyCourt = ctx.wlProfClassifyCourt;
var wlProfSelectProfile = ctx.wlProfSelectProfile;
var wlProfCourtForCitation = ctx.wlProfCourtForCitation;
var wlProfT10 = ctx.wlProfT10;

describe("wlProfClassifyCourt", function() {
  describe("federal supreme", function() {
    it("Supreme Court of the United States", function() {
      var r = wlProfClassifyCourt("Supreme Court of the United States");
      assert.equal(r.system, "federal");
      assert.equal(r.level, "supreme");
      assert.equal(r.state, null);
      assert.equal(r.circuit, null);
      assert.equal(r.district, null);
      assert.equal(r.bluebook, "");
      assert.equal(r.confidence, "table");
    });
    it("Supreme Court of the United States with trailing period", function() {
      var r = wlProfClassifyCourt("Supreme Court of the United States.");
      assert.equal(r.system, "federal");
      assert.equal(r.level, "supreme");
      assert.equal(r.bluebook, "");
    });
  });

  describe("federal appellate circuits", function() {
    var circuits = [
      ["First Circuit", "1st Cir.", "1"],
      ["Second Circuit", "2nd Cir.", "2"],
      ["Third Circuit", "3rd Cir.", "3"],
      ["Fourth Circuit", "4th Cir.", "4"],
      ["Fifth Circuit", "5th Cir.", "5"],
      ["Sixth Circuit", "6th Cir.", "6"],
      ["Seventh Circuit", "7th Cir.", "7"],
      ["Eighth Circuit", "8th Cir.", "8"],
      ["Ninth Circuit", "9th Cir.", "9"],
      ["Tenth Circuit", "10th Cir.", "10"],
      ["Eleventh Circuit", "11th Cir.", "11"]
    ];
    for (var i = 0; i < circuits.length; i++) {
      (function(c) {
        var name = c[0], bluebook = c[1], circuit = c[2];
        it("United States Court of Appeals, " + name, function() {
          var r = wlProfClassifyCourt("United States Court of Appeals, " + name + ".");
          assert.equal(r.system, "federal");
          assert.equal(r.level, "appellate");
          assert.equal(r.circuit, circuit);
          assert.equal(r.bluebook, bluebook);
          assert.equal(r.confidence, "table");
        });
      })(circuits[i]);
    }
  });

  describe("federal appellate DC and Federal circuits", function() {
    it("District of Columbia Circuit", function() {
      var r = wlProfClassifyCourt("United States Court of Appeals, District of Columbia Circuit.");
      assert.equal(r.system, "federal");
      assert.equal(r.level, "appellate");
      assert.equal(r.circuit, "DC");
      assert.equal(r.bluebook, "D.C. Cir.");
    });
    it("Federal Circuit", function() {
      var r = wlProfClassifyCourt("United States Court of Appeals, Federal Circuit.");
      assert.equal(r.system, "federal");
      assert.equal(r.level, "appellate");
      assert.equal(r.circuit, "Fed");
      assert.equal(r.bluebook, "Fed. Cir.");
    });
  });

  describe("federal district courts", function() {
    it("United States District Court, District of Columbia", function() {
      var r = wlProfClassifyCourt("United States District Court, District of Columbia.");
      assert.equal(r.system, "federal");
      assert.equal(r.level, "district");
      assert.equal(r.district, "D.D.C.");
      assert.equal(r.bluebook, "D.D.C.");
    });
    it("United States District Court, D. Kansas", function() {
      var r = wlProfClassifyCourt("United States District Court, D. Kansas.");
      assert.equal(r.system, "federal");
      assert.equal(r.level, "district");
      assert.equal(r.district, "D. Kan.");
      assert.equal(r.bluebook, "D. Kan.");
    });
    it("District of Kansas", function() {
      var r = wlProfClassifyCourt("District of Kansas");
      assert.equal(r.district, "D. Kan.");
      assert.equal(r.bluebook, "D. Kan.");
    });
    it("S.D. New York", function() {
      var r = wlProfClassifyCourt("S.D. New York");
      assert.equal(r.district, "S.D.N.Y.");
      assert.equal(r.bluebook, "S.D.N.Y.");
    });
    it("Southern District of New York", function() {
      var r = wlProfClassifyCourt("Southern District of New York");
      assert.equal(r.district, "S.D.N.Y.");
      assert.equal(r.bluebook, "S.D.N.Y.");
    });
    it("N.D. Cal.", function() {
      var r = wlProfClassifyCourt("N.D. Cal.");
      assert.equal(r.district, "N.D. Cal.");
      assert.equal(r.bluebook, "N.D. Cal.");
    });
    it("Northern District of California", function() {
      var r = wlProfClassifyCourt("Northern District of California");
      assert.equal(r.district, "N.D. Cal.");
      assert.equal(r.bluebook, "N.D. Cal.");
    });
    it("C.D. Cal.", function() {
      var r = wlProfClassifyCourt("C.D. Cal.");
      assert.equal(r.district, "C.D. Cal.");
      assert.equal(r.bluebook, "C.D. Cal.");
    });
    it("Central District of California", function() {
      var r = wlProfClassifyCourt("Central District of California");
      assert.equal(r.district, "C.D. Cal.");
      assert.equal(r.bluebook, "C.D. Cal.");
    });
    it("E.D. Pa.", function() {
      var r = wlProfClassifyCourt("E.D. Pa.");
      assert.equal(r.district, "E.D. Pa.");
      assert.equal(r.bluebook, "E.D. Pa.");
    });
    it("Eastern District of Pennsylvania", function() {
      var r = wlProfClassifyCourt("Eastern District of Pennsylvania");
      assert.equal(r.district, "E.D. Pa.");
      assert.equal(r.bluebook, "E.D. Pa.");
    });
    it("N.D. Ill.", function() {
      var r = wlProfClassifyCourt("N.D. Ill.");
      assert.equal(r.district, "N.D. Ill.");
      assert.equal(r.bluebook, "N.D. Ill.");
    });
    it("Northern District of Illinois", function() {
      var r = wlProfClassifyCourt("Northern District of Illinois");
      assert.equal(r.district, "N.D. Ill.");
      assert.equal(r.bluebook, "N.D. Ill.");
    });
    it("S.D. Tex.", function() {
      var r = wlProfClassifyCourt("S.D. Tex.");
      assert.equal(r.district, "S.D. Tex.");
      assert.equal(r.bluebook, "S.D. Tex.");
    });
    it("Southern District of Texas", function() {
      var r = wlProfClassifyCourt("Southern District of Texas");
      assert.equal(r.district, "S.D. Tex.");
      assert.equal(r.bluebook, "S.D. Tex.");
    });
    it("N.D. Tex.", function() {
      var r = wlProfClassifyCourt("N.D. Tex.");
      assert.equal(r.district, "N.D. Tex.");
      assert.equal(r.bluebook, "N.D. Tex.");
    });
    it("Northern District of Texas", function() {
      var r = wlProfClassifyCourt("Northern District of Texas");
      assert.equal(r.district, "N.D. Tex.");
      assert.equal(r.bluebook, "N.D. Tex.");
    });
  });

  describe("state courts", function() {
    it("Supreme Court, Appellate Division, Second Department, New York", function() {
      var r = wlProfClassifyCourt("Supreme Court, Appellate Division, Second Department, New York.");
      assert.equal(r.system, "state");
      assert.equal(r.level, "intermediate");
      assert.equal(r.state, "NY");
      assert.equal(r.bluebook, "App. Div.");
    });
  });

  describe("Texas courts of appeals - all 14 cities", function() {
    var txCourts = [
      ["Houston (1st Dist.)", "Tex. App.\u2014Houston [1st Dist.]"],
      ["Houston (14th Dist.)", "Tex. App.\u2014Houston [14th Dist.]"],
      ["Fort Worth", "Tex. App.\u2014Fort Worth"],
      ["Austin", "Tex. App.\u2014Austin"],
      ["San Antonio", "Tex. App.\u2014San Antonio"],
      ["Dallas", "Tex. App.\u2014Dallas"],
      ["Texarkana", "Tex. App.\u2014Texarkana"],
      ["Amarillo", "Tex. App.\u2014Amarillo"],
      ["El Paso", "Tex. App.\u2014El Paso"],
      ["Beaumont", "Tex. App.\u2014Beaumont"],
      ["Waco", "Tex. App.\u2014Waco"],
      ["Eastland", "Tex. App.\u2014Eastland"],
      ["Tyler", "Tex. App.\u2014Tyler"],
      ["Corpus Christi\u2013Edinburg", "Tex. App.\u2014Corpus Christi\u2013Edinburg"]
    ];
    for (var i = 0; i < txCourts.length; i++) {
      (function(c) {
        var city = c[0], bluebook = c[1];
        it("Court of Appeals of Texas, " + city, function() {
          var r = wlProfClassifyCourt("Court of Appeals of Texas, " + city + ".");
          assert.equal(r.system, "state");
          assert.equal(r.level, "intermediate");
          assert.equal(r.state, "TX");
          assert.equal(r.bluebook, bluebook);
        });
      })(txCourts[i]);
    }
  });

  describe("state supreme courts", function() {
    it("Supreme Court of California", function() {
      var r = wlProfClassifyCourt("Supreme Court of California.");
      assert.equal(r.system, "state");
      assert.equal(r.level, "supreme");
      assert.equal(r.state, "CA");
      assert.equal(r.bluebook, "Cal.");
    });
    it("Supreme Court of Texas", function() {
      var r = wlProfClassifyCourt("Supreme Court of Texas.");
      assert.equal(r.system, "state");
      assert.equal(r.level, "supreme");
      assert.equal(r.state, "TX");
      assert.equal(r.bluebook, "Tex.");
    });
  });

  describe("unknown court lines", function() {
    it("unknown line returns system unknown", function() {
      var r = wlProfClassifyCourt("Some Unknown Court");
      assert.equal(r.system, "unknown");
      assert.equal(r.level, "unknown");
      assert.equal(r.bluebook, null);
      assert.equal(r.confidence, "none");
    });
    it("null input", function() {
      var r = wlProfClassifyCourt(null);
      assert.equal(r.system, "unknown");
      assert.equal(r.confidence, "none");
    });
    it("undefined input", function() {
      var r = wlProfClassifyCourt(undefined);
      assert.equal(r.system, "unknown");
      assert.equal(r.confidence, "none");
    });
  });
});

describe("wlProfSelectProfile", function() {
  it("returns texas for Texas state intermediate appellate", function() {
    var c = wlProfClassifyCourt("Court of Appeals of Texas, Beaumont.");
    assert.equal(wlProfSelectProfile(c), "texas");
  });
  it("returns standard for Texas federal appellate (Fifth Circuit)", function() {
    var c = wlProfClassifyCourt("United States Court of Appeals, Fifth Circuit.");
    assert.equal(wlProfSelectProfile(c), "standard");
  });
  it("returns standard for federal appellate", function() {
    var c = wlProfClassifyCourt("United States Court of Appeals, Fifth Circuit.");
    assert.equal(wlProfSelectProfile(c), "standard");
  });
  it("returns standard for state supreme", function() {
    var c = wlProfClassifyCourt("Supreme Court of California.");
    assert.equal(wlProfSelectProfile(c), "standard");
  });
  it("returns standard for unknown", function() {
    var c = wlProfClassifyCourt("Some Unknown Court");
    assert.equal(wlProfSelectProfile(c), "standard");
  });
  it("returns standard for null classification", function() {
    assert.equal(wlProfSelectProfile(null), "standard");
  });
});

describe("wlProfCourtForCitation omission rules", function() {
  it("SCOTUS + U.S. reporter omits court (Brown 347 U.S. 483)", function() {
    var c = wlProfClassifyCourt("Supreme Court of the United States");
    var result = wlProfCourtForCitation(c, { reporter: "U.S." }, null);
    assert.equal(result.court, "");
    assert.equal(result.reviewReasons.length, 0);
  });

  it("regional reporter P.2d keeps state authority (Sindell 607 P.2d 924 Cal. Supreme)", function() {
    var c = wlProfClassifyCourt("Supreme Court of California.");
    var result = wlProfCourtForCitation(c, { reporter: "P.2d" }, null);
    assert.equal(result.court, "Cal.");
  });

  it("official reporter Cal. 3d omits court (26 Cal. 3d 588)", function() {
    var c = wlProfClassifyCourt("Supreme Court of California.");
    var result = wlProfCourtForCitation(c, { reporter: "Cal. 3d" }, null);
    assert.equal(result.court, "");
  });

  it("N.Y.S.2d keeps App. Div. authority (Miele 770 N.Y.S.2d 386 App. Div.)", function() {
    var c = wlProfClassifyCourt("Supreme Court, Appellate Division, Second Department, New York.");
    var result = wlProfCourtForCitation(c, { reporter: "N.Y.S.2d" }, null);
    assert.equal(result.court, "App. Div.");
  });

  it("service court consistent with bluebook uses service court (Sanchez 5th Cir.)", function() {
    var c = wlProfClassifyCourt("United States Court of Appeals, Fifth Circuit.");
    var result = wlProfCourtForCitation(c, { reporter: "F.3d" }, "5th Cir.");
    assert.equal(result.court, "5th Cir.");
    assert.equal(result.reviewReasons.length, 0);
  });

  it("service court conflicts with bluebook keeps service value + court-conflict", function() {
    var c = wlProfClassifyCourt("United States Court of Appeals, Fifth Circuit.");
    var result = wlProfCourtForCitation(c, { reporter: "F.3d" }, "D.C. Cir.");
    assert.equal(result.court, "D.C. Cir.");
    assert.equal(result.reviewReasons.length, 1);
    assert.equal(result.reviewReasons[0], "court-conflict");
  });

  it("no service court uses bluebook table value", function() {
    var c = wlProfClassifyCourt("United States Court of Appeals, Fifth Circuit.");
    var result = wlProfCourtForCitation(c, { reporter: "F.3d" }, null);
    assert.equal(result.court, "5th Cir.");
  });

  it("no service court and no bluebook returns court-unresolved", function() {
    var c = wlProfClassifyCourt("Some Unknown Court");
    var result = wlProfCourtForCitation(c, { reporter: "F.3d" }, null);
    assert.equal(result.court, "");
    assert.equal(result.reviewReasons.length, 1);
    assert.equal(result.reviewReasons[0], "court-unresolved");
  });
});

describe("wlProfT10 coverage", function() {
  it("includes all 50 states + D.C. + P.R. (52 entries)", function() {
    var keys = Object.keys(wlProfT10);
    assert.equal(keys.length, 52);
  });
  it("includes Alabama", function() { assert.ok(wlProfT10["alabama"]); });
  it("includes Wyoming", function() { assert.ok(wlProfT10["wyoming"]); });
  it("includes District of Columbia", function() { assert.ok(wlProfT10["district of columbia"]); });
  it("includes Puerto Rico", function() { assert.ok(wlProfT10["puerto rico"]); });
});

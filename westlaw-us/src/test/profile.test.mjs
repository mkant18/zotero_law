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

describe("P1 - SCOTUS any reporter omits court", function() {
  it("SCOTUS + S. Ct. reporter omits court", function() {
    var c = wlProfClassifyCourt("Supreme Court of the United States");
    var result = wlProfCourtForCitation(c, { reporter: "S. Ct." }, null);
    assert.equal(result.court, "");
    assert.equal(result.reviewReasons.length, 0);
  });
  it("SCOTUS + L. Ed. reporter omits court", function() {
    var c = wlProfClassifyCourt("Supreme Court of the United States");
    var result = wlProfCourtForCitation(c, { reporter: "L. Ed." }, null);
    assert.equal(result.court, "");
    assert.equal(result.reviewReasons.length, 0);
  });
  it("SCOTUS + L. Ed. 2d reporter omits court", function() {
    var c = wlProfClassifyCourt("Supreme Court of the United States");
    var result = wlProfCourtForCitation(c, { reporter: "L. Ed. 2d" }, null);
    assert.equal(result.court, "");
    assert.equal(result.reviewReasons.length, 0);
  });
});

describe("P2 - new court table rules", function() {
  it("United States District Court, S.D. Texas, Houston Division", function() {
    var r = wlProfClassifyCourt("United States District Court, S.D. Texas, Houston Division.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "district");
    assert.equal(r.district, "S.D. Tex.");
    assert.equal(r.bluebook, "S.D. Tex.");
  });
  it("United States District Court, S.D. New York, Southern Division", function() {
    var r = wlProfClassifyCourt("United States District Court, S.D. New York, Southern Division.");
    assert.equal(r.district, "S.D.N.Y.");
  });
  it("United States Bankruptcy Court, S.D. New York", function() {
    var r = wlProfClassifyCourt("United States Bankruptcy Court, S.D. New York.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "bankruptcy");
    assert.equal(r.bluebook, "Bankr. S.D.N.Y.");
  });
  it("United States Bankruptcy Court, S.D. Texas", function() {
    var r = wlProfClassifyCourt("United States Bankruptcy Court, S.D. Texas.");
    assert.equal(r.bluebook, "Bankr. S.D. Tex.");
  });
  it("Court of Criminal Appeals of Texas", function() {
    var r = wlProfClassifyCourt("Court of Criminal Appeals of Texas.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "supreme");
    assert.equal(r.state, "TX");
    assert.equal(r.bluebook, "Tex. Crim. App.");
  });
  it("Court of Criminal Appeals of Oklahoma", function() {
    var r = wlProfClassifyCourt("Court of Criminal Appeals of Oklahoma.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "supreme");
    assert.equal(r.state, "OK");
    assert.equal(r.bluebook, "Okla. Crim. App.");
  });
  it("Court of Appeals of New York", function() {
    var r = wlProfClassifyCourt("Court of Appeals of New York.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "supreme");
    assert.equal(r.state, "NY");
    assert.equal(r.bluebook, "N.Y.");
  });
  it("Court of Appeals of Maryland", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Maryland.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "supreme");
    assert.equal(r.state, "MD");
    assert.equal(r.bluebook, "Md.");
  });
  it("Supreme Court of Maryland", function() {
    var r = wlProfClassifyCourt("Supreme Court of Maryland.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "supreme");
    assert.equal(r.state, "MD");
    assert.equal(r.bluebook, "Md.");
  });
  it("Appellate Court of Maryland", function() {
    var r = wlProfClassifyCourt("Appellate Court of Maryland.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "MD");
    assert.equal(r.bluebook, "Md. App. Ct.");
  });
  it("Supreme Judicial Court of Massachusetts", function() {
    var r = wlProfClassifyCourt("Supreme Judicial Court of Massachusetts.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "supreme");
    assert.equal(r.state, "MA");
    assert.equal(r.bluebook, "Mass.");
  });
  it("Supreme Judicial Court of Massachusetts, Suffolk County", function() {
    var r = wlProfClassifyCourt("Supreme Judicial Court of Massachusetts, Suffolk County.");
    assert.equal(r.bluebook, "Mass.");
  });
  it("Supreme Judicial Court of Maine", function() {
    var r = wlProfClassifyCourt("Supreme Judicial Court of Maine.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "supreme");
    assert.equal(r.state, "ME");
    assert.equal(r.bluebook, "Me.");
  });
  it("Appeals Court of Massachusetts", function() {
    var r = wlProfClassifyCourt("Appeals Court of Massachusetts.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "MA");
    assert.equal(r.bluebook, "Mass. App. Ct.");
  });
  it("Appeals Court of Massachusetts, Middlesex County", function() {
    var r = wlProfClassifyCourt("Appeals Court of Massachusetts, Middlesex County.");
    assert.equal(r.bluebook, "Mass. App. Ct.");
  });
  it("Court of Appeal, First District, Division 2, California", function() {
    var r = wlProfClassifyCourt("Court of Appeal, First District, Division 2, California.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "CA");
    assert.equal(r.bluebook, "Cal. Ct. App.");
  });
  it("Court of Appeal, Second District, California", function() {
    var r = wlProfClassifyCourt("Court of Appeal, Second District, California.");
    assert.equal(r.bluebook, "Cal. Ct. App.");
  });
  it("Appellate Court of Illinois, 1st District", function() {
    var r = wlProfClassifyCourt("Appellate Court of Illinois, 1st District.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "IL");
    assert.equal(r.bluebook, "Ill. App. Ct.");
  });
  it("Appellate Court of Illinois, 1st District, 2 Division", function() {
    var r = wlProfClassifyCourt("Appellate Court of Illinois, 1st District, 2 Division.");
    assert.equal(r.bluebook, "Ill. App. Ct.");
  });
  it("Court of Appeals of Georgia", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Georgia.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "GA");
    assert.equal(r.bluebook, "Ga. Ct. App.");
  });
  it("Court of Appeals of Michigan", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Michigan.");
    assert.equal(r.bluebook, "Mich. Ct. App.");
  });
  it("Court of Appeals of Ohio", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Ohio, 1st District.");
    assert.equal(r.bluebook, "Ohio Ct. App.");
  });
  it("Court of Appeals of Missouri", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Missouri.");
    assert.equal(r.bluebook, "Mo. Ct. App.");
  });
  it("Court of Appeals of Indiana", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Indiana.");
    assert.equal(r.bluebook, "Ind. Ct. App.");
  });
  it("Court of Appeals of Nebraska", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Nebraska.");
    assert.equal(r.bluebook, "Neb. Ct. App.");
  });
});

describe("P3 - court-unclassified for unknown classification with service court", function() {
  it("unknown classification + service court keeps service court with court-unclassified", function() {
    var c = wlProfClassifyCourt("Some Unknown Court");
    var result = wlProfCourtForCitation(c, { reporter: "F.3d" }, "5th Cir.");
    assert.equal(result.court, "5th Cir.");
    assert.equal(result.reviewReasons.length, 1);
    assert.equal(result.reviewReasons[0], "court-unclassified");
  });
  it("unknown classification + no service court still returns court-unresolved", function() {
    var c = wlProfClassifyCourt("Some Unknown Court");
    var result = wlProfCourtForCitation(c, { reporter: "F.3d" }, null);
    assert.equal(result.court, "");
    assert.equal(result.reviewReasons[0], "court-unresolved");
  });
});

describe("P4 - NY specific rules and generic Supreme Court fix", function() {
  it("Supreme Court of New York, Appellate Division → App. Div.", function() {
    var r = wlProfClassifyCourt("Supreme Court of New York, Appellate Division.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "NY");
    assert.equal(r.bluebook, "App. Div.");
    assert.notEqual(r.bluebook, "N.Y.");
  });
  it("Supreme Court of New York, Appellate Division, Second Department → App. Div.", function() {
    var r = wlProfClassifyCourt("Supreme Court of New York, Appellate Division, Second Department.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "NY");
    assert.equal(r.bluebook, "App. Div.");
  });
  it("Supreme Court, Appellate Division, Second Department, New York → App. Div.", function() {
    var r = wlProfClassifyCourt("Supreme Court, Appellate Division, Second Department, New York.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "NY");
    assert.equal(r.bluebook, "App. Div.");
  });
  it("Supreme Court, Appellate Term, Third Judicial Department, New York → N.Y. App. Term", function() {
    var r = wlProfClassifyCourt("Supreme Court, Appellate Term, Third Judicial Department, New York.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "NY");
    assert.equal(r.bluebook, "N.Y. App. Term");
  });
  it("Supreme Court, Kings County, New York → N.Y. Sup. Ct.", function() {
    var r = wlProfClassifyCourt("Supreme Court, Kings County, New York.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "trial");
    assert.equal(r.state, "NY");
    assert.equal(r.bluebook, "N.Y. Sup. Ct.");
  });
  it("Supreme Court of New York, Kings County → N.Y. Sup. Ct.", function() {
    var r = wlProfClassifyCourt("Supreme Court of New York, Kings County.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "trial");
    assert.equal(r.state, "NY");
    assert.equal(r.bluebook, "N.Y. Sup. Ct.");
  });
  it("generic Supreme Court of <State> does not match lines with Appellate Division", function() {
    var r = wlProfClassifyCourt("Supreme Court of New York, Appellate Division.");
    assert.notEqual(r.level, "supreme");
  });
  it("generic Supreme Court of <State> does not match lines with Appellate Term", function() {
    var r = wlProfClassifyCourt("Supreme Court of Texas, Appellate Term.");
    assert.notEqual(r.level, "supreme");
  });
  it("generic Supreme Court of <State> does not match lines with County", function() {
    var r = wlProfClassifyCourt("Supreme Court of New York, Kings County.");
    assert.notEqual(r.level, "supreme");
  });
});

describe("P5 - 'for the' phrasing support", function() {
  it("United States District Court for the District of Columbia → D.D.C.", function() {
    var r = wlProfClassifyCourt("United States District Court for the District of Columbia.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "district");
    assert.equal(r.district, "D.D.C.");
    assert.equal(r.bluebook, "D.D.C.");
  });
  it("United States District Court for the District of Kansas → D. Kan.", function() {
    var r = wlProfClassifyCourt("United States District Court for the District of Kansas.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "district");
    assert.equal(r.district, "D. Kan.");
    assert.equal(r.bluebook, "D. Kan.");
  });
  it("United States District Court for the Southern District of New York → S.D.N.Y.", function() {
    var r = wlProfClassifyCourt("United States District Court for the Southern District of New York.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "district");
    assert.equal(r.district, "S.D.N.Y.");
    assert.equal(r.bluebook, "S.D.N.Y.");
  });
  it("United States Court of Appeals for the Fifth Circuit → 5th Cir.", function() {
    var r = wlProfClassifyCourt("United States Court of Appeals for the Fifth Circuit.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "appellate");
    assert.equal(r.circuit, "5");
    assert.equal(r.bluebook, "5th Cir.");
  });
  it("United States Court of Appeals for the District of Columbia Circuit → D.C. Cir.", function() {
    var r = wlProfClassifyCourt("United States Court of Appeals for the District of Columbia Circuit.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "appellate");
    assert.equal(r.circuit, "DC");
    assert.equal(r.bluebook, "D.C. Cir.");
  });
  it("United States Bankruptcy Court for the District of Columbia → Bankr. D.D.C.", function() {
    var r = wlProfClassifyCourt("United States Bankruptcy Court for the District of Columbia.");
    assert.equal(r.system, "federal");
    assert.equal(r.level, "bankruptcy");
    assert.equal(r.bluebook, "Bankr. D.D.C.");
  });
  it("United States Bankruptcy Court for the Southern District of New York → Bankr. S.D.N.Y.", function() {
    var r = wlProfClassifyCourt("United States Bankruptcy Court for the Southern District of New York.");
    assert.equal(r.bluebook, "Bankr. S.D.N.Y.");
  });
});

describe("P6 - word-form ordinals for Illinois Appellate Court", function() {
  it("Appellate Court of Illinois, First District, Fourth Division → Ill. App. Ct.", function() {
    var r = wlProfClassifyCourt("Appellate Court of Illinois, First District, Fourth Division.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "IL");
    assert.equal(r.bluebook, "Ill. App. Ct.");
  });
  it("Appellate Court of Illinois, First District → Ill. App. Ct.", function() {
    var r = wlProfClassifyCourt("Appellate Court of Illinois, First District.");
    assert.equal(r.system, "state");
    assert.equal(r.level, "intermediate");
    assert.equal(r.state, "IL");
    assert.equal(r.bluebook, "Ill. App. Ct.");
  });
});

describe("W3 - state court-table backlog", function() {
  var positives = [
    ["Supreme Court of Pennsylvania.", "supreme", "PA", "Pa."],
    ["Supreme Court of Pennsylvania, Eastern District.", "supreme", "PA", "Pa."],
    ["Supreme Court of Pennsylvania, Western District.", "supreme", "PA", "Pa."],
    ["Superior Court of Pennsylvania.", "intermediate", "PA", "Pa. Super. Ct."],
    ["Commonwealth Court of Pennsylvania.", "intermediate", "PA", "Pa. Commw. Ct."],
    ["Supreme Court of Ohio.", "supreme", "OH", "Ohio"],
    ["Court of Appeals of Ohio.", "intermediate", "OH", "Ohio Ct. App."],
    ["Court of Appeals of Ohio, Eighth District.", "intermediate", "OH", "Ohio Ct. App."],
    ["Court of Appeals of Ohio, Eighth District, Cuyahoga County.", "intermediate", "OH", "Ohio Ct. App."],
    ["Court of Appeals of Ohio, 12th District, Butler County.", "intermediate", "OH", "Ohio Ct. App."],
    ["Supreme Court of Florida.", "supreme", "FL", "Fla."],
    ["District Court of Appeal of Florida, Third District.", "intermediate", "FL", "Fla. Dist. Ct. App."],
    ["District Court of Appeal of Florida, 6th District.", "intermediate", "FL", "Fla. Dist. Ct. App."],
    ["District Court of Appeal of Florida.", "intermediate", "FL", "Fla. Dist. Ct. App."],
    ["Court of Appeals of Michigan.", "intermediate", "MI", "Mich. Ct. App."],
    ["Supreme Court of New Jersey.", "supreme", "NJ", "N.J."],
    ["Superior Court of New Jersey, Appellate Division.", "intermediate", "NJ", "N.J. Super. Ct. App. Div."],
    ["Court of Appeals of Georgia.", "intermediate", "GA", "Ga. Ct. App."],
    ["Court of Appeals of North Carolina.", "intermediate", "NC", "N.C. Ct. App."],
    ["Appeals Court of Massachusetts.", "intermediate", "MA", "Mass. App. Ct."],
    ["Court of Appeals of Washington, Division 1.", "intermediate", "WA", "Wash. Ct. App."],
    ["Court of Appeals of Washington, Division Two.", "intermediate", "WA", "Wash. Ct. App."],
    ["Court of Appeals of Arizona, Division 1.", "intermediate", "AZ", "Ariz. Ct. App."],
    ["Court of Appeals of Arizona.", "intermediate", "AZ", "Ariz. Ct. App."],
    ["Court of Appeals of Colorado.", "intermediate", "CO", "Colo. App."],
    ["Court of Appeals of Minnesota.", "intermediate", "MN", "Minn. Ct. App."],
    ["Court of Appeals of Missouri, Eastern District.", "intermediate", "MO", "Mo. Ct. App."],
    ["Court of Appeals of Indiana.", "intermediate", "IN", "Ind. Ct. App."],
    ["Court of Appeals of Tennessee.", "intermediate", "TN", "Tenn. Ct. App."],
    ["Court of Appeals of Tennessee, at Nashville.", "intermediate", "TN", "Tenn. Ct. App."],
    ["Court of Criminal Appeals of Tennessee, at Knoxville.", "intermediate", "TN", "Tenn. Crim. App."],
    ["Court of Criminal Appeals of Tennessee.", "intermediate", "TN", "Tenn. Crim. App."],
    ["Court of Appeal of Louisiana, Fourth Circuit.", "intermediate", "LA", "La. Ct. App."],
    ["Court of Appeals of Virginia.", "intermediate", "VA", "Va. Ct. App."],
    ["Court of Appeals of Wisconsin.", "intermediate", "WI", "Wis. Ct. App."],
    ["Court of Special Appeals of Maryland.", "intermediate", "MD", "Md. Ct. Spec. App."],
    ["Appellate Court of Maryland.", "intermediate", "MD", "Md. App. Ct."],
    ["Appellate Court of Connecticut.", "intermediate", "CT", "Conn. App. Ct."]
  ];
  positives.forEach(function(row) {
    it("classifies " + row[0], function() {
      var r = wlProfClassifyCourt(row[0]);
      assert.equal(r.system, "state");
      assert.equal(r.level, row[1]);
      assert.equal(r.state, row[2]);
      assert.equal(r.bluebook, row[3]);
      assert.equal(r.confidence, "table");
    });
  });

  var unknownLines = [
    // historical / unlisted qualifiers must never fall through to a prefix match
    "Supreme Court of Pennsylvania, Northern District.",
    "Supreme Court of Pennsylvania, Eastern District, Philadelphia County.",
    "Superior Court of Pennsylvania, Eastern District.",
    "Commonwealth Court of Pennsylvania, Harrisburg.",
    "Court of Common Pleas of Pennsylvania.",
    "Court of Appeals of Ohio, Thirteenth District.",
    "Court of Appeals of Ohio, Eighth District, Cuyahoga County, Juvenile Division.",
    "Court of Appeals of Ohio, Eighth Circuit.",
    "Court of Appeals of Ohio, Eighth District, Cuyahoga.",
    "Supreme Court of Ohio, Franklin County Municipal Court.",
    "District Court of Appeal of Florida, Seventh District.",
    "District Court of Appeal of Florida, Third District, Miami-Dade County.",
    "Superior Court of New Jersey, Appellate Division, Somerset County.",
    "Superior Court of New Jersey, Law Division.",
    "Superior Court of New Jersey.",
    "Court of Appeal of Louisiana, Sixth Circuit.",
    "Court of Appeals of Virginia, Richmond.",
    "Court of Special Appeals of Maryland, September Term.",
    "Appellate Court of Connecticut, Judicial District of Hartford.",
    "Court of Appeals of Tennessee, at Memphis.",
    "Court of Criminal Appeals of Tennessee, Eastern Section.",
    "Court of Appeals of Missouri, Northern District.",
    "Court of Appeals of Washington, Division 4.",
    "Court of Appeals of Arizona, Division 3.",
    "Court of Appeals of Washington, Division 1, Seattle."
  ];
  unknownLines.forEach(function(line) {
    it("keeps near-miss unknown: " + line, function() {
      var r = wlProfClassifyCourt(line);
      assert.equal(r.system, "unknown");
      assert.equal(r.bluebook, null);
      assert.equal(r.confidence, "none");
    });
  });

  it("Texas intermediate courts are unchanged (still texas profile)", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Texas, Beaumont.");
    assert.equal(r.state, "TX");
    assert.equal(r.bluebook, "Tex. App.\u2014Beaumont");
    assert.equal(wlProfSelectProfile(r), "texas");
  });
  it("new PA/OH/FL classifications keep the standard profile", function() {
    ["Superior Court of Pennsylvania.", "Court of Appeals of Ohio, Eighth District, Cuyahoga County.",
      "District Court of Appeal of Florida, Third District."].forEach(function(line) {
      assert.equal(wlProfSelectProfile(wlProfClassifyCourt(line)), "standard");
    });
  });

  it("omission policy: regional reporter keeps new state court authority", function() {
    var pa = wlProfClassifyCourt("Commonwealth Court of Pennsylvania.");
    assert.equal(wlProfCourtForCitation(pa, { reporter: "A.3d" }, null).court, "Pa. Commw. Ct.");
    var oh = wlProfClassifyCourt("Court of Appeals of Ohio, Eighth District, Cuyahoga County.");
    var r = wlProfCourtForCitation(oh, { reporter: "N.E.3d" }, null);
    assert.equal(r.court, "Ohio Ct. App.");
    assert.equal(r.reviewReasons.length, 0);
  });
  it("omission policy: classification fills court when no service court; service disagreement flags conflict", function() {
    var fl = wlProfClassifyCourt("District Court of Appeal of Florida, Third District.");
    assert.equal(wlProfCourtForCitation(fl, { reporter: "So. 3d" }, null).court, "Fla. Dist. Ct. App.");
    var conflict = wlProfCourtForCitation(fl, { reporter: "So. 3d" }, "Fla.");
    assert.equal(conflict.court, "Fla.");
    assert.deepEqual(Array.from(conflict.reviewReasons), ["court-conflict"]);
  });
  it("Colorado Court of Appeals uses Bluebook T1 Colo. App., not Colo. Ct. App.", function() {
    var r = wlProfClassifyCourt("Court of Appeals of Colorado.");
    assert.notEqual(r.bluebook, "Colo. Ct. App.");
    assert.equal(r.bluebook, "Colo. App.");
  });
});

describe("W4 - high-court correctness fixes", function() {
  var positives = [
    ["Supreme Court of Oregon.", "supreme", "OR", "Or."],
    ["Court of Appeals of Oregon.", "intermediate", "OR", "Or. Ct. App."],
    ["Court of Appeals of Maryland.", "supreme", "MD", "Md."],
    ["Supreme Court of Maryland.", "supreme", "MD", "Md."],
    ["Court of Special Appeals of Maryland.", "intermediate", "MD", "Md. Ct. Spec. App."],
    ["Appellate Court of Maryland.", "intermediate", "MD", "Md. App. Ct."],
    ["Court of Appeals of New York.", "supreme", "NY", "N.Y."],
    ["Supreme Judicial Court of Massachusetts.", "supreme", "MA", "Mass."],
    ["Supreme Judicial Court of Maine.", "supreme", "ME", "Me."],
    ["Supreme Court of Appeals of West Virginia.", "supreme", "WV", "W. Va."],
    ["District of Columbia Court of Appeals.", "supreme", "DC", "D.C."],
    ["Court of Criminal Appeals of Texas.", "supreme", "TX", "Tex. Crim. App."],
    ["Court of Criminal Appeals of Oklahoma.", "supreme", "OK", "Okla. Crim. App."],
    ["Supreme Court of Texas.", "supreme", "TX", "Tex."]
  ];
  positives.forEach(function(row) {
    it("classifies " + row[0], function() {
      var r = wlProfClassifyCourt(row[0]);
      assert.equal(r.system, "state");
      assert.equal(r.level, row[1]);
      assert.equal(r.state, row[2]);
      assert.equal(r.bluebook, row[3]);
      assert.equal(r.confidence, "table");
    });
  });

  it("Oregon abbreviations never use Ore. (Bluebook T1/T10 is Or.)", function() {
    assert.equal(wlProfT10["oregon"], "Or.");
    ["Supreme Court of Oregon.", "Court of Appeals of Oregon."].forEach(function(line) {
      assert.ok(!/^Ore\./.test(wlProfClassifyCourt(line).bluebook));
    });
  });

  it("generic Court of Appeals row does not swallow New York or Maryland as intermediate", function() {
    assert.notEqual(wlProfClassifyCourt("Court of Appeals of New York.").level, "intermediate");
    assert.notEqual(wlProfClassifyCourt("Court of Appeals of Maryland.").level, "intermediate");
  });

  var unknownLines = [
    "Court of Appeals of New York, Appellate Division.",
    "Court of Appeals of New York, Second Department.",
    "Court of Appeals of Maryland, Baltimore.",
    "Supreme Court of Appeals of West Virginia, Southern District.",
    "Supreme Court of Appeals of Virginia, Richmond.",
    "Supreme Judicial Court of Maine, Sitting as the Law Court.",
    "Supreme Judicial Court of Maine, Cumberland County.",
    "Court of Criminal Appeals of Texas, Austin.",
    "Court of Criminal Appeals of Oklahoma, Tulsa.",
    "Court of Appeals of Oregon, Portland.",
    "District of Columbia Court of Appeals, Civil Division.",
    "Court of Appeals of the District of Columbia."
  ];
  unknownLines.forEach(function(line) {
    it("keeps near-miss unknown: " + line, function() {
      var r = wlProfClassifyCourt(line);
      assert.equal(r.system, "unknown");
      assert.equal(r.bluebook, null);
      assert.equal(r.confidence, "none");
    });
  });

  it("Texas profile selection is unchanged for high courts (standard) and intermediate (texas)", function() {
    assert.equal(wlProfSelectProfile(wlProfClassifyCourt("Court of Criminal Appeals of Texas.")), "standard");
    assert.equal(wlProfSelectProfile(wlProfClassifyCourt("Supreme Court of Texas.")), "standard");
    assert.equal(wlProfSelectProfile(wlProfClassifyCourt("Court of Appeals of Texas, Beaumont.")), "texas");
  });

  it("omission policy: N.Y. Court of Appeals with official N.Y.2d/N.Y.3d omits the court", function() {
    var c = wlProfClassifyCourt("Court of Appeals of New York.");
    assert.equal(wlProfCourtForCitation(c, { reporter: "N.Y.2d" }, null).court, "");
    assert.equal(wlProfCourtForCitation(c, { reporter: "N.Y.3d" }, null).court, "");
  });
  it("omission policy: N.Y. Court of Appeals with N.E. regional reporter keeps N.Y.", function() {
    var c = wlProfClassifyCourt("Court of Appeals of New York.");
    assert.equal(wlProfCourtForCitation(c, { reporter: "N.E.2d" }, null).court, "N.Y.");
    assert.equal(wlProfCourtForCitation(c, { reporter: "N.E.3d" }, null).court, "N.Y.");
  });
  it("omission policy: Maryland Court of Appeals with A.2d keeps Md.", function() {
    var c = wlProfClassifyCourt("Court of Appeals of Maryland.");
    assert.equal(wlProfCourtForCitation(c, { reporter: "A.2d" }, null).court, "Md.");
  });
  it("omission policy: Oregon Supreme Court with P.3d keeps Or.", function() {
    var c = wlProfClassifyCourt("Supreme Court of Oregon.");
    assert.equal(wlProfCourtForCitation(c, { reporter: "P.3d" }, null).court, "Or.");
  });
});

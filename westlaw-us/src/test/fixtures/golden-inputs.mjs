// M1-J golden pipeline inputs — reconcile INPUTS for each golden case.
// DomFacts + synthetic service envelopes shaped like wlSvcReadEnvelope output.
// GUIDs are placeholder I + 32 hex; no tokens.

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
    reviewReasons: []
  };
}

// G1 Sanchez — full success, standard profile, validated-profile
export var G1 = {
  context: {
    guid: "I1234567890abcdef1234567890abcdef",
    url: "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html"
  },
  dom: makeDom({
    guid: "I1234567890abcdef1234567890abcdef",
    headerName: "Sanchez v. Liggett & Myers, Inc.",
    rawCourt: "United States Court of Appeals, Fifth Circuit.",
    date: "1999-08-25",
    citations: [
      { kind: "reporter", volume: "187", reporter: "F.3d", page: "486", raw: "187 F.3d 486" }
    ],
    dockets: ["No. 98-40679"]
  }),
  svcA: makeSvc("ok", makeEnvelope({
    standard: {
      long: "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
      shorts: ["Sanchez, 187 F.3d 486", "187 F.3d 486"],
      id: "standard",
      enhanced: null
    }
  })),
  svcB: makeSvc("ok", makeEnvelope({
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
  })),
  profile: "standard"
};

// G2 Philip Morris — history on, standard profile
export var G2 = {
  context: {
    guid: "I2historyGuid1234567890abcdef1234",
    url: "https://1.next.westlaw.com/Document/I2historyGuid1234567890abcdef1234/View/FullText.html"
  },
  dom: makeDom({
    guid: "I2historyGuid1234567890abcdef1234",
    headerName: "United States v. Philip Morris USA, Inc.",
    rawCourt: "United States District Court for the District of Columbia.",
    date: "2006-06-01",
    citations: [
      { kind: "reporter", volume: "449", reporter: "F. Supp. 2d", page: "1", raw: "449 F. Supp. 2d 1" }
    ],
    dockets: []
  }),
  svcA: makeSvc("ok", makeEnvelope({
    standard: {
      long: "United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)",
      shorts: ["Philip Morris USA, Inc., 449 F. Supp. 2d 1", "449 F. Supp. 2d 1"],
      id: "standard",
      enhanced: null
    }
  })),
  svcB: makeSvc("ok", makeEnvelope({
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
  })),
  profile: "standard"
};

// G3 Brown — synthetic SCOTUS, standard profile, may be unverified-profile
export var G3 = {
  context: {
    guid: "IbrownGuid1234567890abcdef123456",
    url: "https://1.next.westlaw.com/Document/IbrownGuid1234567890abcdef123456/View/FullText.html"
  },
  dom: makeDom({
    guid: "IbrownGuid1234567890abcdef123456",
    headerName: "Brown v. Bd. of Educ.",
    rawCourt: "Supreme Court of the United States",
    date: "1954-05-17",
    citations: [
      { kind: "reporter", volume: "347", reporter: "U.S.", page: "483", raw: "347 U.S. 483" },
      { kind: "reporter", volume: "74", reporter: "S. Ct.", page: "686", raw: "74 S. Ct. 686" }
    ],
    dockets: []
  }),
  svcA: makeSvc("ok", makeEnvelope({
    standard: {
      long: "Brown v. Bd. of Educ., 347 U.S. 483 (1954)",
      shorts: ["Brown v. Bd. of Educ., 347 U.S. 483", "347 U.S. 483"],
      id: "standard",
      enhanced: null
    }
  })),
  svcB: makeSvc("ok", makeEnvelope({
    standard: {
      long: "Brown v. Bd. of Educ., 347 U.S. 483 (1954)",
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
  })),
  profile: "standard"
};

// G4 Miele — standard profile, validated-profile
export var G4 = {
  context: {
    guid: "Iabcdef1234567890abcdef1234567890",
    url: "https://1.next.westlaw.com/Document/Iabcdef1234567890abcdef1234567890/View/FullText.html"
  },
  dom: makeDom({
    guid: "Iabcdef1234567890abcdef1234567890",
    headerName: "Miele v. Am. Tobacco Co.",
    rawCourt: "Supreme Court of New York, Appellate Division.",
    date: "2003-06-15",
    citations: [
      { kind: "reporter", volume: "2", reporter: "A.D.3d", page: "799", raw: "2 A.D.3d 799" },
      { kind: "reporter", volume: "770", reporter: "N.Y.S.2d", page: "386", raw: "770 N.Y.S.2d 386" }
    ],
    dockets: []
  }),
  svcA: makeSvc("ok", makeEnvelope({
    standard: {
      long: "Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)",
      shorts: ["Miele, 770 N.Y.S.2d 386", "770 N.Y.S.2d 386"],
      id: "standard",
      enhanced: null
    }
  })),
  svcB: makeSvc("ok", makeEnvelope({
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
  })),
  profile: "standard"
};

// G5 Rogers — texas profile, validated-profile, with history
export var G5 = {
  context: {
    guid: "IRogersTxGoldenGuid1234567890abcdef",
    url: "https://1.next.westlaw.com/Document/IRogersTxGoldenGuid1234567890abcdef/View/FullText.html"
  },
  dom: makeDom({
    guid: "IRogersTxGoldenGuid1234567890abcdef",
    headerName: "Rogers v. R.J. Reynolds Tobacco Co.",
    rawCourt: "Court of Appeals of Texas, Beaumont.",
    date: "1988-10-06",
    citations: [
      { kind: "reporter", volume: "761", reporter: "S.W.2d", page: "788", raw: "761 S.W.2d 788" }
    ],
    dockets: ["No. 09-87-120 CV"]
  }),
  svcA: makeSvc("ok", makeEnvelope({
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
  })),
  svcB: makeSvc("ok", makeEnvelope({
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
  })),
  profile: "texas"
};

// G7 Example — WL-only synthetic, standard profile, may be unverified-profile
export var G7 = {
  context: {
    guid: "IwlOnlyGuid1234567890abcdef123456",
    url: "https://1.next.westlaw.com/Document/IwlOnlyGuid1234567890abcdef123456/View/FullText.html"
  },
  dom: makeDom({
    guid: "IwlOnlyGuid1234567890abcdef123456",
    headerName: "Example v. Sample",
    rawCourt: "United States District Court for the District of Kansas.",
    date: "2024-03-01",
    citations: [],
    dockets: ["No. 24-123"]
  }),
  svcA: makeSvc("ok", makeEnvelope({
    standard: {
      long: "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)",
      shorts: ["Example, 2024 WL 1234567, at *4", "2024 WL 1234567, at *4"],
      id: "standard",
      enhanced: null
    }
  })),
  svcB: makeSvc("ok", makeEnvelope({
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
  })),
  profile: "standard"
};

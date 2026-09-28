var wlProfT10 = {
  "alabama": "Ala.",
  "alaska": "Alaska",
  "arizona": "Ariz.",
  "arkansas": "Ark.",
  "california": "Cal.",
  "colorado": "Colo.",
  "connecticut": "Conn.",
  "delaware": "Del.",
  "district of columbia": "D.C.",
  "florida": "Fla.",
  "georgia": "Ga.",
  "hawaii": "Hawaii",
  "idaho": "Idaho",
  "illinois": "Ill.",
  "indiana": "Ind.",
  "iowa": "Iowa",
  "kansas": "Kan.",
  "kentucky": "Ky.",
  "louisiana": "La.",
  "maine": "Maine",
  "maryland": "Md.",
  "massachusetts": "Mass.",
  "michigan": "Mich.",
  "minnesota": "Minn.",
  "mississippi": "Miss.",
  "missouri": "Mo.",
  "montana": "Mont.",
  "nebraska": "Neb.",
  "nevada": "Nev.",
  "new hampshire": "N.H.",
  "new jersey": "N.J.",
  "new mexico": "N.M.",
  "new york": "N.Y.",
  "north carolina": "N.C.",
  "north dakota": "N.D.",
  "ohio": "Ohio",
  "oklahoma": "Okla.",
  "oregon": "Ore.",
  "pennsylvania": "Pa.",
  "puerto rico": "P.R.",
  "rhode island": "R.I.",
  "south carolina": "S.C.",
  "south dakota": "S.D.",
  "tennessee": "Tenn.",
  "texas": "Tex.",
  "utah": "Utah",
  "vermont": "Vt.",
  "virginia": "Va.",
  "washington": "Wash.",
  "west virginia": "W. Va.",
  "wisconsin": "Wis.",
  "wyoming": "Wyo."
};

var wlProfStateCodes = {
  "alabama": "AL",
  "alaska": "AK",
  "arizona": "AZ",
  "arkansas": "AR",
  "california": "CA",
  "colorado": "CO",
  "connecticut": "CT",
  "delaware": "DE",
  "district of columbia": "DC",
  "florida": "FL",
  "georgia": "GA",
  "hawaii": "HI",
  "idaho": "ID",
  "illinois": "IL",
  "indiana": "IN",
  "iowa": "IA",
  "kansas": "KS",
  "kentucky": "KY",
  "louisiana": "LA",
  "maine": "ME",
  "maryland": "MD",
  "massachusetts": "MA",
  "michigan": "MI",
  "minnesota": "MN",
  "mississippi": "MS",
  "missouri": "MO",
  "montana": "MT",
  "nebraska": "NE",
  "nevada": "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  "ohio": "OH",
  "oklahoma": "OK",
  "oregon": "OR",
  "pennsylvania": "PA",
  "puerto rico": "PR",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  "tennessee": "TN",
  "texas": "TX",
  "utah": "UT",
  "vermont": "VT",
  "virginia": "VA",
  "washington": "WA",
  "west virginia": "WV",
  "wisconsin": "WI",
  "wyoming": "WY"
};

var wlProfCircuitMap = {
  "1": "1st Cir.",
  "2": "2nd Cir.",
  "3": "3rd Cir.",
  "4": "4th Cir.",
  "5": "5th Cir.",
  "6": "6th Cir.",
  "7": "7th Cir.",
  "8": "8th Cir.",
  "9": "9th Cir.",
  "10": "10th Cir.",
  "11": "11th Cir.",
  "dc": "D.C. Cir.",
  "fed": "Fed. Cir."
};

var wlProfRegionalReporters = {
  "P.": true, "P.2d": true, "P.3d": true,
  "N.E.": true, "N.E.2d": true, "N.E.3d": true,
  "S.E.": true, "S.E.2d": true,
  "S.W.": true, "S.W.2d": true, "S.W.3d": true,
  "A.": true, "A.2d": true, "A.3d": true
};

var wlProfOfficialHighCourtReporters = {
  "Cal.": true, "Cal. 2d": true, "Cal. 3d": true, "Cal. 4th": true, "Cal. 5th": true,
  "N.Y.": true, "N.Y.2d": true, "N.Y.3d": true
};

var wlProfTexasCourts = {
  "houston": "Tex. App.\u2014Houston [1st Dist.]",
  "houston (1st dist.)": "Tex. App.\u2014Houston [1st Dist.]",
  "houston (14th dist.)": "Tex. App.\u2014Houston [14th Dist.]",
  "fort worth": "Tex. App.\u2014Fort Worth",
  "austin": "Tex. App.\u2014Austin",
  "san antonio": "Tex. App.\u2014San Antonio",
  "dallas": "Tex. App.\u2014Dallas",
  "texarkana": "Tex. App.\u2014Texarkana",
  "amarillo": "Tex. App.\u2014Amarillo",
  "el paso": "Tex. App.\u2014El Paso",
  "beaumont": "Tex. App.\u2014Beaumont",
  "waco": "Tex. App.\u2014Waco",
  "eastland": "Tex. App.\u2014Eastland",
  "tyler": "Tex. App.\u2014Tyler",
  "corpus christi\u2013edinburg": "Tex. App.\u2014Corpus Christi\u2013Edinburg"
};

var wlProfDistrictMap = {
  "district of columbia": "D.D.C.",
  "d. kansas": "D. Kan.",
  "district of kansas": "D. Kan.",
  "s.d. new york": "S.D.N.Y.",
  "southern district of new york": "S.D.N.Y.",
  "n.d. cal": "N.D. Cal.",
  "northern district of california": "N.D. Cal.",
  "c.d. cal": "C.D. Cal.",
  "central district of california": "C.D. Cal.",
  "e.d. pa": "E.D. Pa.",
  "eastern district of pennsylvania": "E.D. Pa.",
  "n.d. ill": "N.D. Ill.",
  "northern district of illinois": "N.D. Ill.",
  "s.d. tex": "S.D. Tex.",
  "southern district of texas": "S.D. Tex.",
  "n.d. tex": "N.D. Tex.",
  "northern district of texas": "N.D. Tex."
};

var wlProfCourtTable = [
  {
    re: /^supreme court of the united states$/,
    res: { system: "federal", level: "supreme", state: null, circuit: null, district: null, bluebook: "", confidence: "table" }
  },
  {
    re: /^united states court of appeals, first circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "1", district: null, bluebook: "1st Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, second circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "2", district: null, bluebook: "2nd Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, third circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "3", district: null, bluebook: "3rd Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, fourth circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "4", district: null, bluebook: "4th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, fifth circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "5", district: null, bluebook: "5th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, sixth circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "6", district: null, bluebook: "6th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, seventh circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "7", district: null, bluebook: "7th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, eighth circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "8", district: null, bluebook: "8th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, ninth circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "9", district: null, bluebook: "9th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, tenth circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "10", district: null, bluebook: "10th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, eleventh circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "11", district: null, bluebook: "11th Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, district of columbia circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "DC", district: null, bluebook: "D.C. Cir.", confidence: "table" }
  },
  {
    re: /^united states court of appeals, federal circuit$/,
    res: { system: "federal", level: "appellate", state: null, circuit: "Fed", district: null, bluebook: "Fed. Cir.", confidence: "table" }
  },
  {
    re: /^united states district court, district of columbia$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "D.D.C.", bluebook: "D.D.C.", confidence: "table" }
  },
  {
    re: /^united states district court, d\. kansas$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "D. Kan.", bluebook: "D. Kan.", confidence: "table" }
  },
  {
    re: /^district of kansas$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "D. Kan.", bluebook: "D. Kan.", confidence: "table" }
  },
  {
    re: /^s\.d\. new york$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "S.D.N.Y.", bluebook: "S.D.N.Y.", confidence: "table" }
  },
  {
    re: /^southern district of new york$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "S.D.N.Y.", bluebook: "S.D.N.Y.", confidence: "table" }
  },
  {
    re: /^n\.d\. cal$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "N.D. Cal.", bluebook: "N.D. Cal.", confidence: "table" }
  },
  {
    re: /^northern district of california$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "N.D. Cal.", bluebook: "N.D. Cal.", confidence: "table" }
  },
  {
    re: /^c\.d\. cal$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "C.D. Cal.", bluebook: "C.D. Cal.", confidence: "table" }
  },
  {
    re: /^central district of california$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "C.D. Cal.", bluebook: "C.D. Cal.", confidence: "table" }
  },
  {
    re: /^e\.d\. pa$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "E.D. Pa.", bluebook: "E.D. Pa.", confidence: "table" }
  },
  {
    re: /^eastern district of pennsylvania$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "E.D. Pa.", bluebook: "E.D. Pa.", confidence: "table" }
  },
  {
    re: /^n\.d\. ill$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "N.D. Ill.", bluebook: "N.D. Ill.", confidence: "table" }
  },
  {
    re: /^northern district of illinois$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "N.D. Ill.", bluebook: "N.D. Ill.", confidence: "table" }
  },
  {
    re: /^s\.d\. tex$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "S.D. Tex.", bluebook: "S.D. Tex.", confidence: "table" }
  },
  {
    re: /^southern district of texas$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "S.D. Tex.", bluebook: "S.D. Tex.", confidence: "table" }
  },
  {
    re: /^n\.d\. tex$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "N.D. Tex.", bluebook: "N.D. Tex.", confidence: "table" }
  },
  {
    re: /^northern district of texas$/,
    res: { system: "federal", level: "district", state: null, circuit: null, district: "N.D. Tex.", bluebook: "N.D. Tex.", confidence: "table" }
  },
  {
    re: /^supreme court, appellate division, second department, new york$/,
    res: { system: "state", level: "intermediate", state: "NY", circuit: null, district: null, bluebook: "App. Div.", confidence: "table" }
  },
  {
    re: /^court of appeals of texas, (.+)$/,
    res: function(m) {
      var key = m[1].toLowerCase();
      var bluebook = wlProfTexasCourts[key] || null;
      return { system: "state", level: "intermediate", state: "TX", circuit: null, district: null, bluebook: bluebook, confidence: "table" };
    }
  },
  {
    re: /^supreme court of california$/,
    res: { system: "state", level: "supreme", state: "CA", circuit: null, district: null, bluebook: "Cal.", confidence: "table" }
  },
  {
    re: /^supreme court of (.+)$/,
    res: function(m) {
      var stateName = m[1].toLowerCase();
      var bluebook = wlProfT10[stateName] || null;
      var state = bluebook ? (wlProfStateCodes[stateName] || null) : null;
      return { system: "state", level: "supreme", state: state, circuit: null, district: null, bluebook: bluebook, confidence: "table" };
    }
  }
];

function wlProfProcessCourt(rawCourt) {
  var cleaned = wlTextClean(rawCourt);
  var lowered = cleaned.toLowerCase();
  if (lowered.charAt(lowered.length - 1) === ".") {
    lowered = lowered.slice(0, -1);
  }
  return lowered;
}

function wlProfClassifyCourt(rawCourt) {
  if (rawCourt == null) {
    return { system: "unknown", level: "unknown", state: null, circuit: null, district: null, bluebook: null, confidence: "none" };
  }
  var processed = wlProfProcessCourt(rawCourt);
  for (var i = 0; i < wlProfCourtTable.length; i++) {
    var entry = wlProfCourtTable[i];
    var m = processed.match(entry.re);
    if (m) {
      if (typeof entry.res === "function") {
        return entry.res(m);
      }
      return entry.res;
    }
  }
  return { system: "unknown", level: "unknown", state: null, circuit: null, district: null, bluebook: null, confidence: "none" };
}

function wlProfSelectProfile(classification) {
  if (!classification) return "standard";
  if (classification.system === "state" && classification.state === "TX" && classification.level === "intermediate") {
    return "texas";
  }
  return "standard";
}

function wlProfIsRegionalReporter(reporter) {
  return !!wlProfRegionalReporters[reporter];
}

function wlProfIsOfficialHighCourtReporter(reporter) {
  return !!wlProfOfficialHighCourtReporters[reporter];
}

function wlProfCourtForCitation(classification, primary, serviceCourt) {
  var reviewReasons = [];

  if (classification && classification.system === "federal" && classification.level === "supreme" && primary && primary.reporter === "U.S.") {
    return { court: "", reviewReasons: reviewReasons };
  }

  if (primary && wlProfIsRegionalReporter(primary.reporter)) {
    return { court: classification ? classification.bluebook || "" : "", reviewReasons: reviewReasons };
  }

  if (primary && wlProfIsOfficialHighCourtReporter(primary.reporter)) {
    return { court: "", reviewReasons: reviewReasons };
  }

  if (serviceCourt) {
    var serviceKey = wlTextCompareKey(serviceCourt);
    var bluebookKey = classification ? wlTextCompareKey(classification.bluebook || "") : "";
    if (serviceKey === bluebookKey) {
      return { court: serviceCourt, reviewReasons: reviewReasons };
    } else if (classification && classification.bluebook) {
      reviewReasons.push("court-conflict");
      return { court: serviceCourt, reviewReasons: reviewReasons };
    } else {
      return { court: serviceCourt, reviewReasons: reviewReasons };
    }
  }

  if (classification && classification.bluebook) {
    return { court: classification.bluebook, reviewReasons: reviewReasons };
  }

  reviewReasons.push("court-unresolved");
  return { court: "", reviewReasons: reviewReasons };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlProfClassifyCourt: wlProfClassifyCourt,
    wlProfSelectProfile: wlProfSelectProfile,
    wlProfCourtForCitation: wlProfCourtForCitation,
    wlProfCourtTable: wlProfCourtTable,
    wlProfT10: wlProfT10
  };
}

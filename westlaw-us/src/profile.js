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
  "oregon": "Or.",
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

var wlProfCircuitForTheMap = {
  "first circuit": "1",
  "second circuit": "2",
  "third circuit": "3",
  "fourth circuit": "4",
  "fifth circuit": "5",
  "sixth circuit": "6",
  "seventh circuit": "7",
  "eighth circuit": "8",
  "ninth circuit": "9",
  "tenth circuit": "10",
  "eleventh circuit": "11",
  "district of columbia circuit": "DC",
  "federal circuit": "Fed"
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
  "DC": "D.C. Cir.",
  "Fed": "Fed. Cir.",
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

var wlProfIntermediateAppellateMap = {
  "georgia": "Ga. Ct. App.",
  "michigan": "Mich. Ct. App.",
  "ohio": "Ohio Ct. App.",
  "arizona": "Ariz. Ct. App.",
  "colorado": "Colo. App.",
  "iowa": "Iowa Ct. App.",
  "kansas": "Kan. Ct. App.",
  // Open question: the Court of Appeals of Kentucky was the state's highest court before 1976; classification
  // has no decision date, so this line is always mapped as intermediate (Ky. Ct. App.).
  "kentucky": "Ky. Ct. App.",
  "minnesota": "Minn. Ct. App.",
  "north carolina": "N.C. Ct. App.",
  "new mexico": "N.M. Ct. App.",
  "oregon": "Or. Ct. App.",
  "south carolina": "S.C. Ct. App.",
  "tennessee": "Tenn. Ct. App.",
  "utah": "Utah Ct. App.",
  "washington": "Wash. Ct. App.",
  "wisconsin": "Wis. Ct. App.",
  "missouri": "Mo. Ct. App.",
  "indiana": "Ind. Ct. App.",
  "nebraska": "Neb. Ct. App."
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
  "northern district of texas": "N.D. Tex.",
  "s.d. texas": "S.D. Tex.",
  "s.d. california": "S.D. Cal.",
  "s.d. illinois": "S.D. Ill.",
  "s.d. new jersey": "S.D.N.J.",
  "s.d. florida": "S.D. Fla.",
  "s.d. ohio": "S.D. Ohio",
  "s.d. pennsylvania": "S.D. Pa.",
  "s.d. virginia": "S.D. Va.",
  "n.d. california": "N.D. Cal.",
  "n.d. texas": "N.D. Tex.",
  "n.d. illinois": "N.D. Ill.",
  "n.d. new york": "N.D.N.Y.",
  "c.d. texas": "C.D. Tex.",
  "c.d. california": "C.D. Cal.",
  "e.d. texas": "E.D. Tex.",
  "e.d. california": "E.D. Cal.",
  "e.d. new york": "E.D.N.Y.",
  "w.d. texas": "W.D. Tex.",
  "w.d. oklahoma": "W.D. Okla.",
  "d. massachusetts": "D. Mass.",
  "d. maryland": "D. Md.",
  "d. connecticut": "D. Conn."
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
    re: /^united states court of appeals for the (.+)$/,
    res: function(m) {
      var circuitKey = m[1].toLowerCase();
      var circuitNum = wlProfCircuitForTheMap[circuitKey] || null;
      var bluebook = circuitNum ? (wlProfCircuitMap[circuitNum] || null) : null;
      return { system: "federal", level: "appellate", state: null, circuit: circuitNum, district: null, bluebook: bluebook, confidence: bluebook ? "table" : "none" };
    }
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
    re: /^united states district court for the (.+)$/,
    res: function(m) {
      var districtText = m[1].toLowerCase();
      var district = wlProfDistrictMap[districtText] || null;
      return { system: "federal", level: "district", state: null, circuit: null, district: district, bluebook: district, confidence: district ? "table" : "none" };
    }
  },
  {
    re: /^united states district court, (.+)$/,
    res: function(m) {
      var districtText = m[1].toLowerCase();
      var district = wlProfDistrictMap[districtText] || null;
      return { system: "federal", level: "district", state: null, circuit: null, district: district, bluebook: district, confidence: district ? "table" : "none" };
    }
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
    re: /^supreme court of new york, appellate division(?:,\s*(?:\d+(?:st|nd|rd|th)?|[a-z]+)\s+department)?$/,
    res: { system: "state", level: "intermediate", state: "NY", circuit: null, district: null, bluebook: "App. Div.", confidence: "table" }
  },
  {
    re: /^supreme court, appellate division, (?:\d+(?:st|nd|rd|th)?|[a-z]+)\s+department, new york$/,
    res: { system: "state", level: "intermediate", state: "NY", circuit: null, district: null, bluebook: "App. Div.", confidence: "table" }
  },
  {
    re: /^supreme court, appellate term(?:,\s*(?:\d+(?:st|nd|rd|th)?|[a-z]+)(?:\s+\w+)*\s+department)?(?:,\s*new york)?$/,
    res: { system: "state", level: "intermediate", state: "NY", circuit: null, district: null, bluebook: "N.Y. App. Term", confidence: "table" }
  },
  {
    re: /^supreme court, [a-z ]+ county, new york$/,
    res: { system: "state", level: "trial", state: "NY", circuit: null, district: null, bluebook: "N.Y. Sup. Ct.", confidence: "table" }
  },
  {
    re: /^supreme court of new york, [a-z ]+ county$/,
    res: { system: "state", level: "trial", state: "NY", circuit: null, district: null, bluebook: "N.Y. Sup. Ct.", confidence: "table" }
  },
  {
    re: /^supreme court of ([a-z]+(?:\s+[a-z]+)?)(?:,\s*[a-z ]+ county)?$/,
    res: function(m) {
      var stateName = m[1].toLowerCase();
      var bluebook = wlProfT10[stateName] || null;
      var state = bluebook ? (wlProfStateCodes[stateName] || null) : null;
      return { system: "state", level: "supreme", state: state, circuit: null, district: null, bluebook: bluebook, confidence: "table" };
    }
  },
  {
    re: /^supreme court of maryland$/,
    res: { system: "state", level: "supreme", state: "MD", circuit: null, district: null, bluebook: "Md.", confidence: "table" }
  },
  {
    // Maryland's highest court until the December 2022 rename to the Supreme Court of Maryland.
    re: /^court of appeals of maryland$/,
    res: { system: "state", level: "supreme", state: "MD", circuit: null, district: null, bluebook: "Md.", confidence: "table" }
  },
  {
    re: /^appellate court of maryland$/,
    res: { system: "state", level: "intermediate", state: "MD", circuit: null, district: null, bluebook: "Md. App. Ct.", confidence: "table" }
  },
  {
    re: /^court of appeals of new york$/,
    res: { system: "state", level: "supreme", state: "NY", circuit: null, district: null, bluebook: "N.Y.", confidence: "table" }
  },
  {
    re: /^supreme court of appeals of west virginia$/,
    res: { system: "state", level: "supreme", state: "WV", circuit: null, district: null, bluebook: "W. Va.", confidence: "table" }
  },
  {
    re: /^district of columbia court of appeals$/,
    res: { system: "state", level: "supreme", state: "DC", circuit: null, district: null, bluebook: "D.C.", confidence: "table" }
  },
  {
    re: /^court of criminal appeals of texas$/,
    res: { system: "state", level: "supreme", state: "TX", circuit: null, district: null, bluebook: "Tex. Crim. App.", confidence: "table" }
  },
  {
    re: /^court of criminal appeals of oklahoma$/,
    res: { system: "state", level: "supreme", state: "OK", circuit: null, district: null, bluebook: "Okla. Crim. App.", confidence: "table" }
  },
  {
    re: /^supreme judicial court of massachusetts(?:,\s*.+)?$/,
    res: { system: "state", level: "supreme", state: "MA", circuit: null, district: null, bluebook: "Mass.", confidence: "table" }
  },
  {
    re: /^supreme judicial court of maine$/,
    res: { system: "state", level: "supreme", state: "ME", circuit: null, district: null, bluebook: "Me.", confidence: "table" }
  },
  {
    re: /^appeals court of massachusetts(?:,\s*.+)?$/,
    res: { system: "state", level: "intermediate", state: "MA", circuit: null, district: null, bluebook: "Mass. App. Ct.", confidence: "table" }
  },
  {
    re: /^court of appeal, .+?\s+district(?:,\s*division\s+\d+)?,\s*california$/,
    res: { system: "state", level: "intermediate", state: "CA", circuit: null, district: null, bluebook: "Cal. Ct. App.", confidence: "table" }
  },
  {
    re: /^appellate court of illinois, (?:\d+(?:st|nd|rd|th)?|[a-z]+)\s+district(?:,\s*(?:\d+(?:st|nd|rd|th)?|[a-z]+)\s+division)?$/,
    res: { system: "state", level: "intermediate", state: "IL", circuit: null, district: null, bluebook: "Ill. App. Ct.", confidence: "table" }
  },
  {
    re: /^court of appeals of (georgia|michigan|ohio|arizona|colorado|iowa|kansas|kentucky|minnesota|north carolina|new mexico|oregon|south carolina|tennessee|utah|washington|wisconsin|missouri|indiana|nebraska)(?:,\s*\d+(?:st|nd|rd|th)?\s+district)?$/,
    res: function(m) {
      var stateName = m[1].toLowerCase();
      var bluebook = wlProfIntermediateAppellateMap[stateName] || null;
      var state = bluebook ? (wlProfStateCodes[stateName] || null) : null;
      return { system: "state", level: "intermediate", state: state, circuit: null, district: null, bluebook: bluebook, confidence: "table" };
    }
  },
  // State court lines added for the court-table backlog. Every pattern is full-match; a trailing
  // district/division/county qualifier is accepted only where written out in that pattern. The qualifier
  // is not carried into the abbreviation (same convention as Ill. App. Ct. and Cal. Ct. App.).
  {
    re: /^supreme court of pennsylvania(?:,\s*(?:eastern|middle|western)\s+district)?$/,
    res: { system: "state", level: "supreme", state: "PA", circuit: null, district: null, bluebook: "Pa.", confidence: "table" }
  },
  {
    re: /^superior court of pennsylvania$/,
    res: { system: "state", level: "intermediate", state: "PA", circuit: null, district: null, bluebook: "Pa. Super. Ct.", confidence: "table" }
  },
  {
    re: /^commonwealth court of pennsylvania$/,
    res: { system: "state", level: "intermediate", state: "PA", circuit: null, district: null, bluebook: "Pa. Commw. Ct.", confidence: "table" }
  },
  {
    re: /^court of appeals of ohio(?:,\s*(?:1st|2nd|3rd|[4-9]th|1[0-2]th|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+district(?:,\s*[a-z]+(?:\s+[a-z]+)?\s+county)?)?$/,
    res: { system: "state", level: "intermediate", state: "OH", circuit: null, district: null, bluebook: "Ohio Ct. App.", confidence: "table" }
  },
  {
    re: /^district court of appeal of florida(?:,\s*(?:1st|2nd|3rd|[4-6]th|first|second|third|fourth|fifth|sixth)\s+district)?$/,
    res: { system: "state", level: "intermediate", state: "FL", circuit: null, district: null, bluebook: "Fla. Dist. Ct. App.", confidence: "table" }
  },
  {
    re: /^superior court of new jersey, appellate division$/,
    res: { system: "state", level: "intermediate", state: "NJ", circuit: null, district: null, bluebook: "N.J. Super. Ct. App. Div.", confidence: "table" }
  },
  {
    re: /^court of appeal of louisiana(?:,\s*(?:1st|2nd|3rd|[4-5]th|first|second|third|fourth|fifth)\s+circuit)?$/,
    res: { system: "state", level: "intermediate", state: "LA", circuit: null, district: null, bluebook: "La. Ct. App.", confidence: "table" }
  },
  {
    re: /^court of appeals of virginia$/,
    res: { system: "state", level: "intermediate", state: "VA", circuit: null, district: null, bluebook: "Va. Ct. App.", confidence: "table" }
  },
  {
    re: /^court of special appeals of maryland$/,
    res: { system: "state", level: "intermediate", state: "MD", circuit: null, district: null, bluebook: "Md. Ct. Spec. App.", confidence: "table" }
  },
  {
    re: /^appellate court of connecticut$/,
    res: { system: "state", level: "intermediate", state: "CT", circuit: null, district: null, bluebook: "Conn. App. Ct.", confidence: "table" }
  },
  {
    re: /^court of appeals of tennessee(?:,\s*at\s+(?:nashville|knoxville|jackson))?$/,
    res: { system: "state", level: "intermediate", state: "TN", circuit: null, district: null, bluebook: "Tenn. Ct. App.", confidence: "table" }
  },
  {
    re: /^court of criminal appeals of tennessee(?:,\s*at\s+(?:nashville|knoxville|jackson))?$/,
    res: { system: "state", level: "intermediate", state: "TN", circuit: null, district: null, bluebook: "Tenn. Crim. App.", confidence: "table" }
  },
  {
    re: /^court of appeals of missouri,\s*(?:eastern|western|southern)\s+district$/,
    res: { system: "state", level: "intermediate", state: "MO", circuit: null, district: null, bluebook: "Mo. Ct. App.", confidence: "table" }
  },
  {
    re: /^court of appeals of washington,\s*division\s+(?:1|2|3|one|two|three)$/,
    res: { system: "state", level: "intermediate", state: "WA", circuit: null, district: null, bluebook: "Wash. Ct. App.", confidence: "table" }
  },
  {
    re: /^court of appeals of arizona,\s*division\s+(?:1|2|one|two)$/,
    res: { system: "state", level: "intermediate", state: "AZ", circuit: null, district: null, bluebook: "Ariz. Ct. App.", confidence: "table" }
  },
  {
    re: /^united states bankruptcy court for the (.+)$/,
    res: function(m) {
      var districtText = m[1].toLowerCase();
      var district = wlProfDistrictMap[districtText] || null;
      var bluebook = district ? "Bankr. " + district : null;
      return { system: "federal", level: "bankruptcy", state: null, circuit: null, district: district, bluebook: bluebook, confidence: district ? "table" : "none" };
    }
  },
  {
    re: /^united states bankruptcy court, (.+)$/,
    res: function(m) {
      var districtText = m[1].toLowerCase();
      var district = wlProfDistrictMap[districtText] || null;
      var bluebook = district ? "Bankr. " + district : null;
      return { system: "federal", level: "bankruptcy", state: null, circuit: null, district: district, bluebook: bluebook, confidence: "table" };
    }
  }
];

function wlProfProcessCourt(rawCourt) {
  var cleaned = wlTextClean(rawCourt);
  var lowered = cleaned.toLowerCase();
  if (lowered.charAt(lowered.length - 1) === ".") {
    lowered = lowered.slice(0, -1);
  }
  // strip ", <Name> Division" suffix only from district/bankruptcy court names
  if (/^united states (district|bankruptcy) court/.test(lowered)) {
    lowered = lowered.replace(/,\s*[^,\s]+(?:\s+[^,\s]+)*\s+division\.?$/, "");
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

  if (classification && classification.system === "federal" && classification.level === "supreme") {
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
    } else if (classification && classification.confidence === "none") {
      reviewReasons.push("court-unclassified");
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

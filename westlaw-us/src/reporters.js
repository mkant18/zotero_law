var wlRepRegistry = [
  { abbr: "U.S.", aliases: [], family: "U.S.", kind: "reporter", seriesIds: [], impliesCourt: "U.S." },
  { abbr: "S. Ct.", aliases: ["S.Ct."], family: "S. Ct.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "L. Ed.", aliases: ["L.Ed."], family: "L. Ed.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "L. Ed. 2d", aliases: ["L.Ed.2d"], family: "L. Ed.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "F.", aliases: [], family: "F.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "F.2d", aliases: ["F.2d"], family: "F.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "F.3d", aliases: ["F.3d"], family: "F.", kind: "reporter", seriesIds: [506], impliesCourt: null },
  { abbr: "F.4th", aliases: ["F.4th"], family: "F.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "F. Supp.", aliases: ["F.Supp."], family: "F.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "F. Supp. 2d", aliases: ["F.Supp.2d"], family: "F.", kind: "reporter", seriesIds: [4637], impliesCourt: null },
  { abbr: "F. Supp. 3d", aliases: ["F.Supp.3d"], family: "F.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "F. App'x", aliases: ["F.App'x", "Fed.Appx."], family: "F.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "U.S. App. D.C.", aliases: ["U.S.App.D.C."], family: "U.S. App. D.C.", kind: "reporter", seriesIds: [781], impliesCourt: "U.S." },
  { abbr: "A.", aliases: [], family: "A.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "A.2d", aliases: ["A.2d"], family: "A.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "A.3d", aliases: ["A.3d"], family: "A.", kind: "reporter", seriesIds: [7049], impliesCourt: null },
  { abbr: "P.", aliases: [], family: "P.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "P.2d", aliases: ["P.2d"], family: "P.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "P.3d", aliases: ["P.3d"], family: "P.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.E.", aliases: [], family: "N.E.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.E.2d", aliases: ["N.E.2d"], family: "N.E.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.E.3d", aliases: ["N.E.3d"], family: "N.E.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.W.", aliases: [], family: "N.W.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.W.2d", aliases: ["N.W.2d"], family: "N.W.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "S.E.", aliases: [], family: "S.E.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "S.E.2d", aliases: ["S.E.2d"], family: "S.E.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "S.W.", aliases: [], family: "S.W.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "S.W.2d", aliases: ["S.W.2d"], family: "S.W.", kind: "reporter", seriesIds: [713], impliesCourt: null },
  { abbr: "S.W.3d", aliases: ["S.W.3d"], family: "S.W.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "So.", aliases: [], family: "So.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "So. 2d", aliases: ["So.2d"], family: "So.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "So. 3d", aliases: ["So.3d"], family: "So.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.Y.S.", aliases: [], family: "N.Y.S.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.Y.S.2d", aliases: ["N.Y.S.2d"], family: "N.Y.S.", kind: "reporter", seriesIds: [4603], impliesCourt: null },
  { abbr: "N.Y.S.3d", aliases: ["N.Y.S.3d"], family: "N.Y.S.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "A.D.", aliases: [], family: "A.D.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "A.D.2d", aliases: ["A.D.2d"], family: "A.D.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "A.D.3d", aliases: ["A.D.3d"], family: "A.D.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.Y.", aliases: [], family: "N.Y.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.Y.2d", aliases: ["N.Y.2d"], family: "N.Y.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "N.Y.3d", aliases: ["N.Y.3d"], family: "N.Y.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal.", aliases: [], family: "Cal.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal. 2d", aliases: ["Cal.2d"], family: "Cal.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal. 3d", aliases: ["Cal.3d"], family: "Cal.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal. 4th", aliases: ["Cal.4th"], family: "Cal.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal. 5th", aliases: ["Cal.5th"], family: "Cal.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal. Rptr.", aliases: ["Cal.Rptr."], family: "Cal. Rptr.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal. Rptr. 2d", aliases: ["Cal.Rptr.2d"], family: "Cal. Rptr.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "Cal. Rptr. 3d", aliases: ["Cal.Rptr.3d"], family: "Cal. Rptr.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "B.R.", aliases: [], family: "B.R.", kind: "reporter", seriesIds: [], impliesCourt: null },
  { abbr: "WL", aliases: [], family: "WL", kind: "wl", seriesIds: [], impliesCourt: null }
];

var wlRepNormMap = {};
(function() {
  for (var i = 0; i < wlRepRegistry.length; i++) {
    var entry = wlRepRegistry[i];
    wlRepNormMap[entry.abbr.replace(/\s/g, "")] = entry;
    for (var j = 0; j < entry.aliases.length; j++) {
      wlRepNormMap[entry.aliases[j].replace(/\s/g, "")] = entry;
    }
  }
})();

var wlRepAliasList = [];
(function() {
  for (var i = 0; i < wlRepRegistry.length; i++) {
    var entry = wlRepRegistry[i];
    if (entry.kind === "wl") continue;
    wlRepAliasList.push({ alias: entry.abbr, entry: entry });
    for (var j = 0; j < entry.aliases.length; j++) {
      wlRepAliasList.push({ alias: entry.aliases[j], entry: entry });
    }
  }
  wlRepAliasList.sort(function(a, b) { return b.alias.length - a.alias.length; });
})();

var wlRepCombinedParts = [];
for (var k = 0; k < wlRepAliasList.length; k++) {
  wlRepCombinedParts.push(wlRepAliasList[k].alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*"));
}
var wlRepCombinedRe = new RegExp("(" + wlRepCombinedParts.join("|") + ")");

function wlRepNorm(text) {
  return text.replace(/\s/g, "");
}

function wlRepLookup(text) {
  if (text == null) return null;
  return wlRepNormMap[wlRepNorm(text)] || null;
}

function wlRepCanonical(text) {
  var entry = wlRepLookup(text);
  return entry ? entry.abbr : null;
}

function wlRepFindCitations(text) {
  if (text == null) return [];
  var results = [];

  // Find reporter citations
  var reCopy = new RegExp(wlRepCombinedRe.source, "g");
  var match;
  while ((match = reCopy.exec(text)) !== null) {
    var matchStart = match.index;
    var matchEnd = matchStart + match[0].length;
    var matchedText = match[0];

    // Check boundaries: not part of a larger word
    var charBefore = matchStart > 0 ? text.charAt(matchStart - 1) : " ";
    var charAfter = matchEnd < text.length ? text.charAt(matchEnd) : " ";
    if (/[a-zA-Z0-9]/.test(charBefore) || /[a-zA-Z0-9]/.test(charAfter)) {
      continue;
    }

    var norm = wlRepNorm(matchedText);
    var entry = wlRepNormMap[norm];
    if (!entry) continue;

    // Look backward for volume
    var beforeText = text.substring(0, matchStart);
    var volumeMatch = beforeText.match(/(\d+)\s*$/);
    if (!volumeMatch) continue;
    var volume = volumeMatch[1];
    var volumeStart = volumeMatch.index;
    // Volume must not be preceded by a letter or digit
    if (volumeStart > 0 && /[a-zA-Z0-9]/.test(text.charAt(volumeStart - 1))) {
      continue;
    }

    // Look forward for page
    var afterText = text.substring(matchEnd);
    var pageMatch = afterText.match(/^\s*(\d+(?:-\d+)?)\b/);
    if (!pageMatch) continue;
    var page = pageMatch[1];
    var pageEnd = matchEnd + pageMatch.index + pageMatch[0].length;

    results.push({
      kind: entry.kind === "wl" ? "wl" : "reporter",
      volume: volume,
      reporter: entry.abbr,
      page: page,
      raw: volume + " " + entry.abbr + " " + page,
      index: volumeStart,
      length: pageEnd - volumeStart
    });
  }

  // Find WL citations: YYYY WL NNNNNNN
  var wlRe = /\b(\d{4})\s+WL\s+(\d+)\b/g;
  var wlMatch;
  while ((wlMatch = wlRe.exec(text)) !== null) {
    var year = wlMatch[1];
    var digits = wlMatch[2];
    var wlStart = wlMatch.index;
    var wlEnd = wlStart + wlMatch[0].length;

    results.push({
      kind: "wl",
      volume: year,
      reporter: "WL",
      page: digits,
      raw: year + " WL " + digits,
      index: wlStart,
      length: wlEnd - wlStart
    });
  }

  // Sort by index
  results.sort(function(a, b) { return a.index - b.index; });

  return results;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlRepRegistry: wlRepRegistry,
    wlRepLookup: wlRepLookup,
    wlRepCanonical: wlRepCanonical,
    wlRepFindCitations: wlRepFindCitations
  };
}

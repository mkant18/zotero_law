{
	"translatorID": "9abca805-707d-4064-958f-e08ac37f0862",
	"label": "Westlaw Advantage US (local)",
	"creator": "local",
	"target": "^https://1\\.next\\.westlaw\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-11 20:00:00"
}

/*
  ***** BEGIN LICENSE BLOCK *****

  Copyright © 2026 local

  This file is part of Zotero.

  Zotero is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Zotero is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with Zotero. If not, see <http://www.gnu.org/licenses/>.

  ***** END LICENSE BLOCK *****
*/
/* ---- text.js ---- */
var wlTextWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
var wlTextNbspRe = /[\u00A0\u202F]/g;
var wlTextSpaceCollapseRe = /\s+/g;
var wlTextDashRangeRe = /[\u2010-\u2015\u2212]/g;
var wlTextRightSingleQuoteRe = /\u2019/g;
var wlTextPeriodSpaceRe = /\s*\.\s*/g;

var wlTextMonthNames = [
  { name: "january", abbr: "jan", num: "01" },
  { name: "february", abbr: "feb", num: "02" },
  { name: "march", abbr: "mar", num: "03" },
  { name: "april", abbr: "apr", num: "04" },
  { name: "may", abbr: "may", num: "05" },
  { name: "june", abbr: "jun", num: "06" },
  { name: "july", abbr: "jul", num: "07" },
  { name: "august", abbr: "aug", num: "08" },
  { name: "september", abbr: "sep", short: "sept", num: "09" },
  { name: "october", abbr: "oct", num: "10" },
  { name: "november", abbr: "nov", num: "11" },
  { name: "december", abbr: "dec", num: "12" }
];

function wlTextClean(s) {
  if (s == null) return "";
  return s
    .replace(wlTextWatermarkRe, "")
    .replace(wlTextNbspRe, " ")
    .replace(wlTextSpaceCollapseRe, " ")
    .trim()
    .normalize("NFC");
}

function wlTextNormalizeDashes(s) {
  if (s == null) return "";
  return s.replace(wlTextDashRangeRe, "-");
}

function wlTextCompareKey(s) {
  var cleaned = wlTextClean(s);
  var normalized = wlTextNormalizeDashes(cleaned);
  var deapostrophized = normalized.replace(wlTextRightSingleQuoteRe, "'");
  var lowered = deapostrophized.toLowerCase();
  return lowered.replace(wlTextPeriodSpaceRe, ".");
}

function wlTextParseUSDate(s) {
  if (s == null) return null;
  var trimmed = s.trim();

  // Year-only
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Try full month name or abbreviated month with optional period
  var monthRe = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan\.?|feb\.?|mar\.?|apr\.?|jun\.?|jul\.?|aug\.?|sep\.?|sept\.?|oct\.?|nov\.?|dec\.?)\.?\s+(\d{1,2}),?\s+(\d{4})$/i;
  var m = trimmed.match(monthRe);
  if (m) {
    var monthStr = m[1].toLowerCase().replace(/\./g, "");
    var day = parseInt(m[2], 10);
    var year = m[3];

    var monthInfo = null;
    for (var i = 0; i < wlTextMonthNames.length; i++) {
      if (wlTextMonthNames[i].name === monthStr || wlTextMonthNames[i].abbr === monthStr || wlTextMonthNames[i].short === monthStr) {
        monthInfo = wlTextMonthNames[i];
        break;
      }
    }
    if (!monthInfo) return null;

    var monthNum = parseInt(monthInfo.num, 10);
    var maxDay = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // Check leap year for Feb
    var yearNum = parseInt(year, 10);
    if (monthNum === 2 && yearNum % 4 === 0 && (yearNum % 100 !== 0 || yearNum % 400 === 0)) {
      maxDay[2] = 29;
    }
    if (day < 1 || day > maxDay[monthNum]) return null;

    return year + "-" + monthInfo.num + "-" + String(day).padStart(2, "0");
  }

  return null;
}

/* ---- reporters.js ---- */
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

/* ---- cite-parse.js ---- */
var wlCiteMonthRe = /^(.*?)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan\.?|feb\.?|mar\.?|apr\.?|jun\.?|jul\.?|aug\.?|sep\.?|sept\.?|oct\.?|nov\.?|dec\.?)\.?\s+(\d{1,2}),?\s+(\d{4})$/i;

var wlCiteDocketStartRe = /^(No\.|Nos\.)\s/i;

function wlCiteFindMatchingParen(text, openPos) {
  var depth = 1;
  for (var i = openPos + 1; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function wlCiteParseParentheticalStandard(content) {
  // Try full date form: <court> <Mon.> <D>, <YYYY>
  var dm = content.match(wlCiteMonthRe);
  if (dm) {
    var dateStr = wlTextParseUSDate(dm[2] + ' ' + dm[3] + ', ' + dm[4]);
    return { court: dm[1].trim().replace(/,$/, ''), year: dm[4], date: dateStr, dateText: content.substring(dm[1].length).trim(), dateSeparator: /,$/.test(dm[1].trim()) ? ', ' : ' ', parentheticalSuffix: '' };
  }

  // Try Texas form: <court> <year>, <status>
  var tm = content.match(/^(.*?)\s+(\d{4}),\s+(.+)$/);
  if (tm) {
    return { court: tm[1].trim(), year: tm[2], date: null, dateText: null, parentheticalSuffix: tm[3].trim() };
  }

  // Try standard form: <court> <year>
  var sm = content.match(/^(.*?)\s+(\d{4})$/);
  if (sm) {
    return { court: sm[1].trim(), year: sm[2], date: null, dateText: null, parentheticalSuffix: '' };
  }

  // Year only
  var ym = content.match(/^(\d{4})$/);
  if (ym) {
    return { court: '', year: ym[1], date: null, dateText: null, parentheticalSuffix: '' };
  }

  return { court: '', year: '', date: null, dateText: null, parentheticalSuffix: '' };
}

function wlCiteParseParentheticalTexas(content) {
  // Texas form: <court> <year>[, <status>]
  var tm = content.match(/^(.*?)\s+(\d{4}),\s*(.*)$/);
  if (tm) {
    return { court: tm[1].trim(), year: tm[2], date: null, dateText: null, parentheticalSuffix: tm[3].trim() };
  }
  // Year only
  var ym = content.match(/^(\d{4})$/);
  if (ym) {
    return { court: '', year: ym[1], date: null, dateText: null, parentheticalSuffix: '' };
  }
  return { court: '', year: '', date: null, dateText: null, parentheticalSuffix: '' };
}

function wlCiteFindDecisionParen(text, start) {
  var open = text.indexOf('(', start);
  while (open !== -1) {
    var close = wlCiteFindMatchingParen(text, open);
    if (close === -1) return open;
    if (wlCiteParseParentheticalStandard(text.substring(open + 1, close)).year) return open;
    open = text.indexOf('(', close + 1);
  }
  return -1;
}

// Peel trailing docket segments ("No. 24-123", or "Nos. 1-2, 3-4" as ["Nos. 1-2", "3-4"]) off the
// text before the first citation anchor. Segments keep their original text. Bare numbers only count
// as dockets when a "No./Nos." segment precedes them; otherwise they stay in the name.
function wlCitePeelDockets(beforeAnchor) {
  var rest = beforeAnchor.replace(/,\s*$/, '');
  var docketRe = /^(Nos?\. [0-9A-Za-z][\w\-\/:. ]*)$/;
  var bareDocketRe = /^[0-9][\w\-\/:.]*$/;
  var dockets = [];
  var pendingBare = [];
  while (true) {
    var lastComma = rest.lastIndexOf(', ');
    if (lastComma === -1) break;
    var lastSegment = rest.substring(lastComma + 2);
    if (docketRe.test(lastSegment)) {
      dockets = [lastSegment].concat(pendingBare, dockets);
      pendingBare = [];
      rest = rest.substring(0, lastComma);
    } else if (bareDocketRe.test(lastSegment)) {
      pendingBare.unshift(lastSegment);
      rest = rest.substring(0, lastComma);
    } else {
      break;
    }
  }
  if (pendingBare.length > 0) {
    // Bare numbers with no preceding "No./Nos." segment belong to the name.
    rest = rest + ', ' + pendingBare.join(', ');
    pendingBare = [];
  }
  return { name: rest, dockets: dockets };
}

function wlCiteBuildCitation(anchor) {
  return {
    kind: anchor.kind,
    volume: anchor.volume,
    reporter: anchor.reporter,
    page: anchor.page,
    raw: anchor.raw
  };
}

function wlCiteFindAnchorsInText(text) {
  // Try wlRepFindCitations first
  var anchors = wlRepFindCitations(text);
  if (anchors.length > 0) return anchors;

  // No known anchors found. Try to find any citation-like text
  // Look for a year followed by a reporter-like abbreviation and a page number
  // This handles unrecognized reporters like "Fed. Sec. L. Rep. (CCH) ¶ 100"
  // Match: year + reporter (may contain parens) + page number
  var broadRe = /\b(\d{4})\s+([A-Z][A-Za-z.\-\s]*(?:\s+[A-Z][A-Za-z.\-]*)*)\s*(?:\([^)]*\)\s*)*(?:[§¶]\s*)?(\d+)/g;
  var match;
  while ((match = broadRe.exec(text)) !== null) {
    // Check boundaries: not part of a larger word
    var before = match.index > 0 ? text.charAt(match.index - 1) : ' ';
    var after = match.index + match[0].length < text.length ? text.charAt(match.index + match[0].length) : ' ';
    if (/[a-zA-Z0-9]/.test(before) || /[a-zA-Z0-9]/.test(after)) continue;

    // Build the raw text from the year to the page number
    var rawText = text.substring(match.index, match.index + match[0].length).trim();

    anchors.push({
      kind: 'unparsed',
      volume: match[1],
      reporter: match[2].trim(),
      page: match[3],
      raw: rawText,
      index: match.index,
      length: match[0].length
    });
  }

  // Sort by index
  anchors.sort(function(a, b) { return a.index - b.index; });
  return anchors;
}

function wlCiteParseStandardForm(text) {
  var cleaned = wlTextClean(text);
  if (!cleaned) return { ok: false, reason: "empty-input" };

  var anchors = wlRepFindCitations(cleaned);
  var hadKnownAnchors = anchors.length > 0;

  // If no known anchors, try broader pattern for unrecognized reporters
  if (anchors.length === 0) {
    anchors = wlCiteFindAnchorsInText(cleaned);
  }
  if (anchors.length === 0) return { ok: false, reason: "no-citation-anchor" };

  // Build main citation run: first anchor + every anchor separated by ", " or ", <pin>, "
  var mainRun = [anchors[0]];
  var pin = null;
  var pinAfter = null;
  var pinAt = false;
  var pinFound = false;

  for (var i = 1; i < anchors.length; i++) {
    var prevEnd = anchors[i - 1].index + anchors[i - 1].length;
    var sep = cleaned.substring(prevEnd, anchors[i].index);

    if (sep === ", ") {
      mainRun.push(anchors[i]);
    } else if (!pinFound) {
      var pinMatch = sep.match(/^,\s*(\*?\d+(?:-\d+)?)\s*,\s*$/);
      if (pinMatch) {
        pin = pinMatch[1];
        pinAfter = i - 1;
        pinAt = false;
        pinFound = true;
        mainRun.push(anchors[i]);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // Name = text before first anchor, minus trailing ", "
  // Also strip any docket region (", No. …" or ", Nos. …") from the end of the name.
  // A docket is the last comma-segment before the first anchor that matches
  // /^Nos?\. [0-9A-Za-z][\w\-\/:. ]*$/ (e.g., "No. 24-123").
  // Do NOT treat "No." inside a party name (not preceded by a comma as a separate segment) as a docket.
  var nameEnd = mainRun[0].index;
  var beforeName = cleaned.substring(0, nameEnd);
  // Strip trailing separator before first anchor, then peel off dockets from the end
  var peeled = wlCitePeelDockets(beforeName);
  var dockets = peeled.dockets;
  var name = peeled.name;

  // Find main parenthetical: first balanced ( … ) immediately after the main run
  var runEnd = mainRun[mainRun.length - 1].index + mainRun[mainRun.length - 1].length;
  var searchFrom = runEnd;
  while (searchFrom < cleaned.length && cleaned.charAt(searchFrom) === ' ') {
    searchFrom++;
  }

  // Check for pin after the last anchor in the run (before the parenthetical).
  // A pin is only digits/star-digits/range that is followed by ", <next citation>" or " (" or end —
  // NOT digits followed by more words (e.g., "2003 N.Y. Slip Op. 19972" is not a pin).
  var unparsedSegments = [];
  if (pin === null) {
    var parenIdx = wlCiteFindDecisionParen(cleaned, searchFrom);
    if (parenIdx !== -1) {
      var textToParen = cleaned.substring(runEnd, parenIdx);
      // Pin must be followed by ", " + next citation, " (" , or end — not by more words
      var pinAfterMatch = textToParen.match(/(?:,\s*|at\s+)(\*\d+(?:-\d+)?|\d+(?:-\d+)?)(?=\s*(?:,|\(|$))/);
      if (pinAfterMatch) {
        pin = pinAfterMatch[1];
        pinAfter = mainRun.length - 1;
        pinAt = pinAfterMatch[0].charAt(0) === 'a';
      } else {
        // No valid pin found. Check for an unparsed citation segment between the last citation and the parenthetical.
        var unparsedMatch = textToParen.match(/^(?:,\s*|at\s+)(.+)$/);
        if (unparsedMatch && unparsedMatch[1].trim().length > 0) {
          unparsedSegments.push(unparsedMatch[1].trim());
        }
      }
    }
  }

  var parenOpen = wlCiteFindDecisionParen(cleaned, searchFrom);
  if (parenOpen === -1) return { ok: false, reason: "no-parenthetical" };

  var parenClose = wlCiteFindMatchingParen(cleaned, parenOpen);
  if (parenClose === -1) return { ok: false, reason: "unbalanced-parens" };

  var parenContent = cleaned.substring(parenOpen + 1, parenClose);

  // Parse parenthetical
  var parenParsed = wlCiteParseParentheticalStandard(parenContent);

  // History = everything after the main ) with leading ", " removed
  var afterParen = cleaned.substring(parenClose + 1);
  var history = afterParen.replace(/^,\s*/, '');

  // Build citations
  var citations = [];
  for (var j = 0; j < mainRun.length; j++) {
    citations.push(wlCiteBuildCitation(mainRun[j]));
  }

  // Add any unparsed segments found between the last main-run citation and the parenthetical
  for (var u = 0; u < unparsedSegments.length; u++) {
    citations.push({ kind: "unparsed", raw: unparsedSegments[u] });
  }

  // Check for unrecognized reporters in the main run area
  var reviewReasons = [];

  // If any main run anchors are unparsed (found by broad regex, not wlRepFindCitations),
  // add unknown-reporter review reason
  for (var k = 0; k < mainRun.length; k++) {
    if (mainRun[k].kind === "unparsed") {
      reviewReasons.push("unknown-reporter");
      break;
    }
  }
  // If there are unparsed segments between the last citation and the parenthetical,
  // add unknown-reporter review reason
  if (unparsedSegments.length > 0) {
    reviewReasons.push("unknown-reporter");
  }

  // dockets: optional field — comma-segment(s) before the first citation anchor
  // starting with "No." or "Nos." that match the docket pattern, stripped from the name.
  return {
    ok: true,
    dialect: "standard",
    name: name,
    dockets: dockets,
    citations: citations,
    pin: pin,
    pinAfter: pinAfter,
    pinAt: pinAt,
    court: parenParsed.court,
    year: parenParsed.year,
    date: parenParsed.date,
    dateText: parenParsed.dateText,
    dateSeparator: parenParsed.dateSeparator,
    parentheticalSuffix: parenParsed.parentheticalSuffix,
    history: history,
    unparsedTail: "",
    reviewReasons: reviewReasons
  };
}

function wlCiteParseTexasForm(text) {
  var cleaned = wlTextClean(text);
  if (!cleaned) return { ok: false, reason: "empty-input" };

  var anchors = wlCiteFindAnchorsInText(cleaned);
  if (anchors.length === 0) return { ok: false, reason: "no-citation-anchor" };

  // Build main citation run
  var mainRun = [anchors[0]];
  var pin = null;
  var pinAfter = null;
  var pinAt = false;
  var pinFound = false;

  for (var i = 1; i < anchors.length; i++) {
    var prevEnd = anchors[i - 1].index + anchors[i - 1].length;
    var sep = cleaned.substring(prevEnd, anchors[i].index);

    if (sep === ", ") {
      mainRun.push(anchors[i]);
    } else if (!pinFound) {
      var pinMatch = sep.match(/^,\s*(\*?\d+(?:-\d+)?)\s*,\s*$/);
      if (pinMatch) {
        pin = pinMatch[1];
        pinAfter = i - 1;
        pinAt = false;
        pinFound = true;
        mainRun.push(anchors[i]);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // Name
  // Also strip any docket region from the end of the name (same logic as standard form).
  var nameEnd = mainRun[0].index;
  var beforeName = cleaned.substring(0, nameEnd);
  var peeled = wlCitePeelDockets(beforeName);
  var dockets = peeled.dockets;
  var name = peeled.name;

  // Find main parenthetical
  var runEnd = mainRun[mainRun.length - 1].index + mainRun[mainRun.length - 1].length;
  var searchFrom = runEnd;
  while (searchFrom < cleaned.length && cleaned.charAt(searchFrom) === ' ') {
    searchFrom++;
  }

  var parenOpen = cleaned.indexOf('(', searchFrom);
  if (parenOpen === -1) return { ok: false, reason: "no-parenthetical" };

  var parenClose = wlCiteFindMatchingParen(cleaned, parenOpen);
  if (parenClose === -1) return { ok: false, reason: "unbalanced-parens" };

  var parenContent = cleaned.substring(parenOpen + 1, parenClose);

  // Parse Texas parenthetical
  var parenParsed = wlCiteParseParentheticalTexas(parenContent);

  // History
  var afterParen = cleaned.substring(parenClose + 1);
  var history = afterParen.replace(/^,\s*/, '');

  // Build citations
  var citations = [];
  for (var j = 0; j < mainRun.length; j++) {
    citations.push(wlCiteBuildCitation(mainRun[j]));
  }

  // dockets: optional field — comma-segment(s) before the first citation anchor
  // starting with "No." or "Nos." that match the docket pattern, stripped from the name.
  return {
    ok: true,
    dialect: "texas",
    name: name,
    dockets: dockets,
    citations: citations,
    pin: pin,
    pinAfter: pinAfter,
    pinAt: pinAt,
    court: parenParsed.court,
    year: parenParsed.year,
    date: parenParsed.date,
    dateText: parenParsed.dateText,
    parentheticalSuffix: parenParsed.parentheticalSuffix,
    history: history,
    unparsedTail: "",
    reviewReasons: []
  };
}

function wlCiteParseWestlawInventory(text) {
  var cleaned = wlTextClean(text);
  if (!cleaned) return { ok: false, reason: "empty-input" };

  var anchors = wlRepFindCitations(cleaned);
  if (anchors.length === 0) return { ok: false, reason: "no-citation-anchor" };

  // Name is text before the first anchor
  var nameEnd = anchors[0].index;
  var beforeName = cleaned.substring(0, nameEnd);
  var name = beforeName.replace(/,\s*$/, '');

  // Dockets: region between name and first citation anchor, starting with No./Nos.
  var dockets = [];
  dockets = wlCitePeelDockets(beforeName).dockets;

  // Main citation run
  var mainRun = [anchors[0]];
  var pin = null;
  var pinFound = false;

  for (var i = 1; i < anchors.length; i++) {
    var prevEnd = anchors[i - 1].index + anchors[i - 1].length;
    var sep = cleaned.substring(prevEnd, anchors[i].index);

    if (sep === ", ") {
      mainRun.push(anchors[i]);
    } else if (!pinFound) {
      var pinMatch = sep.match(/^,\s*(\*?\d+(?:-\d+)?)\s*,\s*$/);
      if (pinMatch) {
        pin = pinMatch[1];
        pinFound = true;
        mainRun.push(anchors[i]);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  // Find main parenthetical
  var runEnd = mainRun[mainRun.length - 1].index + mainRun[mainRun.length - 1].length;
  var searchFrom = runEnd;
  while (searchFrom < cleaned.length && cleaned.charAt(searchFrom) === ' ') {
    searchFrom++;
  }

  var parenOpen = cleaned.indexOf('(', searchFrom);
  if (parenOpen === -1) return { ok: false, reason: "no-parenthetical" };

  var parenClose = wlCiteFindMatchingParen(cleaned, parenOpen);
  if (parenClose === -1) return { ok: false, reason: "unbalanced-parens" };

  var parenContent = cleaned.substring(parenOpen + 1, parenClose);

  // Parse parenthetical for date and rawCourt
  var parenParsed = wlCiteParseParentheticalStandard(parenContent);

  // Enhanced inventory can append its docket list after the decision parenthetical.
  var inventoryTail = cleaned.substring(parenClose + 1).replace(/^,\s*/, '');
  if (wlCiteDocketStartRe.test(inventoryTail)) {
    var tailAnchors = wlRepFindCitations(inventoryTail);
    var docketTail = tailAnchors.length ? inventoryTail.substring(0, tailAnchors[0].index) : inventoryTail;
    var tailDockets = wlCitePeelDockets('inventory, ' + docketTail).dockets;
    for (var td = 0; td < tailDockets.length; td++) {
      if (dockets.indexOf(tailDockets[td]) === -1) dockets.push(tailDockets[td]);
    }
  }

  // Find WL cites in the text
  var wlRe = /\b(\d{4})\s+WL\s+(\d+)\b/g;
  var wlCites = [];
  var wlMatch;
  while ((wlMatch = wlRe.exec(cleaned)) !== null) {
    wlCites.push({
      kind: "wl",
      volume: wlMatch[1],
      reporter: "WL",
      page: wlMatch[2],
      raw: wlMatch[1] + " WL " + wlMatch[2]
    });
  }

  // Build citations from main run
  var citations = [];
  for (var j = 0; j < mainRun.length; j++) {
    citations.push(wlCiteBuildCitation(mainRun[j]));
  }

  // Add WL cites to citations
  for (var w = 0; w < wlCites.length; w++) {
    citations.push(wlCites[w]);
  }

  // Check for dockets in the long form
  var reviewReasons = [];
  if (dockets.length > 0) {
    reviewReasons.push("docket-in-long-form");
  }

  return {
    ok: true,
    dockets: dockets,
    citations: citations,
    wl: wlCites.length > 0 ? wlCites[wlCites.length - 1] : null,
    date: parenParsed.date,
    rawCourt: parenParsed.court,
    reviewReasons: reviewReasons
  };
}

function wlCiteParseShortName(shortText, primary) {
  if (!shortText || !primary) return null;

  var cleaned = wlTextClean(shortText);
  if (!cleaned) return null;

  // Handle "Id." case (with or without locator)
  if (/^Id\.(\s+at\s+\S+)?$/i.test(cleaned)) return null;

  // Try wlRepFindCitations first
  var anchors = wlRepFindCitations(cleaned);

  // If no anchors found, try a broader pattern that handles "at" locators
  // e.g., "187 F.3d at 490" or "Sanchez, 187 F.3d at 490"
  if (anchors.length === 0) {
    // Check for citation with "at" locator: volume reporter at page
    var atRe = /^(.*?,\s*)?(\d+)\s+([A-Z][A-Za-z0-9.\-]*(?:\s+[A-Z][A-Za-z0-9.\-]*)*)\s+at\s+(\d+)$/;
    var atMatch = cleaned.match(atRe);
    if (atMatch) {
      // Check compatibility with primary
      var atCitation = {
        kind: primary.kind,
        volume: atMatch[2],
        reporter: atMatch[3],
        page: atMatch[4],
        raw: atMatch[2] + ' ' + atMatch[3] + ' at ' + atMatch[4]
      };
      var compatible = primary && primary.kind === atCitation.kind &&
        primary.volume === atCitation.volume &&
        primary.reporter === atCitation.reporter;
      if (!compatible) return null;
      // Return the name part (before the citation)
      var namePart = atMatch[1] ? atMatch[1].replace(/,\s*$/, '') : '';
      if (!namePart) return null; // citation-only form
      return namePart;
    }

    // Check for citation-only without "at": volume reporter page
    var repMatch = cleaned.match(/^(\d+)\s+([A-Z][A-Za-z0-9.\-]*(?:\s+[A-Z][A-Za-z0-9.\-]*)*)\s+(\d+)$/);
    if (repMatch) {
      return null; // citation-only form
    }

    // No citation found - treat as name-only
    return cleaned;
  }

  // There's at least one citation anchor from wlRepFindCitations
  var firstAnchor = anchors[0];
  var anchorCitation = wlCiteBuildCitation(firstAnchor);

  // Check compatibility with primary citation
  var compatible = false;
  if (primary && primary.kind === anchorCitation.kind &&
      primary.volume === anchorCitation.volume &&
      primary.reporter === anchorCitation.reporter) {
    compatible = true;
  }

  if (!compatible) {
    return null;
  }

  // Name is the text before the first anchor, minus trailing ", "
  var nameEnd = firstAnchor.index;
  var namePart = cleaned.substring(0, nameEnd).replace(/,\s*$/, '');

  // If the name part is empty or just a comma, it's a citation-only form
  if (!namePart || namePart === ',') return null;

  return namePart;
}

function wlCiteSelectShortName(forms, primary) {
  if (!forms || forms.length === 0) return null;

  for (var i = 0; i < forms.length; i++) {
    var result = wlCiteParseShortName(forms[i], primary);
    if (result !== null) return result;
  }

  return null;
}

function wlCiteRoundTrip(parsed, originalText) {
  if (!parsed || !parsed.ok) return { ok: false, residual: "parsed not ok" };

  // Recompose: name[, dockets], citations (pin placed where the parser found it) (<court> <dateText|year>[, suffix])[, history]
  var recomposed = '';

  // Name
  if (parsed.name) recomposed = parsed.name;

  // Dockets (raw tokens, original text)
  if (parsed.dockets && parsed.dockets.length > 0) {
    recomposed += ', ' + parsed.dockets.join(", ");
  }

  // Citations, with the pinpoint at its original position ("490" or "at *4")
  var pinToken = parsed.pin ? ((parsed.pinAt ? 'at ' : '') + parsed.pin) : '';
  var pinPlaced = !parsed.pin;
  if (parsed.citations && parsed.citations.length > 0) {
    var citeStrs = [];
    for (var i = 0; i < parsed.citations.length; i++) {
      var c = parsed.citations[i];
      if (c.kind === "wl") {
        citeStrs.push(c.volume + " WL " + c.page);
      } else if (c.kind === "unparsed") {
        citeStrs.push(c.raw);
      } else {
        citeStrs.push(c.volume + " " + c.reporter + " " + c.page);
      }
      if (!pinPlaced && parsed.pinAfter === i) {
        citeStrs.push(pinToken);
        pinPlaced = true;
      }
    }
    recomposed += ', ' + citeStrs.join(", ");
  }
  if (!pinPlaced) recomposed += ', at ' + parsed.pin;

  // Parenthetical: court + full date text (WL/enhanced forms) or year, then optional suffix
  var parenParts = [];
  if (parsed.court) parenParts.push(parsed.court.replace(/,$/, ''));
  var dateToken = parsed.dateText || parsed.year;
  if (dateToken) parenParts.push(dateToken);
  if (parsed.parentheticalSuffix) parenParts.push(parsed.parentheticalSuffix);
  if (parenParts.length > 0) {
    // Texas form: (court year, suffix) - comma only before suffix
    var parenStr = '';
    if (parsed.parentheticalSuffix) {
      var prefixParts = parenParts.slice(0, -1);
      parenStr = prefixParts.join(' ') + ', ' + parenParts[parenParts.length - 1];
    } else {
      parenStr = parenParts.join(parsed.dateText && parsed.dateSeparator ? parsed.dateSeparator : ' ');
    }
    recomposed += ' (' + parenStr + ')';
  }

  // History
  if (parsed.history) recomposed += ', ' + parsed.history;

  // Normalize whitespace and NFC to match wlTextClean behavior on original
  var normalized = recomposed.replace(/\s+/g, " ").trim().normalize("NFC");

  // Compare to original cleaned input
  var originalCleaned = wlTextClean(originalText);
  var ok = normalized === originalCleaned;

  return {
    ok: ok,
    residual: ok ? "" : ("recomposed: " + normalized + " | original: " + originalCleaned)
  };
}

/* ---- profile.js ---- */
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
    re: /^court of appeals of (georgia|michigan|colorado|iowa|kansas|kentucky|minnesota|north carolina|new mexico|oregon|south carolina|utah|wisconsin|indiana|nebraska)(?:,\s*\d+(?:st|nd|rd|th)?\s+district)?$/,
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
    re: /^court of appeals of missouri(?:,\s*(?:eastern|western|southern)\s+district)?$/,
    res: { system: "state", level: "intermediate", state: "MO", circuit: null, district: null, bluebook: "Mo. Ct. App.", confidence: "table" }
  },
  {
    re: /^court of appeals of washington(?:,\s*division\s+(?:1|2|3|one|two|three))?$/,
    res: { system: "state", level: "intermediate", state: "WA", circuit: null, district: null, bluebook: "Wash. Ct. App.", confidence: "table" }
  },
  {
    re: /^court of appeals of arizona(?:,\s*division\s+(?:1|2|one|two))?$/,
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
  if (classification && classification.bluebook && serviceCourt && wlTextCompareKey(serviceCourt) !== wlTextCompareKey(classification.bluebook)) reviewReasons.push("court-conflict");

  if (classification && classification.system === "federal" && classification.level === "supreme") {
    return { court: "", reviewReasons: reviewReasons };
  }

  if (primary && wlProfIsRegionalReporter(primary.reporter)) {
    return { court: classification ? classification.bluebook || "" : "", reviewReasons: reviewReasons };
  }

  if (primary && wlProfIsOfficialHighCourtReporter(primary.reporter) && classification && classification.level === "supreme" && ((classification.state === "CA" && /^Cal\./.test(primary.reporter)) || (classification.state === "NY" && /^N\.Y\./.test(primary.reporter)))) {
    return { court: "", reviewReasons: reviewReasons };
  }

  if (serviceCourt) {
    var serviceKey = wlTextCompareKey(serviceCourt);
    var bluebookKey = classification ? wlTextCompareKey(classification.bluebook || "") : "";
    if (serviceKey === bluebookKey) {
      return { court: serviceCourt, reviewReasons: reviewReasons };
    } else if (classification && classification.bluebook) {
      return { court: classification.bluebook, reviewReasons: reviewReasons };
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

/* ---- service.js ---- */
var wlSvcWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
var wlSvcNbspRe = /\u00A0/g;
var wlSvcSpaceCollapseRe = /\s+/g;

var wlSvcRecipes = {
  citationFormA: "westReporterOnly",
  citationFormB: "allReporter"
};

var wlSvcLimits = {
  timeoutMs: 8000,
  totalMs: 20000,
  maxBodyBytes: 2000000,
  maxRequests: 3
};

function wlSvcClean(s) {
  if (s == null) return "";
  if (typeof s !== "string") return "";
  return s
    .replace(wlSvcWatermarkRe, "")
    .replace(wlSvcNbspRe, " ")
    .replace(wlSvcSpaceCollapseRe, " ")
    .trim()
    .normalize("NFC");
}

// Fixed format options sent on every request; also the echo-check expectations.
var wlSvcFixedOptions = {
  underline: "false",
  bold: "false",
  italicize: "false",
  subStyle: "LegalBriefs"
};

// One source of truth for a request's format options: the URL query and `expect` both derive from it.
function wlSvcFormatOptions(history, parallelCiteRule) {
  return {
    history: history,
    parallelCiteRule: parallelCiteRule,
    subStyle: wlSvcFixedOptions.subStyle,
    underline: wlSvcFixedOptions.underline,
    bold: wlSvcFixedOptions.bold,
    italicize: wlSvcFixedOptions.italicize
  };
}

function wlSvcFormatQuery(o) {
  return "contextData=(sc.Default)&underline=" + o.underline + "&bold=" + o.bold + "&italicize=" + o.italicize +
    "&subStyle=" + o.subStyle + "&history=" + o.history + "&parallelCiteRule=" + o.parallelCiteRule;
}

function wlSvcBuildRequests(config, secrets, profile) {
  if (!config || !config.guid || !config.relatedInfoHost) return [];
  if (!secrets || !secrets.pageEventId || !secrets.resourceToken) return [];
  if (!/^I[0-9a-f]{32}$/.test(config.guid)) return [];

  var base = "https://1.next.westlaw.com/RelatedInfo/v2/citestyles/" + config.guid;
  var optsA = wlSvcFormatOptions("true", wlSvcRecipes.citationFormA);
  var optsB = wlSvcFormatOptions("false", wlSvcRecipes.citationFormB);

  var styleIdsA = profile === "texas" ? ["texas", "standard"] : ["standard"];

  var urlA = base + "?styleIDs=" + styleIdsA[0] + "&" + wlSvcFormatQuery(optsA);
  if (styleIdsA.length > 1) {
    urlA += "&styleIDs=" + styleIdsA[1];
  }

  var urlB = base + "?styleIDs=standard&styleIDs=westlaw&" + wlSvcFormatQuery(optsB);

  var headers = {
    "X-Requested-With": "XMLHttpRequest",
    "x-cobalt-exectype": "async",
    "x-cobalt-pcid": secrets.pageEventId,
    "x-cobalt-rtid": secrets.resourceToken,
    "x-cobalt-host": config.relatedInfoHost
  };

  return [
    { label: "A", url: urlA, headers: headers, styleIds: styleIdsA, expect: optsA },
    { label: "B", url: urlB, headers: headers, styleIds: ["standard", "westlaw"], expect: optsB }
  ];
}

function wlSvcFetch(req, deps) {
  var startTime = Date.now();
  var timeoutMs = (deps && deps.timeoutMs) || wlSvcLimits.timeoutMs;
  var timer = null;
  var timedOut = false;

  var timeoutFn = (deps && deps.setTimeout) || setTimeout;
  var clearTimeoutFn = (deps && deps.clearTimeout) || clearTimeout;

  var timeoutPromise = new Promise(function(_, reject) {
    timer = timeoutFn(function() {
      timedOut = true;
      var err = new Error("timeout");
      err.name = "timeout";
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([
    deps.request(req.url, { headers: req.headers, responseType: "text", successCodes: false }),
    timeoutPromise
  ]).then(function(response) {
    if (timer) clearTimeoutFn(timer);
    var ms = Date.now() - startTime;

    if (timedOut) {
      return { label: req.label, category: "timeout", status: "none", ms: ms };
    }

    var status = response.status;
    var body = response.body || "";
    var rawContentType = (response.headers && (response.headers["content-type"] || "")) || "";

    if (status === 401 || status === 403) {
      return { label: req.label, category: "auth", status: status, ms: ms };
    }

    if (status >= 200 && status < 300) {
      if (rawContentType.indexOf("application/json") === -1 || body.indexOf("<") === 0) {
        return { label: req.label, category: "auth", status: status, ms: ms };
      }
    }

    if (status === 404) {
      return { label: req.label, category: "not-found-html", status: status, ms: ms };
    }

    if (status === 400) {
      return { label: req.label, category: "bad-request", status: status, ms: ms };
    }

    if (status === 429) {
      var retryAfter = 0;
      var rawRetry = response.headers && response.headers["retry-after"];
      if (rawRetry) {
        var parsed = parseInt(rawRetry, 10);
        if (!isNaN(parsed)) {
          retryAfter = Math.min(parsed, 86400);
        }
      }
      return { label: req.label, category: "rate-limited", status: status, ms: ms, retryAfter: retryAfter };
    }

    if (status >= 500) {
      return { label: req.label, category: "server", status: status, ms: ms };
    }

    if (body.length > wlSvcLimits.maxBodyBytes) {
      return { label: req.label, category: "oversized", status: status, ms: ms };
    }

    var json;
    try {
      json = JSON.parse(body);
    } catch (e) {
      return { label: req.label, category: "malformed-json", status: status, ms: ms };
    }

    if (!json || !Array.isArray(json.responses)) {
      return { label: req.label, category: "unexpected-envelope", status: status, ms: ms };
    }

    return { label: req.label, category: "ok", status: status, ms: ms, json: json };
  }).catch(function(err) {
    if (timer) clearTimeoutFn(timer);
    var ms = Date.now() - startTime;
    var errName = err && err.name ? err.name : "Error";
    if (errName === "timeout") {
      return { label: req.label, category: "timeout", status: "none", ms: ms };
    }
    return { label: req.label, category: "network-or-origin", status: "none", ms: ms };
  });
}

async function wlSvcFetchAll(requests, deps) {
  var startTime = Date.now();
  var results = [];
  var budgetMs = wlSvcLimits.totalMs;
  var maxRequests = wlSvcLimits.maxRequests;

  for (var i = 0; i < requests.length && i < maxRequests; i++) {
    var req = requests[i];

    var elapsed = Date.now() - startTime;
    if (elapsed >= budgetMs) {
      results.push({ label: req.label, category: "timeout", status: "none", ms: 0 });
      continue;
    }

    if (results.length > 0) {
      var prevResult = results[results.length - 1];
      if (prevResult.label === "A" &&
          (prevResult.category === "auth" ||
           prevResult.category === "rate-limited" ||
           prevResult.category === "timeout" ||
           prevResult.category === "network-or-origin")) {
        results.push({ label: req.label, category: "skipped", status: "none", ms: 0 });
        continue;
      }
    }

    var remaining = budgetMs - (Date.now() - startTime);
    var adjustedDeps = {
      request: deps.request,
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout,
      timeoutMs: Math.min(wlSvcLimits.timeoutMs, Math.max(1, remaining))
    };

    var result = await wlSvcFetch(req, adjustedDeps);
    results.push(result);
  }

  return results;
}

function wlSvcIsObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function wlSvcNormalizeEcho(v) {
  return String(v).trim().toLowerCase();
}

// Returns the first `expect` key whose echoed value is present and differs, or "" if none.
// Absent (undefined/null) echo keys are not failures: the live envelope may not echo them.
function wlSvcFindEchoMismatch(echoedRequest, expect) {
  if (!wlSvcIsObject(expect)) return "";
  for (var key in expect) {
    if (!Object.prototype.hasOwnProperty.call(expect, key)) continue;
    if (!Object.prototype.hasOwnProperty.call(echoedRequest, key)) continue;
    var echoed = echoedRequest[key];
    if (echoed === undefined || echoed === null) continue;
    if (wlSvcNormalizeEcho(echoed) !== wlSvcNormalizeEcho(expect[key])) return key;
  }
  return "";
}

function wlSvcFormText(form) {
  if (wlSvcIsObject(form.text)) {
    var plain = form.text["text/plain"];
    if (typeof plain === "string") return wlSvcClean(plain);
  }
  if (Array.isArray(form.cites)) {
    for (var i = 0; i < form.cites.length; i++) {
      var cite = form.cites[i];
      if (wlSvcIsObject(cite) && cite.type === "text/plain" && typeof cite.value === "string") return wlSvcClean(cite.value);
    }
  }
  return "";
}

// Reads a citestyles envelope. Never throws.
// `expect` (optional) is the request's format-option map; echoed options that contradict it make the
// style unusable: the style is OMITTED from `styles` and `echo-mismatch:<styleId>:<key>` is recorded
// (key names only, never option values), so consumers see neither a missing-style duplicate nor bad text.
// A style with neither a long nor an enhanced form is kept (long: null) and flagged `missing-form:<id>:long`.
function wlSvcReadEnvelope(json, wantedStyleIds, expect) {
  var reviewReasons = [];
  var styles = {};
  var seenStyleIds = {};
  var rejectedStyleIds = {};

  if (!wlSvcIsObject(json) || !Array.isArray(json.responses) || !Array.isArray(wantedStyleIds)) {
    return { ok: false, styles: styles, reviewReasons: ["malformed-envelope"] };
  }

  var malformed = false;
  var responses = json.responses;
  for (var i = 0; i < responses.length; i++) {
    var resp = responses[i];
    if (!wlSvcIsObject(resp)) {
      malformed = true;
      continue;
    }
    var req = wlSvcIsObject(resp.request) ? resp.request : {};
    var styleId = typeof req.styleId === "string" ? req.styleId : "";
    if (styleId === "") continue;

    if (seenStyleIds[styleId]) {
      reviewReasons.push("duplicate-style:" + styleId);
      continue;
    }
    seenStyleIds[styleId] = true;

    if (wantedStyleIds.indexOf(styleId) === -1) {
      continue;
    }

    var mismatchKey = wlSvcFindEchoMismatch(req, expect);
    if (mismatchKey) {
      reviewReasons.push("echo-mismatch:" + styleId + ":" + mismatchKey);
      rejectedStyleIds[styleId] = true;
      continue;
    }

    var forms = Array.isArray(resp.forms) ? resp.forms : [];
    var longText = null;
    var shorts = [];
    var enhanced = null;

    for (var f = 0; f < forms.length; f++) {
      var form = forms[f];
      if (!wlSvcIsObject(form)) {
        malformed = true;
        continue;
      }
      var fname = typeof form.name === "string" ? form.name : form.form;
      var text = wlSvcFormText(form);

      if (fname === "long") {
        if (text) longText = text;
      } else if (fname === "short") {
        shorts.push(text);
      } else if (fname === "enhanced") {
        if (text) enhanced = text;
      }
    }

    if (longText === null && enhanced === null) {
      reviewReasons.push("missing-form:" + styleId + ":long");
    }

    styles[styleId] = {
      long: longText,
      shorts: shorts,
      id: styleId,
      enhanced: enhanced
    };
  }

  if (malformed) {
    reviewReasons.push("malformed-envelope");
  }

  for (var w = 0; w < wantedStyleIds.length; w++) {
    if (!styles[wantedStyleIds[w]] && !rejectedStyleIds[wantedStyleIds[w]]) {
      reviewReasons.push("missing-style:" + wantedStyleIds[w]);
    }
  }

  return {
    ok: reviewReasons.length === 0,
    styles: styles,
    reviewReasons: reviewReasons
  };
}

/* ---- dom.js ---- */
var wlDomWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
var wlDomPageCountRe = /^\(Approx\. \d+ pages?\)$/;
var wlDomGuidRe = /^I[0-9a-f]{32}$/;
var wlDomDocRe = /\/Document\/([^\/?#]+)/;
var wlDomLinkRe = /\/Link\//;
var wlDomCourtLineRe = /\b(Court|Circuit|Tribunal)\b/i;

function wlDomClean(s) {
  if (s == null) return "";
  return s
    .replace(wlDomWatermarkRe, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function wlDomValidateGUID(v) {
  return wlDomGuidRe.test(v);
}

function wlDomReadPageContext(doc, url) {
  var reviewReasons = [];
  var ambiguous = false;
  var config = {};
  var secrets = {};

  var scripts = doc.querySelectorAll("script");
  var kv = {};
  var keyPattern = /"(DocumentGuid|ContentType|RelatedInfo|PageEventIdentifier|ResourceToken)"\s*:\s*"([^"]*)"/g;

  for (var i = 0; i < scripts.length; i++) {
    var text = scripts[i].textContent;
    if (!text) continue;
    var m;
    while ((m = keyPattern.exec(text)) !== null) {
      var key = m[1];
      var val = m[2];
      if (!kv[key]) kv[key] = [];
      kv[key].push(val);
    }
  }

  var guidValues = kv["DocumentGuid"] || [];
  var contentTypeValues = kv["ContentType"] || [];
  var riValues = kv["RelatedInfo"] || [];
  var peiValues = kv["PageEventIdentifier"] || [];
  var rtValues = kv["ResourceToken"] || [];

  var validGUIDs = [];
  for (var g = 0; g < guidValues.length; g++) {
    if (wlDomValidateGUID(guidValues[g])) {
      validGUIDs.push(guidValues[g]);
    }
  }

  if (validGUIDs.length > 1) {
    var uniqGUIDs = [];
    for (var v = 0; v < validGUIDs.length; v++) {
      if (uniqGUIDs.indexOf(validGUIDs[v]) === -1) uniqGUIDs.push(validGUIDs[v]);
    }
    if (uniqGUIDs.length > 1) {
      ambiguous = true;
    }
  }

  if (contentTypeValues.length > 0) {
    var uniqCT = [];
    for (var c = 0; c < contentTypeValues.length; c++) {
      if (uniqCT.indexOf(contentTypeValues[c]) === -1) uniqCT.push(contentTypeValues[c]);
    }
    if (uniqCT.length > 1) {
      ambiguous = true;
    } else {
      config.contentType = uniqCT[0];
    }
  }

  if (riValues.length > 0) {
    var uniqRI = [];
    for (var r = 0; r < riValues.length; r++) {
      if (uniqRI.indexOf(riValues[r]) === -1) uniqRI.push(riValues[r]);
    }
    if (uniqRI.length > 1) {
      ambiguous = true;
    } else {
      config.relatedInfoHost = uniqRI[0];
    }
  }

  var urlGUID = null;
  var docMatch = url.match(wlDomDocRe);
  if (docMatch) {
    var pathGUID = docMatch[1];
    if (wlDomValidateGUID(pathGUID)) {
      urlGUID = pathGUID;
    }
  }

  var identityGUID = null;
  var identityReason = null;

  if (urlGUID) {
    if (validGUIDs.indexOf(urlGUID) !== -1) {
      identityGUID = urlGUID;
    } else {
      identityReason = "identity-mismatch";
    }
  } else if (validGUIDs.length === 1) {
    identityGUID = validGUIDs[0];
  } else {
    var headerAnchor = doc.querySelector("#co_docHeaderTitleLine a[href*=\"/Document/I\"]");
    if (headerAnchor) {
      var href = headerAnchor.getAttribute("href") || "";
      var anchorGUID = href.match(/\/Document\/(I[0-9a-f]{32})/);
      if (anchorGUID && validGUIDs.indexOf(anchorGUID[1]) !== -1) {
        identityGUID = anchorGUID[1];
      } else {
        identityReason = "identity-ambiguous";
      }
    } else {
      identityReason = "identity-ambiguous";
    }
  }

  if (typeof uniqGUIDs !== "undefined" && uniqGUIDs.length > 1) {
    identityGUID = null;
    identityReason = "identity-ambiguous";
  }
  config.guid = identityGUID;
  config.identityReason = identityReason;
  config.ambiguous = ambiguous;

  var ok = validGUIDs.length > 0 || identityGUID !== null;

  // Validate and resolve secrets
  var tokenPattern = /^[A-Za-z0-9._~+\/=:\|-]{8,512}$/;
  var peiValid = [];
  for (var p = 0; p < peiValues.length; p++) {
    if (tokenPattern.test(peiValues[p])) peiValid.push(peiValues[p]);
  }
  var rtValid = [];
  for (var r = 0; r < rtValues.length; r++) {
    if (tokenPattern.test(rtValues[r])) rtValid.push(rtValues[r]);
  }

  var peiUniq = [];
  for (var p2 = 0; p2 < peiValid.length; p2++) {
    if (peiUniq.indexOf(peiValid[p2]) === -1) peiUniq.push(peiValid[p2]);
  }
  var rtUniq = [];
  for (var r2 = 0; r2 < rtValid.length; r2++) {
    if (rtUniq.indexOf(rtValid[r2]) === -1) rtUniq.push(rtValid[r2]);
  }

  var secrets = null;
  if (peiUniq.length === 1 && rtUniq.length === 1) {
    secrets = { resourceToken: rtUniq[0], pageEventId: peiUniq[0] };
  } else if (peiValues.length > 0 || rtValues.length > 0) {
    if (peiUniq.length === 0 || rtUniq.length === 0) {
      reviewReasons.push("missing-config");
    } else {
      reviewReasons.push("ambiguous-config");
    }
  } else {
    reviewReasons.push("missing-config");
  }

  return {
    ok: ok,
    config: config,
    secrets: secrets,
    ambiguous: ambiguous,
    reviewReasons: reviewReasons
  };
}

function wlDomInspectCaseReadiness(doc, url) {
  var host = doc.location.hostname || "";
  if (host !== "1.next.westlaw.com") {
    return { isCase: false, capability: null, reason: "wrong-host" };
  }

  var header = doc.querySelector("#co_docHeaderTitleLine");
  var headerCitation = doc.querySelector("#co_docHeaderCitation");
  if (!header && !headerCitation) {
    return { isCase: false, capability: null, reason: "no-header" };
  }

  var ctx = wlDomReadPageContext(doc, url);
  var contentType = ctx.config && ctx.config.contentType;

  if (ctx.config && ctx.config.identityReason === "identity-mismatch") {
    return { isCase: false, capability: null, reason: "identity-mismatch" };
  }

  var title = doc.title || "";
  var titleParts = title.split(" | ");
  var hasCasesTitle = false;
  for (var i = 0; i < titleParts.length; i++) {
    if (titleParts[i] === "Cases") {
      hasCasesTitle = true;
      break;
    }
  }

  var hasCaseDOM = false;
  if (header) {
    var headerText = wlDomClean(header.textContent);
    if (headerText) hasCaseDOM = true;
  }
  if (!hasCaseDOM && headerCitation) {
    var lis = doc.querySelectorAll("#co_docHeaderCitation > li");
    if (lis.length > 0) hasCaseDOM = true;
  }

  if (contentType) {
    if (contentType !== "Cases") {
      return { isCase: false, capability: null, reason: "non-case-content-type" };
    }
    if (hasCasesTitle && hasCaseDOM) {
      if (ctx.config.guid && ctx.config.relatedInfoHost && ctx.secrets) {
        return { isCase: true, capability: "service", reason: "content-type-cases" };
      }
      return { isCase: true, capability: "dom-only", reason: "content-type-cases-no-secrets" };
    }
    return { isCase: true, capability: "dom-only", reason: "content-type-cases" };
  }

  if (hasCasesTitle && hasCaseDOM) {
    return { isCase: true, capability: "dom-only", reason: "title-cases-no-config" };
  }

  return { isCase: false, capability: null, reason: "not-a-case" };
}

function wlDomClassifyLI(liText) {
  var date = wlTextParseUSDate(liText);
  if (date) return { kind: "date", date: date, dateText: liText };

  if (wlDomPageCountRe.test(liText)) {
    return { kind: "pageCount", text: liText };
  }

  var cits = wlRepFindCitations(liText);
  if (cits.length > 0) {
    return { kind: "citation", citations: cits, text: liText };
  }

  return { kind: "unparsed", text: liText };
}

// First acceptable unparsed line in one header list, same rule as rawCourt.
function wlDomHeaderListCourtLine(listEl) {
  var kids = listEl.children || [];
  var dateSeen = false;
  var courtLineFound = false;
  var courtLine = "";
  for (var kd = 0; kd < kids.length; kd++) {
    if (String(kids[kd].tagName).toUpperCase() !== "LI") continue;
    var liText = wlDomClean(kids[kd].textContent);
    if (!liText) continue;
    var classified = wlDomClassifyLI(liText);
    if (classified.kind === "date") {
      dateSeen = true;
    } else if (classified.kind === "unparsed") {
      if (!courtLineFound && (!dateSeen || wlDomCourtLineRe.test(liText))) {
        courtLine = liText;
        courtLineFound = true;
      }
    }
  }
  return courtLine;
}

function wlDomReadAuthor(doc, reviewReasons) {
  var lines = doc.querySelectorAll(".x_leadAuthorLine");
  var names = [];
  for (var i = 0; i < lines.length; i++) {
    if (wlDomAuthorSkipped(lines[i])) continue;
    var line = wlDomClean(lines[i].textContent);
    var popup = lines[i].querySelector(".co_infoBox");
    if (popup) line = wlDomClean(line.replace(wlDomClean(popup.textContent), ""));
    var name = "";
    if (/^per curiam[:.]?$/i.test(line)) name = "Per Curiam";
    else {
      var match = line.match(/^(?:Opinion\s+(?:by|of)\s+)?(.+?)(?:,\s*|\s+)(?:(?:Senior|Chief|Associate|United States|U\.?S\.?|District|Circuit|Magistrate|Bankruptcy)\s+)*(?:Judge|Justice|J\.|C\.?J\.?)[:.]?$/i);
      if (!match) match = line.match(/^(?:(?:Senior|Chief|Associate|United States|District|Circuit|Magistrate|Bankruptcy)\s+)*(?:Judge|Justice)\s+(.+?)[:.]?$/i);
      if (!match) match = line.match(/^(?:Mr\.?\s+)?(?:(?:Chief|Associate)\s+)?Justice\s+(.+?)\s+delivered the opinion of the Court\.?$/i);
      if (match) name = match[1];
    }
    if (!name || name.length > 200 || !/^[\p{L}\p{M} .'’-]+(?:,\s*(?:Jr\.?|Sr\.?|II|III|IV))?$/u.test(name) || /\b(?:and|before|opinion|delivered|by)\b/i.test(name)) {
      if (reviewReasons.indexOf("author-unparsed") === -1) reviewReasons.push("author-unparsed");
      continue;
    }
    var author = wlDomSplitAuthor(name);
    author.source = "lead-majority-byline";
    author.evidence = line;
    // Only evidence explicitly attached to this byline may enrich a surname.
    if (!author.firstName && author.fieldMode !== 1) {
      var records = [lines[i]].concat(Array.prototype.slice.call(lines[i].querySelectorAll("a, button")));
      var fuller = [];
      records.forEach(function(record) {
        ["title", "aria-label"].forEach(function(attr) {
          var text = wlDomClean(record.getAttribute(attr));
          if (!text || text.length > 200 || /\b(?:panel|dissent|concurr|opinion|before|and)\b/i.test(text)) return;
          text = text.replace(/^(?:Hon\.?|Judge|Justice)\s+/i, "").replace(/,\s*(?:Judge|Justice)\.?$/i, "");
          if (!/^[\p{L}\p{M} .'’-]+(?:,\s*(?:Jr\.?|Sr\.?|II|III|IV))?$/u.test(text)) return;
          var candidate = wlDomSplitAuthor(text);
          if (!candidate.firstName || candidate.lastName.toLowerCase() !== author.lastName.toLowerCase()) return;
          candidate.source = "lead-byline-linked-" + attr;
          candidate.evidence = text;
          if (!fuller.some(function(n) { return n.firstName === candidate.firstName && n.lastName === candidate.lastName; })) fuller.push(candidate);
        });
      });
      if (fuller.length === 1) author = fuller[0];
      else if (fuller.length > 1 && reviewReasons.indexOf("author-identity-conflict") === -1) reviewReasons.push("author-identity-conflict");
    }
    if (!names.some(function(n) { return n.firstName.toLowerCase() === author.firstName.toLowerCase() && n.lastName.toLowerCase() === author.lastName.toLowerCase(); })) names.push(author);
  }
  if (names.length > 1) reviewReasons.push("author-conflict");
  var result = names.length === 1 && reviewReasons.indexOf("author-unparsed") === -1 ? names[0] : null;
  if (result && !result.firstName && result.fieldMode !== 1) reviewReasons.push("author-name-incomplete");
  return result;
}

function wlDomAuthorSkipped(el) {
  for (var node = el; node; node = node.parentElement || node._parent) {
    if (/(^|\s)(?:co_panelBlock|co_attorneyBlock|x_dissentAuthorLine|x_concurAuthorLine|co_dissent|co_concurrence)(\s|$)/i.test(node.className || "")) return true;
  }
  return false;
}

function wlDomSplitAuthor(name) {
  if (name === "Per Curiam") return { creatorType: "author", firstName: "", lastName: name, fieldMode: 1 };
  var parts = name.replace(/,\s*(Jr\.?|Sr\.?|II|III|IV)$/i, " $1").split(/\s+/);
  var last = parts.pop();
  if (/^(?:Jr\.?|Sr\.?|II|III|IV)$/i.test(last) && parts.length) last = parts.pop() + " " + last;
  while (parts.length && /^(?:de|del|della|di|da|dos|du|la|le|van|von|der|den|ten|ter)$/i.test(parts[parts.length - 1])) last = parts.pop() + " " + last;
  return { creatorType: "author", firstName: parts.join(" "), lastName: last };
}

function wlDomLinkedAuthor(text, partial) {
  var name = wlDomClean(text).replace(/^Hon\.?\s+/i, "");
  if (!name || name.length > 200 || !/^[\p{L}\p{M} .'’-]+(?:,\s*(?:Jr\.?|Sr\.?|II|III|IV))?$/u.test(name) || /\b(?:panel|dissent|concurr|opinion|before|and|judge|justice)\b/i.test(name)) return null;
  var author = wlDomSplitAuthor(name);
  var base = function(s) { return s.replace(/\s+(?:Jr\.?|Sr\.?|II|III|IV)$/i, "").toLowerCase(); };
  if (!author.firstName || base(author.lastName) !== base(partial.lastName)) return null;
  author.source = "lead-byline-linked-author-popup";
  author.evidence = wlDomClean(text);
  return author;
}

function wlDomReadFacts(doc) {
  var reviewReasons = [];
  var citations = [];
  var dockets = [];
  var date = null;
  var dateText = null;
  var pageCountText = null;
  var rawCourt = "";
  var headerName = "";
  var guid = null;

  var header = doc.querySelector("#co_docHeaderTitleLine");
  if (header) {
    var rawTitle = wlDomClean(header.getAttribute("title") || header.textContent);
    var caseIdx = rawTitle.indexOf(" | Cases");
    if (caseIdx !== -1) {
      headerName = rawTitle.substring(0, caseIdx);
    } else {
      headerName = rawTitle;
    }
  }

  var ctx = wlDomReadPageContext(doc, "");
  if (ctx.config) {
    guid = ctx.config.guid;
  }

  var seenLis = {};
  // Duplicate IDs are possible (e.g. a sticky copy of the header): read every list, tracking per-list citations.
  var headerLists = doc.querySelectorAll("#co_docHeaderCitation");
  var lis = [];
  var liListIndex = [];
  var listCiteKeys = [];
  for (var hl = 0; hl < headerLists.length; hl++) {
    listCiteKeys.push([]);
    var kids = headerLists[hl].children || [];
    for (var kd = 0; kd < kids.length; kd++) {
      if (String(kids[kd].tagName).toUpperCase() === "LI") {
        lis.push(kids[kd]);
        liListIndex.push(hl);
      }
    }
  }
  var courtLineFound = false;
  var dateValues = [];

  for (var i = 0; i < lis.length; i++) {
    var liText = wlDomClean(lis[i].textContent);
    if (!liText) continue;

    var classified = wlDomClassifyLI(liText);
    if (classified.kind === "citation") {
      for (var lk = 0; lk < classified.citations.length; lk++) {
        var lkKey = classified.citations[lk].raw.toLowerCase();
        if (listCiteKeys[liListIndex[i]].indexOf(lkKey) === -1) listCiteKeys[liListIndex[i]].push(lkKey);
      }
    }

    if (seenLis[liText]) continue;
    seenLis[liText] = true;

    if (classified.kind === "date") {
      dateValues.push({ date: classified.date, text: classified.dateText });
      if (!date) {
        date = classified.date;
        dateText = classified.dateText;
      } else if (date !== classified.date) {
        reviewReasons.push("conflicting-header");
      }
    } else if (classified.kind === "pageCount") {
      pageCountText = classified.text;
    } else if (classified.kind === "citation") {
      for (var ci = 0; ci < classified.citations.length; ci++) {
        citations.push(classified.citations[ci]);
      }
    } else if (classified.kind === "unparsed") {
      if (!courtLineFound && (!date || wlDomCourtLineRe.test(liText))) {
        rawCourt = liText;
        courtLineFound = true;
      } else {
        citations.push({ kind: "unparsed", text: liText });
      }
    }
  }

  // Two headers whose citation sets disagree (neither contains the other) are a conflict, not first-wins.
  for (var la = 0; la < listCiteKeys.length; la++) {
    for (var lb = la + 1; lb < listCiteKeys.length; lb++) {
      var keysA = listCiteKeys[la];
      var keysB = listCiteKeys[lb];
      if (!keysA.length || !keysB.length) continue;
      var aInB = keysA.every(function(k) { return keysB.indexOf(k) !== -1; });
      var bInA = keysB.every(function(k) { return keysA.indexOf(k) !== -1; });
      if (!aInB && !bInA && reviewReasons.indexOf("conflicting-header") === -1) {
        reviewReasons.push("conflicting-header");
      }
    }
  }

  if (headerLists.length >= 2 && reviewReasons.indexOf("conflicting-header") === -1) {
    var headerCourtLines = [];
    for (var hc = 0; hc < headerLists.length; hc++) {
      var headerCourtLine = wlDomHeaderListCourtLine(headerLists[hc]);
      if (headerCourtLine) headerCourtLines.push(headerCourtLine.toLowerCase());
    }
    if (headerCourtLines.length >= 2) {
      for (var hx = 1; hx < headerCourtLines.length; hx++) {
        if (headerCourtLines[hx] !== headerCourtLines[0]) {
          reviewReasons.push("conflicting-header");
          break;
        }
      }
    }
  }

  var courtFallbackSupplied = false;
  if (!rawCourt) {
    var courtBlock = doc.querySelector(".co_courtBlock") || doc.querySelector("#courtline");
    if (courtBlock) {
      var courtFallbackText = wlDomClean(courtBlock.textContent);
      if (courtFallbackText && (courtBlock.id !== "courtline" || wlDomCourtLineRe.test(courtFallbackText))) {
        rawCourt = courtFallbackText;
        courtFallbackSupplied = true;
      }
    }
  }

  var docketBlocks = doc.querySelectorAll(".co_docketBlock");
  for (var db = 0; db < docketBlocks.length; db++) {
    var docketText = wlDomClean(docketBlocks[db].textContent);
    docketText = docketText.replace(/\.$/, "");
    var docketParts = [];
    if (docketText.indexOf("Nos.") === 0) {
      var remainder = docketText.substring(4);
      var splitParts = remainder.split(/,\s*|;\s*|\s+and\s+/);
      for (var sp = 0; sp < splitParts.length; sp++) {
        var trimmed = splitParts[sp].trim();
        if (trimmed) docketParts.push("No. " + trimmed);
      }
    } else if (docketText.indexOf("No.") === 0) {
      var noParts = docketText.split(/;\s*|,\s*|\s+and\s+/);
      for (var np = 0; np < noParts.length; np++) {
        var npTrimmed = noParts[np].trim();
        if (npTrimmed) docketParts.push(npTrimmed);
      }
    } else if (/^\d+(?:[-/]\d+)*(?:,\s*\d+(?:[-/]\d+)*)*$/.test(docketText)) {
      // Live Westlaw docket blocks can omit No./Nos.; preserve every bounded numeric docket.
      docketParts = docketText.split(/,\s*/).map(function(part) { return "No. " + part; });
    }
    for (var dp = 0; dp < docketParts.length; dp++) {
      var dpKey = typeof wlTextCompareKey === "function" ? wlTextCompareKey(docketParts[dp]) : docketParts[dp];
      var isDup = false;
      for (var dk = 0; dk < dockets.length; dk++) {
        var dkKey = typeof wlTextCompareKey === "function" ? wlTextCompareKey(dockets[dk]) : dockets[dk];
        if (dkKey === dpKey) { isDup = true; break; }
      }
      if (!isDup) dockets.push(docketParts[dp]);
    }
  }

  var dateFallbackSupplied = false;
  if (!date) {
    var fileDate = doc.querySelector("#filedate");
    if (fileDate) {
      var fileDateText = wlDomClean(fileDate.textContent);
      var fileDateValue = wlTextParseUSDate(fileDateText);
      if (fileDateValue) {
        date = fileDateValue;
        dateText = fileDateText;
        dateFallbackSupplied = true;
      }
    }
  }

  var citesFallbackSupplied = false;
  if (!citations.length) {
    var fallbackBlocks = doc.querySelectorAll(".co_cites, #cite0, #cite1, #cite2");
    for (var fb = 0; fb < fallbackBlocks.length; fb++) {
      var citesFallback = fallbackBlocks[fb];
      var citesText = wlDomClean(citesFallback.textContent);
      var fallbackCits = wlRepFindCitations(citesText);
      if (fallbackCits.length > 0) citesFallbackSupplied = true;
      for (var fc = 0; fc < fallbackCits.length; fc++) {
        if (!citations.some(function(c) { return c.raw === fallbackCits[fc].raw; })) citations.push(fallbackCits[fc]);
      }
    }
  }

  if (headerLists.length === 0 && (courtFallbackSupplied || citesFallbackSupplied || dateFallbackSupplied)) {
    reviewReasons.push("header-fallback");
  }

  return {
    ok: true,
    guid: guid,
    contentType: (ctx.config && ctx.config.contentType) || null,
    headerName: headerName,
    author: wlDomReadAuthor(doc, reviewReasons),
    rawCourt: rawCourt,
    dateText: dateText,
    date: date,
    citations: citations,
    dockets: dockets,
    pageCountText: pageCountText,
    reviewReasons: reviewReasons
  };
}

/* ---- map.js ---- */
var wlMapWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/;
var wlMapHtmlRe = /<[a-zA-Z]/;
var wlMapTokenRe = /ResourceToken|PageEventIdentifier|x-cobalt|Bearer /;
var wlMapYearParenRe = /\(\d{4}\)/;
var wlMapCiteRe = /\d+ [A-Z].* \d+/;
var wlMapGuidRe = /^I[0-9a-f]{32}$/;
// A missing header list is recorded for provenance. It does not mean the validated citation needs review.
var wlMapInformationalReasons = ["header-fallback"];
var wlMapDashRe = /[\u2013\u2014]/g;

function wlMapStripWatermark(str) {
  return str.replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "").replace(/\s+/g, " ").trim().normalize("NFC");
}

function wlMapNormalizeDocketSingle(docket) {
  var s = docket.replace(/\.$/, "");
  var hasPrefix = false;
  if (s.indexOf("No. ") === 0) {
    s = s.slice(4);
    hasPrefix = true;
  }
  s = s.replace(wlMapDashRe, "-");
  if (hasPrefix) {
    s = "No. " + s;
  }
  return s;
}

function wlMapFormatDocketNumber(dockets) {
  if (!dockets || dockets.length === 0) {
    return "";
  }
  if (dockets.length === 1) {
    return wlMapNormalizeDocketSingle(dockets[0]);
  }
  var parts = dockets.map(function(d) {
    var s = d.replace(/\.$/, "");
    s = s.replace(/^Nos?\.\s*/, "");
    s = s.replace(wlMapDashRe, "-");
    return s;
  });
  return "Nos. " + parts.join(", ");
}

function wlMapHasDemotingReason(reviewReasons) {
  for (var i = 0; i < reviewReasons.length; i++) {
    if (wlMapInformationalReasons.indexOf(reviewReasons[i]) === -1) return true;
  }
  return false;
}

function wlMapToZoteroFields(rec, opts) {
  if (!rec || typeof rec !== "object") {
    return { ok: false, reason: "bad-record" };
  }
  opts = opts || {};
  var version = opts.version || "0.0.0-dev";

  var caseName = wlMapStripWatermark(rec.caseName || "");
  var court = wlMapStripWatermark(rec.court || "");
  var dateDecided = wlMapStripWatermark(rec.date || "");
  var docketNumber = wlMapFormatDocketNumber(rec.dockets || []);
  var history = wlMapStripWatermark(rec.history || "");
  if (history.indexOf(", ") === 0) {
    history = history.slice(2);
  }

  var shortTitle = null;
  if (rec.shortName !== null && rec.shortName !== undefined) {
    shortTitle = wlMapStripWatermark(rec.shortName);
  }

  var guid = rec.guid || "";
  var url = "";
  var reviewReasons = (rec.reviewReasons || []).slice();
  if (wlMapGuidRe.test(guid)) {
    url = "https://1.next.westlaw.com/Document/" + guid + "/View/FullText.html";
  } else {
    reviewReasons.push("bad-guid");
  }

  var primary = rec.primary || {};
  var reporter = "";
  var reporterVolume = "";
  var firstPage = "";
  if (primary.kind === "wl") {
    reporter = "WL";
    reporterVolume = wlMapStripWatermark(primary.volume || "");
    firstPage = wlMapStripWatermark(primary.page || "");
  } else {
    reporter = wlMapStripWatermark(primary.reporter || "");
    reporterVolume = wlMapStripWatermark(primary.volume || "");
    firstPage = wlMapStripWatermark(primary.page || "");
  }

  var extraLines = [];
  if (rec.wlPrimary) {
    extraLines.push("Medium: Westlaw");
  }
  if (rec.parentheticalSuffix) {
    extraLines.push("Genre: " + wlMapStripWatermark(rec.parentheticalSuffix));
  }
  var alternates = rec.alternates || [];
  alternates.forEach(function(alt) {
    if (alt.kind === "reporter") {
      extraLines.push("Westlaw parallel citation: " + wlMapStripWatermark(alt.raw || ""));
    }
  });
  if (!rec.wlPrimary) {
    alternates.forEach(function(alt) {
      if (alt.kind === "wl") {
        extraLines.push("Westlaw alternate WL citation: " + wlMapStripWatermark(alt.raw || ""));
      }
    });
  }
  alternates.forEach(function(alt) {
    if (alt.kind === "unparsed") {
      extraLines.push("Westlaw unparsed citation: " + wlMapStripWatermark(alt.raw || ""));
    }
  });
  extraLines.push("Westlaw court (raw): " + wlMapStripWatermark(rec.rawCourt || ""));
  extraLines.push("Westlaw profile: " + wlMapStripWatermark(rec.profile || ""));
  extraLines.push("Westlaw status: " + wlMapStripWatermark(rec.status || ""));
  reviewReasons.forEach(function(r) {
    extraLines.push("Westlaw review: " + wlMapStripWatermark(r));
  });
  extraLines.push("Westlaw translator: " + version);
  if (opts.build) extraLines.push("Westlaw build: " + opts.build);
  if (opts.importRun) extraLines.push("Westlaw import run: " + opts.importRun);
  if (rec.author && typeof rec.author === "object") {
    extraLines.push("Westlaw author source: " + wlMapStripWatermark(rec.author.source || "lead-majority-byline"));
    extraLines.push("Westlaw author evidence: " + wlMapStripWatermark(rec.author.evidence || ""));
  }
  var extra = extraLines.join("\n");

  var tags = [];
  if (wlMapHasDemotingReason(reviewReasons) || rec.status !== "validated-profile") {
    tags.push({ tag: "Westlaw: needs citation review" });
  }

  var result = {
    itemType: "case",
    caseName: caseName,
    court: court,
    dateDecided: dateDecided,
    docketNumber: docketNumber,
    reporter: reporter,
    reporterVolume: reporterVolume,
    firstPage: firstPage,
    history: history,
    extra: extra,
    tags: tags,
    creators: rec.author ? [typeof rec.author === "object" ? {
      creatorType: "author", firstName: wlMapStripWatermark(rec.author.firstName || ""),
      lastName: wlMapStripWatermark(rec.author.lastName || ""),
      ...(rec.author.fieldMode === 1 ? { fieldMode: 1 } : {})
    } : { creatorType: "author", lastName: wlMapStripWatermark(rec.author), fieldMode: 1 }] : [],
    attachments: [],
    notes: []
  };
  if (shortTitle !== null) {
    result.shortTitle = shortTitle;
  }
  if (url) {
    result.url = url;
  }

  return result;
}

function wlMapValidateOutgoing(fields) {
  var problems = [];
  if (!fields || typeof fields !== "object") return { ok: false, problems: ["bad-fields"] };
  var scalarKeys = [
    "itemType", "caseName", "court", "dateDecided", "docketNumber",
    "reporter", "reporterVolume", "firstPage", "history", "shortTitle", "url"
  ];
  scalarKeys.forEach(function(key) {
    var val = fields[key];
    if (val !== undefined && typeof val !== "string") problems.push("invalid-type:" + key);
    if (typeof val !== "string") {
      return;
    }
    if (val.length > 2000) {
      problems.push("value-too-long:" + key);
    }
    if (wlMapWatermarkRe.test(val)) {
      problems.push("watermark:" + key);
    }
    if (wlMapHtmlRe.test(val)) {
      problems.push("html:" + key);
    }
    if (wlMapTokenRe.test(val)) {
      problems.push("token-leak:" + key);
    }
  });

  if (fields.dateDecided && /^\d{4}-\d{2}-\d{2}$/.test(fields.dateDecided)) {
    var parts = fields.dateDecided.split("-");
    var date = new Date(fields.dateDecided + "T00:00:00Z");
    if (!isFinite(date.getTime()) || date.getUTCFullYear() !== Number(parts[0]) || date.getUTCMonth() + 1 !== Number(parts[1]) || date.getUTCDate() !== Number(parts[2])) problems.push("invalid-date:dateDecided");
  } else if (fields.dateDecided && !/^\d{4}$/.test(fields.dateDecided)) problems.push("invalid-date:dateDecided");
  ["reporterVolume", "firstPage"].forEach(function(key) {
    if (fields[key] && !/^\d+$/.test(fields[key])) problems.push("invalid-number:" + key);
  });

  if (typeof fields.extra === "string") {
    var extraLines = fields.extra.split("\n");
    extraLines.forEach(function(line, i) {
      if (line.length > 2000) {
        problems.push("value-too-long:extra[" + i + "]");
      }
      if (wlMapWatermarkRe.test(line)) {
        problems.push("watermark:extra[" + i + "]");
      }
      if (wlMapHtmlRe.test(line)) {
        problems.push("html:extra[" + i + "]");
      }
      if (wlMapTokenRe.test(line)) {
        problems.push("token-leak:extra[" + i + "]");
      }
    });
  }

  if (Array.isArray(fields.tags)) {
    fields.tags.forEach(function(t, i) {
      if (t && typeof t.tag === "string") {
        if (t.tag.length > 2000) {
          problems.push("value-too-long:tags[" + i + "]");
        }
        if (wlMapWatermarkRe.test(t.tag)) {
          problems.push("watermark:tags[" + i + "]");
        }
        if (wlMapHtmlRe.test(t.tag)) {
          problems.push("html:tags[" + i + "]");
        }
        if (wlMapTokenRe.test(t.tag)) {
          problems.push("token-leak:tags[" + i + "]");
        }
      }
    });
  }

  if (Array.isArray(fields.creators)) fields.creators.forEach(function(c, i) {
    if (!c || c.creatorType !== "author" || (c.fieldMode !== undefined && c.fieldMode !== 0 && c.fieldMode !== 1) || typeof c.lastName !== "string" || !c.lastName.trim() || c.lastName.length > 200 || wlMapWatermarkRe.test(c.lastName) || wlMapHtmlRe.test(c.lastName) || wlMapTokenRe.test(c.lastName) || (c.firstName !== undefined && (typeof c.firstName !== "string" || c.firstName.length > 200 || wlMapWatermarkRe.test(c.firstName) || wlMapHtmlRe.test(c.firstName) || wlMapTokenRe.test(c.firstName)))) {
      problems.push("invalid-creator:creators[" + i + "]");
    }
  });
  if (fields.attachments && fields.attachments.length > 0) {
    problems.push("non-empty-attachments");
  }
  if (fields.notes && fields.notes.length > 0) {
    problems.push("non-empty-notes");
  }

  if (typeof fields.firstPage === "string" && fields.firstPage) {
    if (fields.firstPage.indexOf("*") !== -1) {
      problems.push("firstPage-has-star");
    }
    if (fields.firstPage.indexOf("-") !== -1) {
      problems.push("firstPage-has-range");
    }
    if (fields.firstPage.indexOf(",") !== -1) {
      problems.push("firstPage-has-comma");
    }
  }

  ["reporter", "caseName", "court"].forEach(function(key) {
    var val = fields[key];
    if (typeof val === "string" && wlMapYearParenRe.test(val)) {
      problems.push("year-paren:" + key);
    }
  });

  if (typeof fields.shortTitle === "string" && fields.shortTitle) {
    if (fields.shortTitle === "Id.") {
      problems.push("shortTitle-is-Id");
    }
    if (wlMapCiteRe.test(fields.shortTitle)) {
      problems.push("shortTitle-has-cite");
    }
  }

  if (typeof fields.url === "string" && fields.url) {
    if (fields.url.indexOf("?") !== -1) {
      problems.push("url-has-query");
    }
    if (fields.url.indexOf("#") !== -1) {
      problems.push("url-has-fragment");
    }
  }

  return { ok: problems.length === 0, problems: problems };
}

function wlMapApply(fields, item) {
  if (!item || typeof item !== "object") {
    return item;
  }
  var scalarKeys = [
    "itemType", "caseName", "court", "dateDecided", "docketNumber",
    "reporter", "reporterVolume", "firstPage", "history", "shortTitle", "url", "extra"
  ];
  scalarKeys.forEach(function(key) {
    var val = fields[key];
    if (val === undefined) {
      return;
    }
    if (val === "" && key !== "court") {
      return;
    }
    item[key] = val;
  });

  if (Array.isArray(fields.tags) && Array.isArray(item.tags)) {
    fields.tags.forEach(function(t) {
      item.tags.push(t);
    });
  }

  if (Array.isArray(fields.creators) && Array.isArray(item.creators)) {
    fields.creators.forEach(function(c) { item.creators.push(c); });
  }

  return item;
}

/* ---- reconcile.js ---- */
function wlRecClean(s) {
  if (s == null) return "";
  return s
    .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function wlRecCitationMatchKey(c) {
  return c.kind + "|" + c.volume + "|" + wlTextCompareKey(c.reporter || "") + "|" + c.page;
}

function wlRecCitationInHistory(citation, history) {
  if (!history || !citation) return false;
  var key = wlRecCitationMatchKey(citation);
  var parts = key.split("|");
  if (parts.length < 4) return false;
  var vol = parts[1];
  var repKey = parts[2];
  var page = parts[3];
  var histClean = wlTextClean(history);
  var repCanon = wlTextCompareKey(parts[2].replace(/\s/g, ""));
  var repSearch = repCanon.replace(/\s/g, "");
  var re = new RegExp("\\b" + vol + "\\s+" + repSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+" + page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
  return re.test(histClean);
}

function wlRecBuildDomOnlyRecord(dom, context, profile, reviewReasons, provenance) {
  var primary = null;
  if (dom.citations && dom.citations.length > 0) {
    for (var i = 0; i < dom.citations.length; i++) {
      if (dom.citations[i].kind === "reporter") {
        primary = dom.citations[i];
        break;
      }
    }
    if (!primary) {
      primary = dom.citations[0];
    }
  }

  var classification = wlProfClassifyCourt(dom.rawCourt || "");
  var courtResult = wlProfCourtForCitation(classification, primary, null);
  if (courtResult.reviewReasons) {
    for (var r = 0; r < courtResult.reviewReasons.length; r++) {
      reviewReasons.push(courtResult.reviewReasons[r]);
    }
  }

  var date = dom.date || null;
  if (!date && dom.dateText) {
    date = wlTextParseUSDate(dom.dateText);
  }

  provenance.caseName = "dom";
  provenance.primary = "dom";
  provenance.date = date ? "dom" : "service";
  provenance.dockets = "dom";
  provenance.court = "dom";
  if (dom.author) provenance.author = "dom";

  return {
    guid: dom.guid || null,
    url: context.url || "",
    caseName: wlRecClean(dom.headerName || ""),
    author: dom.author || null,
    shortName: null,
    court: courtResult.court || "",
    rawCourt: dom.rawCourt || "",
    date: date,
    dockets: dom.dockets || [],
    primary: primary,
    alternates: [],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: !!primary && primary.kind === "wl",
    profile: "dom-only",
    status: "metadata-only",
    reviewReasons: reviewReasons,
    provenance: provenance
  };
}

// Forwards DOM review reason codes once each. Non-codes are dropped.
function wlRecAddDomReasons(reviewReasons, dom) {
  if (!dom || !Array.isArray(dom.reviewReasons)) return;
  for (var i = 0; i < dom.reviewReasons.length; i++) {
    var reason = dom.reviewReasons[i];
    if (typeof reason === "string" && /^[a-z0-9:-]+$/.test(reason) && reviewReasons.indexOf(reason) === -1) {
      reviewReasons.push(reason);
    }
  }
}

// header-fallback is recorded but does not by itself block validated-profile.
function wlRecHasDemotingReason(reviewReasons) {
  for (var i = 0; i < reviewReasons.length; i++) {
    if (reviewReasons[i] !== "header-fallback") return true;
  }
  return false;
}

// Forwards a service envelope's own review reasons (already code-only, never response text) once each.
function wlRecAddEnvelopeReasons(reviewReasons, envelope) {
  if (!envelope || !Array.isArray(envelope.reviewReasons)) return;
  for (var i = 0; i < envelope.reviewReasons.length; i++) {
    var reason = envelope.reviewReasons[i];
    if (typeof reason === "string" && reviewReasons.indexOf(reason) === -1) reviewReasons.push(reason);
  }
}

function wlRecReconcile(input) {
  var context = input.context || {};
  var dom = input.dom || {};
  var svcA = input.svcA || {};
  var svcB = input.svcB || {};
  var profile = input.profile || "standard";

  var guid = context.guid || dom.guid || null;
  var url = context.url || "";
  var reviewReasons = [];
  var provenance = {};

  try {
    wlRecAddDomReasons(reviewReasons, dom);

    // 1. Service A failure → metadata-only from DOM
    if (svcA.category !== "ok") {
      reviewReasons.push("service-" + (svcA.category || "unknown"));
      return wlRecBuildDomOnlyRecord(dom, context, profile, reviewReasons, provenance);
    }

    wlRecAddEnvelopeReasons(reviewReasons, svcA.envelope);
    if (svcB.category === "ok") wlRecAddEnvelopeReasons(reviewReasons, svcB.envelope);

    // 2. Parse A forms — for texas profile, prefer texas.long; fall back to standard.long
    var parsedA = null;
    var aLongText = null;
    var aShorts = [];
    if (svcA.envelope) {
      if (profile === "texas" && svcA.envelope.styles.texas && svcA.envelope.styles.texas.long) {
        aLongText = svcA.envelope.styles.texas.long;
        aShorts = svcA.envelope.styles.texas.shorts || [];
      } else {
        aLongText = svcA.envelope.styles.standard && svcA.envelope.styles.standard.long;
        aShorts = svcA.envelope.styles.standard && svcA.envelope.styles.standard.shorts || [];
      }
      if (aLongText) {
        if (profile === "texas") {
          parsedA = wlCiteParseTexasForm(aLongText);
        } else {
          parsedA = wlCiteParseStandardForm(aLongText);
        }
      }
    }

    // 3. Parse B forms
    var parsedBstd = null;
    var parsedBinv = null;
    if (svcB.category === "ok" && svcB.envelope) {
      var bLongText = svcB.envelope.styles.standard && svcB.envelope.styles.standard.long;
      if (bLongText) {
        parsedBstd = wlCiteParseStandardForm(bLongText);
      }
      var bEnhancedText = svcB.envelope.styles.westlaw && svcB.envelope.styles.westlaw.enhanced;
      if (bEnhancedText) {
        parsedBinv = wlCiteParseWestlawInventory(bEnhancedText);
      }
    } else if (svcB.category !== "ok" && svcA.category === "ok") {
      reviewReasons.push("inventory-" + (svcB.category || "unknown"));
    }

    // 4. Round-trip checks
    wlRecAddDomReasons(reviewReasons, parsedA);
    wlRecAddDomReasons(reviewReasons, parsedBstd);
    if (parsedA && parsedA.ok && aLongText) {
      var rtA = wlCiteRoundTrip(parsedA, aLongText);
      if (!rtA.ok) {
        reviewReasons.push("round-trip-mismatch");
      }
    }
    if (parsedBstd && parsedBstd.ok && svcB.envelope && svcB.envelope.styles.standard && svcB.envelope.styles.standard.long) {
      var rtB = wlCiteRoundTrip(parsedBstd, svcB.envelope.styles.standard.long);
      if (!rtB.ok) {
        reviewReasons.push("round-trip-mismatch");
      }
    }

    // 5. caseName
    var caseName = "";
    if (parsedA && parsedA.ok && parsedA.name) {
      caseName = parsedA.name;
      provenance.caseName = "service";
    } else if (dom.headerName) {
      caseName = wlRecClean(dom.headerName);
      reviewReasons.push("name-from-dom");
      provenance.caseName = "dom";
    }
    if (!caseName) reviewReasons.push("name-missing");
    // Different abbreviations may trigger review; never silently certify a different header name.
    if (dom.headerName && parsedA && parsedA.ok && wlTextCompareKey(dom.headerName) !== wlTextCompareKey(parsedA.name)) reviewReasons.push("header-name-conflict");
    if (profile === "standard" && parsedA && parsedA.ok && parsedBstd && parsedBstd.ok && wlTextCompareKey(parsedA.name) !== wlTextCompareKey(parsedBstd.name)) reviewReasons.push("name-conflict");

    // 6. primary citation
    var primary = null;
    var wlPrimary = false;
    var serviceCitations = [];
    if (parsedA && parsedA.ok && parsedA.citations) {
      serviceCitations = parsedA.citations;
    }

    // Find first reporter citation in service main run
    var firstReporterCite = null;
    var firstWLCite = null;
    for (var i = 0; i < serviceCitations.length; i++) {
      if (serviceCitations[i].kind === "reporter" && !firstReporterCite) {
        firstReporterCite = serviceCitations[i];
      }
      if (serviceCitations[i].kind === "wl" && !firstWLCite) {
        firstWLCite = serviceCitations[i];
      }
    }

    // Check if DOM has citations
    var domCitations = dom.citations || [];
    var domReporterCites = [];
    var domUSCite = null;
    for (var d = 0; d < domCitations.length; d++) {
      if (domCitations[d].kind === "reporter") {
        domReporterCites.push(domCitations[d]);
      }
      if (domCitations[d].kind === "reporter" && domCitations[d].reporter === "U.S.") {
        domUSCite = domCitations[d];
      }
    }

    // Track whether service primary conflicts with DOM (for R3: conflicting service cites become unparsed)
    var servicePrimaryConflictsWithDOM = false;
    var classification = wlProfClassifyCourt(dom.rawCourt || "");
    var officialUS = classification.system === "federal" && classification.level === "supreme" ? domUSCite : null;

    // Determine primary
    if (firstReporterCite) {
      // Check if service reporter citation matches a DOM citation
      var matchesDOM = false;
      for (var dc = 0; dc < domReporterCites.length; dc++) {
        if (firstReporterCite.volume === domReporterCites[dc].volume &&
            wlTextCompareKey(firstReporterCite.reporter) === wlTextCompareKey(domReporterCites[dc].reporter) &&
            firstReporterCite.page === domReporterCites[dc].page) {
          matchesDOM = true;
          break;
        }
      }

      if (matchesDOM || domReporterCites.length === 0) {
        primary = officialUS || firstReporterCite;
        provenance.primary = officialUS && firstReporterCite.reporter !== "U.S." ? "dom" : domReporterCites.length === 0 ? "service" : "both";
      } else {
        // Conflict: prefer U.S. cite if SCOTUS, else DOM first reporter cite
        primary = officialUS || domReporterCites[0];
        reviewReasons.push("primary-conflict");
        provenance.primary = "dom";
        servicePrimaryConflictsWithDOM = true;
      }
    } else if (firstWLCite && domReporterCites.length > 0) {
      primary = officialUS || domReporterCites[0];
      provenance.primary = "dom";
      reviewReasons.push("primary-conflict");
    } else if (firstWLCite) {
      primary = firstWLCite;
      wlPrimary = true;
      provenance.primary = "service";
    } else if (domReporterCites.length > 0) {
      primary = officialUS || domReporterCites[0];
      provenance.primary = "dom";
    } else if (domCitations.length > 0) {
      primary = domCitations[0];
      provenance.primary = "dom";
    } else {
      reviewReasons.push("no-citation");
      provenance.primary = "service";
    }

    // 7. alternates
    var alternates = [];
    var alternateKeys = {};
    var primaryKey = primary ? wlRecCitationMatchKey(primary) : null;

    // Collect history citations to exclude
    var historyCites = [];
    if (parsedA && parsedA.ok && parsedA.history) {
      var histCites = wlRepFindCitations(parsedA.history);
      for (var hc = 0; hc < histCites.length; hc++) {
        historyCites.push(wlRecCitationMatchKey(histCites[hc]));
      }
    }

    function wlRecAddAlternate(cite) {
      if (!cite) return;
      var key = wlRecCitationMatchKey(cite);
      if (key === primaryKey) return;
      if (alternateKeys[key]) return;
      // Exclude citations found in history
      for (var h = 0; h < historyCites.length; h++) {
        if (key === historyCites[h]) return;
      }
      alternateKeys[key] = true;
      alternates.push(cite);
    }

    // Service A main run citations (excluding primary)
    // R3: conflicting service primary becomes kind "unparsed" in alternates
    var convertedToUnparsed = {};
    if (parsedA && parsedA.ok && parsedA.citations) {
      for (var ac = 0; ac < parsedA.citations.length; ac++) {
        var cite = parsedA.citations[ac];
        if (servicePrimaryConflictsWithDOM && cite.kind === "reporter" && firstReporterCite && wlRecCitationMatchKey(cite) === wlRecCitationMatchKey(firstReporterCite)) {
          // This is the conflicting service primary — keep as unparsed
          var unparsedCite = { kind: "unparsed", raw: cite.raw || (cite.volume + " " + cite.reporter + " " + cite.page) };
          wlRecAddAlternate(unparsedCite);
          convertedToUnparsed[wlRecCitationMatchKey(cite)] = true;
        } else if (convertedToUnparsed[wlRecCitationMatchKey(cite)]) {
          // Skip original reporter version of a converted citation
        } else {
          wlRecAddAlternate(cite);
        }
      }
    }

    // B-standard long citations
    if (parsedBstd && parsedBstd.ok && parsedBstd.citations) {
      for (var bc = 0; bc < parsedBstd.citations.length; bc++) {
        wlRecAddAlternate(parsedBstd.citations[bc]);
      }
    }

    // B-inventory citations
    if (parsedBinv && parsedBinv.citations) {
      for (var ic = 0; ic < parsedBinv.citations.length; ic++) {
        wlRecAddAlternate(parsedBinv.citations[ic]);
      }
    }

    // DOM citations
    for (var dc2 = 0; dc2 < domCitations.length; dc2++) {
      wlRecAddAlternate(domCitations[dc2]);
    }

    provenance.alternates = "service";

    // 8. date
    var date = null;
    if (dom.date) {
      date = dom.date;
      provenance.date = "dom";
    } else if (parsedBinv && parsedBinv.date) {
      date = parsedBinv.date;
      provenance.date = "service";
    } else if (parsedA && parsedA.ok && parsedA.year) {
      date = parsedA.date || parsedA.year;
      provenance.date = "service";
    }

    var fullDates = [dom.date, parsedA && parsedA.date, parsedBinv && parsedBinv.date].filter(function(d) {
      return typeof d === "string" && d.length === 10;
    });
    if (fullDates.some(function(d) { return d !== fullDates[0]; })) reviewReasons.push("date-conflict");
    if (!date) reviewReasons.push("date-missing");

    // Year conflict check
    if (date && parsedA && parsedA.ok && parsedA.year) {
      var dateYear = null;
      if (date.length === 4) {
        dateYear = date;
      } else if (date.length === 10 && date.charAt(4) === "-") {
        dateYear = date.substring(0, 4);
      }
      if (dateYear && dateYear !== parsedA.year) {
        reviewReasons.push("year-conflict");
      }
    }

    // 9. dockets
    var dockets = [];
    var docketKey = function(ds) {
      return wlMapFormatDocketNumber(ds).replace(/^Nos?\.\s*/, "").toLowerCase().split(/,\s*/).sort().join("|");
    };
    var docketSources = [dom, parsedBinv, parsedA, parsedBstd];
    var firstDocketSet = null;
    for (var ds = 0; ds < docketSources.length; ds++) {
      var sourceDockets = docketSources[ds] && docketSources[ds].dockets;
      if (!sourceDockets || !sourceDockets.length) continue;
      var sourceSetKey = docketKey(sourceDockets);
      if (firstDocketSet === null) {
        firstDocketSet = sourceSetKey;
        provenance.dockets = ds === 0 ? "dom" : "service";
      } else if (sourceSetKey !== firstDocketSet && reviewReasons.indexOf("docket-conflict") === -1) {
        reviewReasons.push("docket-conflict");
      }
      for (var sd = 0; sd < sourceDockets.length; sd++) {
        var sourceKey = docketKey([sourceDockets[sd]]);
        if (!dockets.some(function(docket) { return docketKey([docket]) === sourceKey; })) {
          dockets.push(sourceDockets[sd]);
          if (ds > 0 && dom.dockets && dom.dockets.length) provenance.dockets = "dom+service";
        }
      }
    }
    // WL-primary requires at least one docket.
    if (wlPrimary && dockets.length === 0) {
      reviewReasons.push("wl-missing-docket");
    }

    // 10. court
    var classification = wlProfClassifyCourt(dom.rawCourt || "");
    var serviceCourt = (parsedA && parsedA.ok) ? parsedA.court : "";
    var courtResult = wlProfCourtForCitation(classification, primary, serviceCourt);
    if (courtResult.reviewReasons) {
      for (var cr = 0; cr < courtResult.reviewReasons.length; cr++) {
        reviewReasons.push(courtResult.reviewReasons[cr]);
      }
    }
    var court = courtResult.court || "";
    provenance.court = "service";

    // WL-primary requires full date
    if (wlPrimary && (!date || date.length === 4)) {
      reviewReasons.push("wl-missing-date");
    }

    // 11. parentheticalSuffix
    var parentheticalSuffix = "";
    if (profile === "texas" && parsedA && parsedA.ok && parsedA.parentheticalSuffix) {
      parentheticalSuffix = parsedA.parentheticalSuffix;
      provenance.parentheticalSuffix = "service";
    }

    // 12. history
    var history = "";
    if (parsedA && parsedA.ok && parsedA.history) {
      history = parsedA.history;
      provenance.history = "service";

      // Texas: check for duplicated suffix in history
      if (profile === "texas" && parentheticalSuffix && history) {
        var histClean = wlTextClean(history);
        var suffixKey = wlTextCompareKey(parentheticalSuffix);
        // Check if history begins with the same writ/petition phrase
        var suffixWords = suffixKey.split(/\s+/);
        if (suffixWords.length > 0) {
          var histPrefix = histClean.split(/\s+/).slice(0, suffixWords.length).join(" ");
          if (wlTextCompareKey(histPrefix) === suffixKey) {
            reviewReasons.push("history-duplicates-suffix");
          }
        }
      }
    }

    // 13. shortName
    var shortName = null;
    if (aShorts.length > 0 && primary) {
      shortName = wlCiteSelectShortName(aShorts, primary);
    }
    if (shortName !== null) {
      provenance.shortName = "service";
    }

    // 14. status
    // A category !== ok already returned early (metadata-only from DOM).
    // By this point, svcA.category === "ok".
    var status = "metadata-only";
    if (primary) {
      var bEnvelopeOk = true;
      if (svcB.category !== "ok") bEnvelopeOk = false;
      if (svcB.envelope && !svcB.envelope.ok) bEnvelopeOk = false;
      if (!wlRecHasDemotingReason(reviewReasons) && classification.confidence === "table" && bEnvelopeOk) {
        status = "validated-profile";
      } else {
        status = "unverified-profile";
      }
    }

    // 15. Build and return CaseRecord
    if (dom.author) provenance.author = "dom";
    return {
      guid: guid,
      url: url,
      caseName: caseName,
      author: dom.author || null,
      shortName: shortName,
      court: court,
      rawCourt: dom.rawCourt || "",
      date: date,
      dockets: dockets,
      primary: primary,
      alternates: alternates,
      history: history,
      parentheticalSuffix: parentheticalSuffix,
      wlPrimary: wlPrimary,
      profile: profile,
      status: status,
      reviewReasons: reviewReasons,
      provenance: provenance
    };
  } catch (e) {
    return {
      guid: guid,
      url: url,
      caseName: "",
      shortName: null,
      court: "",
      rawCourt: "",
      date: null,
      dockets: [],
      primary: null,
      alternates: [],
      history: "",
      parentheticalSuffix: "",
      wlPrimary: false,
      profile: "dom-only",
      status: "metadata-only",
      reviewReasons: ["reconcile-error"],
      provenance: provenance
    };
  }
}

/* ---- translator.js ---- */
var wlTrVersion = "0.3.2";
var wlTrBuild = "9ad6be6f331a02b6bb6251a3ca7feb06243dc0bad7dbd147bb9eda9658c2e0f4";

function wlTrDetectWeb(doc, url) {
  var readiness = wlDomInspectCaseReadiness(doc, url);
  if (readiness.isCase && readiness.capability === "service") {
    return "case";
  }
  if (readiness.isCase && readiness.capability === "dom-only") {
    return "case";
  }
  // Not a case or not ready — check if page is still loading
  var headerContainer = doc.querySelector("#co_docHeaderContainer");
  if (!headerContainer) {
    headerContainer = doc.querySelector("#co_document");
  }
  if (!headerContainer) {
    headerContainer = doc.querySelector("body");
  }
  if (headerContainer) {
    Zotero.monitorDOMChanges(headerContainer);
  }
  return false;
}

function wlTrReadService(result, req) {
  if (result.category !== "ok" || !result.json) {
    return { svc: { category: result.category, envelope: null }, echoReasons: [] };
  }
  var envelope = wlSvcReadEnvelope(result.json, req.styleIds, req.expect);
  var echoReasons = [];
  for (var i = 0; i < envelope.reviewReasons.length; i++) {
    if (envelope.reviewReasons[i].indexOf("echo-mismatch:") === 0) echoReasons.push(envelope.reviewReasons[i]);
  }
  if (echoReasons.length > 0) {
    return { svc: { category: "echo-mismatch", envelope: null }, echoReasons: echoReasons };
  }
  return { svc: { category: "ok", envelope: envelope }, echoReasons: [] };
}

async function wlTrDoWeb(doc, url) {
  // 1. Capture page context + DOM facts FIRST (frozen)
  var frozenContext = wlDomReadPageContext(doc, url);
  var frozenDom = wlDomReadFacts(doc);
  var frozenGuid = frozenContext.config && frozenContext.config.guid;
  var frozenHeaderName = frozenDom.headerName || "";
  await wlTrResolveAuthorPopup(doc, url, frozenDom, frozenGuid);

  // 2. Classify court + select profile
  var classification = wlProfClassifyCourt(frozenDom.rawCourt || "");
  var profile = wlProfSelectProfile(classification);

  // 3. Determine capability
  var readiness = wlDomInspectCaseReadiness(doc, url);
  var capability = readiness.capability || "dom-only";

  // 4. If service capability, build and fetch requests
  var svcA = { category: "none", envelope: null };
  var svcB = { category: "none", envelope: null };
  var identityChanged = false;
  var echoReasons = [];

  if (capability === "service" && frozenContext.secrets && frozenGuid) {
    var reqs = wlSvcBuildRequests(
      { guid: frozenGuid, relatedInfoHost: frozenContext.config.relatedInfoHost },
      frozenContext.secrets,
      profile
    );

    if (reqs.length > 0) {
      var results = await wlSvcFetchAll(reqs, {
        request: function(u, o) { return ZU.request(u, o); },
        setTimeout: setTimeout,
        clearTimeout: clearTimeout
      });

      // Read envelopes; an echoed format option that contradicts the request makes that envelope unusable
      if (results[0]) {
        var readA = wlTrReadService(results[0], reqs[0]);
        svcA = readA.svc;
        echoReasons = echoReasons.concat(readA.echoReasons);
      }
      if (results[1]) {
        var readB = wlTrReadService(results[1], reqs[1]);
        svcB = readB.svc;
        echoReasons = echoReasons.concat(readB.echoReasons);
      }

      // Re-read page context after requests — check GUID change
      var freshContext = wlDomReadPageContext(doc, url);
      var freshGuid = freshContext.config && freshContext.config.guid;
      if (freshGuid && frozenGuid && freshGuid !== frozenGuid) {
        identityChanged = true;
      }
    }
  }

  // 5. Reconcile
  var rec;
  if (identityChanged) {
    // Ignore service results, reconcile DOM-only
    rec = wlRecReconcile({
      context: { guid: frozenGuid, url: url },
      dom: frozenDom,
      svcA: { category: "identity-changed", envelope: null },
      svcB: { category: "identity-changed", envelope: null },
      profile: profile
    });
    rec.reviewReasons.push("identity-changed");
  } else {
    rec = wlRecReconcile({
      context: { guid: frozenGuid, url: url },
      dom: frozenDom,
      svcA: svcA,
      svcB: svcB,
      profile: profile
    });
  }

  if (!identityChanged) {
    for (var e = 0; e < echoReasons.length; e++) {
      if (rec.reviewReasons.indexOf(echoReasons[e]) === -1) rec.reviewReasons.push(echoReasons[e]);
    }
  }

  // 6. Map to Zotero fields
  var importRun = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  var fields = wlMapToZoteroFields(rec, { version: wlTrVersion, build: wlTrBuild, importRun: importRun });

  // 7. Reject unsafe values before they reach Zotero; retain bounded reason codes.
  var validation = wlMapValidateOutgoing(fields);
  if (!validation.ok) {
    for (var i = 0; i < validation.problems.length; i++) {
      var problem = validation.problems[i];
      var key = problem.split(":")[1];
      if (key === "caseName" || key === "itemType") throw new Error("Westlaw: invalid required metadata");
      if (key && key.indexOf("extra[") === 0) {
        var lines = fields.extra.split("\n");
        lines[Number(key.match(/\[(\d+)\]/)[1])] = "";
        fields.extra = lines.join("\n");
      } else if (key && key.indexOf("creators[") === 0) fields.creators = [];
      else if (key && key.indexOf("tags[") === 0) fields.tags = [];
      else if (key) fields[key] = "";
      else if (problem.indexOf("firstPage-") === 0) fields.firstPage = "";
      else if (problem.indexOf("shortTitle-") === 0) delete fields.shortTitle;
      else if (problem.indexOf("url-") === 0) delete fields.url;
      fields.extra += "\nWestlaw review: validation-" + problem;
    }
    fields.extra = fields.extra.replace("Westlaw status: validated-profile", "Westlaw status: unverified-profile");
    rec.status = "unverified-profile";
    if (!fields.tags.some(function(t) { return t.tag === "Westlaw: needs citation review"; })) fields.tags.push({ tag: "Westlaw: needs citation review" });
    if (!wlMapValidateOutgoing(fields).ok) throw new Error("Westlaw: invalid outgoing metadata");
  }

  // 8. Debug log (bounded codes only — no URLs, tokens, names, text)
  var aCategory = svcA.category || "none";
  var bCategory = svcB.category || "none";
  var recStatus = rec.status || "metadata-only";
  Zotero.debug("Westlaw US " + wlTrVersion + " build=" + wlTrBuild + " run=" + importRun + " profile=" + profile + " A=" + aCategory + " B=" + bCategory + " status=" + recStatus);

  // 9. Create and complete the item
  var item = new Zotero.Item("case");
  wlMapApply(fields, item);
  item.complete();
}

// Westlaw author popup is evidence only when opened from the exact majority byline.
async function wlTrResolveAuthorPopup(doc, url, dom, guid) {
  var partial = dom.author;
  if (!partial || partial.firstName || partial.fieldMode === 1) return;
  var lines = doc.querySelectorAll(".x_leadAuthorLine");
  var buttons = [];
  for (var i = 0; i < lines.length; i++) {
    if (wlDomAuthorSkipped(lines[i])) continue;
    var candidates = lines[i].querySelectorAll("button.co_linkBlue[data-href]");
    for (var j = 0; j < candidates.length; j++) {
      var button = candidates[j];
      var href = button.getAttribute("data-href") || "";
      if (wlDomClean(button.textContent).toLowerCase() === partial.lastName.toLowerCase() && /^(?:https:\/\/1\.next\.westlaw\.com)?\/Link\/Document\/FullText\?/.test(href) && typeof button.click === "function") buttons.push(button);
    }
  }
  if (buttons.length !== 1) return;
  // An already-open dialog has no proven relationship to this click. Leave it untouched.
  if (doc.querySelector("#popBox")) return;
  var opened = null;
  var failure = "author-popup-not-visible";
  try {
    buttons[0].click();
    for (var poll = 0; poll < 12; poll++) {
      var popup = doc.querySelector('#popBox[role="dialog"][aria-labelledby="co_infoBox_header"]');
      if (popup) {
        opened = popup;
        var header = popup.querySelector(".co_infoBox_message > h3#co_infoBox_header");
        var author = header && wlDomLinkedAuthor(header.textContent, partial);
        failure = !header ? "author-popup-heading-missing" : !author ? "author-popup-name-mismatch" : "author-popup-document-changed";
        var fresh = wlDomReadPageContext(doc, url);
        var freshTitle = doc.querySelector("#co_docHeaderTitleLine");
        var title = freshTitle && wlDomClean(freshTitle.getAttribute("title") || freshTitle.textContent).split(" | Cases")[0];
        if (author && (!guid || fresh.config.guid === guid) && title === dom.headerName) {
          dom.author = author;
          dom.reviewReasons = dom.reviewReasons.filter(function(r) { return r !== "author-name-incomplete"; });
          return;
        }
      }
      await new Promise(function(resolve) { setTimeout(resolve, 150); });
    }
    dom.reviewReasons.push(failure);
  } catch (e) {
    dom.reviewReasons.push("author-popup-unavailable");
  } finally {
    var close = opened && opened.querySelector(".co_infoBox_closeButton");
    if (close && typeof close.click === "function") {
      try { close.click(); } catch (e) { /* Name evidence remains valid; closing is cosmetic. */ }
    }
  }
}

// Zotero requires real function declarations (not var aliases) so its tooling
// greps for "function detectWeb" / "function doWeb" and finds them as globals.
function detectWeb(doc, url) { return wlTrDetectWeb(doc, url); }
async function doWeb(doc, url) { return wlTrDoWeb(doc, url); }

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/

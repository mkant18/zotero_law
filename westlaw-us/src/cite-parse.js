// Parenthetical with a full date: [<court> ]<Mon.> <D>, <YYYY>[, <suffix>]
// groups: 1 court (optional), 2 printed date token, 3 month, 4 day, 5 year, 6 suffix (optional, Texas writ/petition status)
var wlCiteDateParentheticalRe = /^(?:(.*?)\s+)?(((?:january|february|march|april|may|june|july|august|september|october|november|december|jan\.?|feb\.?|mar\.?|apr\.?|jun\.?|jul\.?|aug\.?|sep\.?|sept\.?|oct\.?|nov\.?|dec\.?))\.?\s+(\d{1,2}),?\s+(\d{4}))(?:,\s*(.+))?$/i;

// A real citation string is far shorter; longer input is rejected before anchor scanning
// (wlCiteFindAnchorsInText is superlinear when no known reporter is present).
var wlCiteMaxInputLength = 2000;

// Docket segment tokens (see wlCitePeelDockets): a number token may carry a short parenthetical such as "(L)" or "(JPO)".
var wlCiteDocketNumberToken = '[0-9][\\w\\-\\/:.]*(?:\\s*\\([A-Za-z0-9 .\\-]{1,20}\\))?';
var wlCiteDocketSegmentRe = /^Nos?\. [0-9A-Za-z](?:[\w\-\/:.&]|\s|\([A-Za-z0-9 .\-]{1,20}\))*$/;
var wlCiteBareDocketSegmentRe = new RegExp('^' + wlCiteDocketNumberToken + '(?:\\s+(?:and|&)\\s+' + wlCiteDocketNumberToken + ')*$');

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

// Full-date parenthetical, with or without a court and with an optional Texas status suffix; null if none.
function wlCiteParseParentheticalDate(content) {
  var dm = content.match(wlCiteDateParentheticalRe);
  if (!dm) return null;
  var dateStr = wlTextParseUSDate(dm[3] + ' ' + dm[4] + ', ' + dm[5]);
  return {
    court: (dm[1] || '').trim().replace(/,$/, ''),
    year: dm[5],
    date: dateStr,
    dateText: dm[2],
    dateSeparator: /,$/.test((dm[1] || "").trim()) ? ", " : " ",
    parentheticalSuffix: (dm[6] || '').trim()
  };
}

function wlCiteParseParentheticalStandard(content) {
  // Try full date form: [<court>] <Mon.> <D>, <YYYY>[, <status>]
  var dated = wlCiteParseParentheticalDate(content);
  if (dated) return dated;

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
  // Texas form with a full date: <court> <Mon.> <D>, <YYYY>[, <status>]
  var dated = wlCiteParseParentheticalDate(content);
  if (dated) return dated;
  // Texas form: <court> <year>[, <status>]
  var tm = content.match(/^(.*?)\s+(\d{4}),\s*(.*)$/);
  if (tm) {
    return { court: tm[1].trim(), year: tm[2], date: null, dateText: null, parentheticalSuffix: tm[3].trim() };
  }
  // <court> <year> without a status, or year only
  return wlCiteParseParentheticalStandard(content);
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
// text before the first citation anchor. Segments are split on ", " and keep their original text:
// "No. 1:21-cv-123 (JPO)" and "No. 21-1 (L), 21-2" keep their short parentheticals; "Nos. 22-1 & 22-2" stays
// one token; "Nos. 22-1, 22-2 and 22-3" becomes ["Nos. 22-1", "22-2 and 22-3"]. Bare numbers only count
// as dockets when a "No./Nos." segment precedes them; otherwise they stay in the name.
// docketInName is true when the remaining name still holds a ", No. " / ", Nos. " segment (an unrecognized docket).
function wlCitePeelDockets(beforeAnchor) {
  var rest = beforeAnchor.replace(/,\s*$/, '');
  var dockets = [];
  var pendingBare = [];
  while (true) {
    var lastComma = rest.lastIndexOf(', ');
    if (lastComma === -1) break;
    var lastSegment = rest.substring(lastComma + 2);
    if (wlCiteDocketSegmentRe.test(lastSegment)) {
      dockets = [lastSegment].concat(pendingBare, dockets);
      pendingBare = [];
      rest = rest.substring(0, lastComma);
    } else if (wlCiteBareDocketSegmentRe.test(lastSegment)) {
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
  return { name: rest, dockets: dockets, docketInName: /,\s*Nos?\.\s/.test(rest) };
}

// Pinpoint after the last citation of the main run, before the main parenthetical. A pin is only
// digits/star-digits/range followed by ", <next citation>", " (" or end -- NOT digits followed by more
// words (e.g. "2003 N.Y. Slip Op. 19972" is not a pin). Non-pin text between the last citation and the
// parenthetical is returned as an unparsed citation segment.
function wlCiteFindTrailingPin(cleaned, runEnd, searchFrom, lastRunIndex) {
  var found = { pin: null, pinAfter: null, pinAt: false, unparsedSegments: [] };
  var parenIdx = cleaned.indexOf('(', searchFrom);
  if (parenIdx === -1) return found;
  var textToParen = cleaned.substring(runEnd, parenIdx);
  var pinAfterMatch = textToParen.match(/(?:,\s*|at\s+)(\*\d+(?:-\d+)?|\d+(?:-\d+)?)(?=\s*(?:,|\(|$))/);
  if (pinAfterMatch) {
    found.pin = pinAfterMatch[1];
    found.pinAfter = lastRunIndex;
    found.pinAt = pinAfterMatch[0].charAt(0) === 'a';
  } else {
    var unparsedMatch = textToParen.match(/^(?:,\s*|at\s+)(.+)$/);
    if (unparsedMatch && unparsedMatch[1].trim().length > 0) {
      found.unparsedSegments.push(unparsedMatch[1].trim());
    }
  }
  return found;
}

// Text after the main ")" split into its separator and the history text. The separator is kept (historySep)
// so the round trip can recompose it: ", " for "), aff'd ..." and " " for ") (unpublished table decision)".
function wlCiteSplitHistory(afterParen) {
  var sepMatch = afterParen.match(/^(?:,\s*|\s+)/);
  var sep = sepMatch ? sepMatch[0] : '';
  var history = afterParen.substring(sep.length);
  return { history: history, historySep: history ? sep : '' };
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
  if (text.length > wlCiteMaxInputLength) return anchors;

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
  if (cleaned.length > wlCiteMaxInputLength) return { ok: false, reason: "input-too-long" };

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

  // Pin after the last anchor in the run (before the parenthetical), or an unparsed citation segment there.
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
  var historyParts = wlCiteSplitHistory(cleaned.substring(parenClose + 1));

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
  // A ", No. " segment left in the name is an unrecognized docket: never silent.
  if (peeled.docketInName) reviewReasons.push("docket-in-name");

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
    history: historyParts.history,
    historySep: historyParts.historySep,
    unparsedTail: "",
    reviewReasons: reviewReasons
  };
}

function wlCiteParseTexasForm(text) {
  var cleaned = wlTextClean(text);
  if (!cleaned) return { ok: false, reason: "empty-input" };
  if (cleaned.length > wlCiteMaxInputLength) return { ok: false, reason: "input-too-long" };

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

  // Pin after the last anchor in the run (same logic as the standard form)
  var unparsedSegments = [];
  if (pin === null) {
    var trailing = wlCiteFindTrailingPin(cleaned, runEnd, searchFrom, mainRun.length - 1);
    pin = trailing.pin;
    pinAfter = trailing.pinAfter;
    pinAt = trailing.pinAt;
    unparsedSegments = trailing.unparsedSegments;
  }

  var parenOpen = wlCiteFindDecisionParen(cleaned, searchFrom);
  if (parenOpen === -1) return { ok: false, reason: "no-parenthetical" };

  var parenClose = wlCiteFindMatchingParen(cleaned, parenOpen);
  if (parenClose === -1) return { ok: false, reason: "unbalanced-parens" };

  var parenContent = cleaned.substring(parenOpen + 1, parenClose);

  // Parse Texas parenthetical
  var parenParsed = wlCiteParseParentheticalTexas(parenContent);

  // History
  var historyParts = wlCiteSplitHistory(cleaned.substring(parenClose + 1));

  // Build citations
  var citations = [];
  for (var j = 0; j < mainRun.length; j++) {
    citations.push(wlCiteBuildCitation(mainRun[j]));
  }
  for (var u = 0; u < unparsedSegments.length; u++) {
    citations.push({ kind: "unparsed", raw: unparsedSegments[u] });
  }

  var reviewReasons = [];
  for (var k = 0; k < mainRun.length; k++) {
    if (mainRun[k].kind === "unparsed") {
      reviewReasons.push("unknown-reporter");
      break;
    }
  }
  if (unparsedSegments.length > 0 && reviewReasons.indexOf("unknown-reporter") === -1) {
    reviewReasons.push("unknown-reporter");
  }
  if (peeled.docketInName) reviewReasons.push("docket-in-name");

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
    history: historyParts.history,
    historySep: historyParts.historySep,
    unparsedTail: "",
    reviewReasons: reviewReasons
  };
}

function wlCiteParseWestlawInventory(text) {
  var cleaned = wlTextClean(text);
  if (!cleaned) return { ok: false, reason: "empty-input" };
  if (cleaned.length > wlCiteMaxInputLength) return { ok: false, reason: "input-too-long" };

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

  var parenOpen = wlCiteFindDecisionParen(cleaned, searchFrom);
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
  if (cleaned.length > wlCiteMaxInputLength) return null;

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
  if (parsed.history) recomposed += (typeof parsed.historySep === "string" ? parsed.historySep : ', ') + parsed.history;

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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlCiteParseStandardForm: wlCiteParseStandardForm,
    wlCiteParseTexasForm: wlCiteParseTexasForm,
    wlCiteParseWestlawInventory: wlCiteParseWestlawInventory,
    wlCiteParseShortName: wlCiteParseShortName,
    wlCiteSelectShortName: wlCiteSelectShortName,
    wlCiteRoundTrip: wlCiteRoundTrip,
    wlCiteFindMatchingParen: wlCiteFindMatchingParen,
    wlCiteParseParentheticalStandard: wlCiteParseParentheticalStandard,
    wlCiteParseParentheticalTexas: wlCiteParseParentheticalTexas,
    wlCiteBuildCitation: wlCiteBuildCitation,
    wlCiteFindAnchorsInText: wlCiteFindAnchorsInText
  };
}

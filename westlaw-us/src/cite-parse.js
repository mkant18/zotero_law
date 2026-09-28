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
    return { court: dm[1].trim().replace(/,$/, ''), year: dm[4], date: dateStr, parentheticalSuffix: '' };
  }

  // Try Texas form: <court> <year>, <status>
  var tm = content.match(/^(.*?)\s+(\d{4}),\s+(.+)$/);
  if (tm) {
    return { court: tm[1].trim(), year: tm[2], date: null, parentheticalSuffix: tm[3].trim() };
  }

  // Try standard form: <court> <year>
  var sm = content.match(/^(.*?)\s+(\d{4})$/);
  if (sm) {
    return { court: sm[1].trim(), year: sm[2], date: null, parentheticalSuffix: '' };
  }

  // Year only
  var ym = content.match(/^(\d{4})$/);
  if (ym) {
    return { court: '', year: ym[1], date: null, parentheticalSuffix: '' };
  }

  return { court: '', year: '', date: null, parentheticalSuffix: '' };
}

function wlCiteParseParentheticalTexas(content) {
  // Texas form: <court> <year>[, <status>]
  var tm = content.match(/^(.*?)\s+(\d{4}),\s*(.*)$/);
  if (tm) {
    return { court: tm[1].trim(), year: tm[2], date: null, parentheticalSuffix: tm[3].trim() };
  }
  // Year only
  var ym = content.match(/^(\d{4})$/);
  if (ym) {
    return { court: '', year: ym[1], date: null, parentheticalSuffix: '' };
  }
  return { court: '', year: '', date: null, parentheticalSuffix: '' };
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

  // Name = text before first anchor, minus trailing ", "
  // Also strip any docket region (", No. …" or ", Nos. …") from the end of the name.
  // A docket is the last comma-segment before the first anchor that matches
  // /^Nos?\. [0-9A-Za-z][\w\-\/:. ]*$/ (e.g., "No. 24-123").
  // Do NOT treat "No." inside a party name (not preceded by a comma as a separate segment) as a docket.
  var nameEnd = mainRun[0].index;
  var beforeName = cleaned.substring(0, nameEnd);
  // Strip trailing separator before first anchor, then peel off dockets from the end
  var nameCandidates = beforeName.replace(/,\s*$/, '');
  var dockets = [];
  var docketRe = /^(Nos?\. [0-9A-Za-z][\w\-\/:. ]*)$/;
  var changed = true;
  while (changed) {
    changed = false;
    var lastComma = nameCandidates.lastIndexOf(', ');
    if (lastComma === -1) break;
    var lastSegment = nameCandidates.substring(lastComma + 2);
    if (docketRe.test(lastSegment)) {
      dockets.unshift(lastSegment);
      nameCandidates = nameCandidates.substring(0, lastComma);
      changed = true;
    } else {
      break;
    }
  }
  var name = nameCandidates;

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
    var parenIdx = cleaned.indexOf('(', searchFrom);
    if (parenIdx !== -1) {
      var textToParen = cleaned.substring(runEnd, parenIdx);
      // Pin must be followed by ", " + next citation, " (" , or end — not by more words
      var pinAfterMatch = textToParen.match(/(?:,\s*|at\s+)(\*\d+(?:-\d+)?|\d+(?:-\d+)?)(?=\s*(?:,|\(|$))/);
      if (pinAfterMatch) {
        pin = pinAfterMatch[1];
      } else {
        // No valid pin found. Check for an unparsed citation segment between the last citation and the parenthetical.
        var unparsedMatch = textToParen.match(/^(?:,\s*|at\s+)(.+)$/);
        if (unparsedMatch && unparsedMatch[1].trim().length > 0) {
          unparsedSegments.push(unparsedMatch[1].trim());
        }
      }
    }
  }

  var parenOpen = cleaned.indexOf('(', searchFrom);
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
    court: parenParsed.court,
    year: parenParsed.year,
    date: parenParsed.date,
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

  // Name
  // Also strip any docket region from the end of the name (same logic as standard form).
  var nameEnd = mainRun[0].index;
  var beforeName = cleaned.substring(0, nameEnd);
  var nameCandidates = beforeName.replace(/,\s*$/, '');
  var dockets = [];
  var docketRe = /^(Nos?\. [0-9A-Za-z][\w\-\/:. ]*)$/;
  var changed = true;
  while (changed) {
    changed = false;
    var lastComma = nameCandidates.lastIndexOf(', ');
    if (lastComma === -1) break;
    var lastSegment = nameCandidates.substring(lastComma + 2);
    if (docketRe.test(lastSegment)) {
      dockets.unshift(lastSegment);
      nameCandidates = nameCandidates.substring(0, lastComma);
      changed = true;
    } else {
      break;
    }
  }
  var name = nameCandidates;

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
    court: parenParsed.court,
    year: parenParsed.year,
    date: parenParsed.date,
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
  var noMatch = beforeName.match(/(No\.|Nos\.)\s.*/);
  if (noMatch) {
    var docketsRegion = noMatch[0];
    var docketParts = docketsRegion.split(", ");
    for (var d = 0; d < docketParts.length; d++) {
      var part = docketParts[d].trim();
      if (part) dockets.push(part);
    }
  }

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
  if (dockets.length > 0 && docketsRegion.length > 0) {
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

  // Recompose: name, <citations joined ", "> [, at *pin] (<court> <year>[, suffix])[, history]
  var recomposed = '';

  // Name
  if (parsed.name) recomposed = parsed.name;

  // Citations
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
    }
    recomposed += ', ' + citeStrs.join(", ");
  }

  // Pin (locator)
  if (parsed.pin) recomposed += ', at ' + parsed.pin;

  // Parenthetical
  var parenParts = [];
  if (parsed.court) parenParts.push(parsed.court.replace(/,$/, ''));
  if (parsed.year) parenParts.push(parsed.year);
  if (parsed.parentheticalSuffix) parenParts.push(parsed.parentheticalSuffix);
  if (parenParts.length > 0) {
    // Texas form: (court year, suffix) - comma only before suffix
    var parenStr = '';
    if (parsed.parentheticalSuffix) {
      var prefixParts = parenParts.slice(0, -1);
      parenStr = prefixParts.join(' ') + ', ' + parenParts[parenParts.length - 1];
    } else {
      parenStr = parenParts.join(' ');
    }
    recomposed += ' (' + parenStr + ')';
  }

  // History
  if (parsed.history) recomposed += ', ' + parsed.history;

  // Normalize whitespace only
  var normalized = recomposed.replace(/\s+/g, " ").trim();

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

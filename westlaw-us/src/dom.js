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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlDomReadPageContext: wlDomReadPageContext,
    wlDomInspectCaseReadiness: wlDomInspectCaseReadiness,
    wlDomReadFacts: wlDomReadFacts
  };
}

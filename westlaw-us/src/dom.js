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

  config.guid = identityGUID;
  config.identityReason = identityReason;
  config.ambiguous = ambiguous;

  var ok = validGUIDs.length > 0 || identityGUID !== null;

  // Validate and resolve secrets
  var tokenPattern = /^[A-Za-z0-9._~+\/=:-]{8,512}$/;
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
    var rawTitle = wlDomClean(header.textContent);
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
  var listCourtKeys = [];
  var listDateSeen = [];
  for (var hl = 0; hl < headerLists.length; hl++) {
    listCiteKeys.push([]);
    listCourtKeys.push(null);
    listDateSeen.push(false);
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
    var liList = liListIndex[i];
    // Per-list court line (same rule as the global court pick below) so duplicate headers can be compared.
    if (classified.kind === "unparsed" && listCourtKeys[liList] === null && (!listDateSeen[liList] || wlDomCourtLineRe.test(liText))) {
      listCourtKeys[liList] = liText.toLowerCase();
    }
    if (classified.kind === "date") listDateSeen[liList] = true;
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

  // Two headers naming different courts are a conflict too, not first-wins.
  for (var ca = 0; ca < listCourtKeys.length; ca++) {
    for (var cb = ca + 1; cb < listCourtKeys.length; cb++) {
      if (listCourtKeys[ca] !== null && listCourtKeys[cb] !== null && listCourtKeys[ca] !== listCourtKeys[cb] &&
          reviewReasons.indexOf("conflicting-header") === -1) {
        reviewReasons.push("conflicting-header");
      }
    }
  }

  // Facts read without the header list (fallback selectors) are flagged so the record is visibly lower-trust.
  var usedHeaderFallback = false;

  if (!rawCourt) {
    var courtBlock = doc.querySelector(".co_courtBlock");
    if (courtBlock) {
      rawCourt = wlDomClean(courtBlock.textContent);
      if (headerLists.length === 0 && rawCourt) usedHeaderFallback = true;
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

  if (!citations.length) {
    var citesFallback = doc.querySelector(".co_cites");
    if (citesFallback) {
      var citesText = wlDomClean(citesFallback.textContent);
      var fallbackCits = wlRepFindCitations(citesText);
      for (var fc = 0; fc < fallbackCits.length; fc++) {
        citations.push(fallbackCits[fc]);
      }
      if (headerLists.length === 0 && fallbackCits.length > 0) usedHeaderFallback = true;
    }
  }

  if (usedHeaderFallback) reviewReasons.push("header-fallback");

  return {
    ok: true,
    guid: guid,
    contentType: (ctx.config && ctx.config.contentType) || null,
    headerName: headerName,
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
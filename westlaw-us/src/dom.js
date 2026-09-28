var wlDomWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
var wlDomPageCountRe = /^\(Approx\. \d+ pages?\)$/;
var wlDomGuidRe = /^I[0-9a-f]{32}$/;
var wlDomDocRe = /\/Document\/([^\/?#]+)/;
var wlDomLinkRe = /\/Link\//;

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
  var keyPattern = /"(DocumentGuid|ContentType|RelatedInfo)"\s*:\s*"([^"]*)"/g;

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

  return {
    ok: ok,
    config: config,
    secrets: null,
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
      if (hasCasesTitle && hasCaseDOM) {
        return { isCase: false, capability: null, reason: "non-case-content-type" };
      }
      return { isCase: false, capability: null, reason: "non-case-content-type" };
    }
    if (hasCasesTitle && hasCaseDOM) {
      return { isCase: true, capability: "service", reason: "content-type-cases" };
    }
    return { isCase: true, capability: "service", reason: "content-type-cases" };
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
  var lis = doc.querySelectorAll("#co_docHeaderCitation > li");
  var courtLineFound = false;
  var dateValues = [];

  for (var i = 0; i < lis.length; i++) {
    var liText = wlDomClean(lis[i].textContent);
    if (!liText) continue;
    if (seenLis[liText]) continue;
    seenLis[liText] = true;

    var classified = wlDomClassifyLI(liText);

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
      if (!courtLineFound && !date && !wlDomPageCountRe.test(liText) && wlRepFindCitations(liText).length === 0) {
        rawCourt = liText;
        courtLineFound = true;
      } else {
        citations.push({ kind: "unparsed", text: liText });
      }
    }
  }

  if (!rawCourt) {
    var courtBlock = doc.querySelector(".co_courtBlock");
    if (courtBlock) {
      rawCourt = wlDomClean(courtBlock.textContent);
    }
  }

  var docketBlock = doc.querySelector(".co_docketBlock");
  if (docketBlock) {
    var docketText = wlDomClean(docketBlock.textContent);
    docketText = docketText.replace(/\s*No\.?\s*/g, "No. ").replace(/\.$/, "");
    var docketParts = docketText.split(/;\s*/);
    for (var d = 0; d < docketParts.length; d++) {
      var dp = docketParts[d].trim();
      if (dp) {
        if (dp.indexOf("Nos.") === -1 && dp.indexOf("No.") === -1) {
          dp = "No. " + dp;
        }
        dockets.push(dp);
      }
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
    }
  }

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
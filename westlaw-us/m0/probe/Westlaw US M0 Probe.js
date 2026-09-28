/*
  ***** BEGIN LICENSE BLOCK *****

  Copyright © 2026 local M0 spike

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

// translatorID "b426c5b0-4383-4224-aeb4-1237b2a20479"
// label "Westlaw US (M0 probe)"
// creator "local M0 spike"
// target "^https://1\\.next\\.westlaw\\.com/"
// minVersion "5.0"
// maxVersion ""
// priority 100
// inRepository false
// translatorType 4
// browserSupport "gcsibv"
// lastUpdated "2026-09-28 09:00:00"

const M0 = {
  version: "m0-probe 0.0.1",
  timeoutMs: 8000,
  totalBudgetMs: 20000,
  maxBodyBytes: 2000000,
  maxRequests: 3,
  forceFatal: false
};

function cleanText(s) {
  return s
    .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function detectWeb(doc, url) {
  var host = doc.location.hostname || "";
  if (host !== "1.next.westlaw.com") {
    return false;
  }

  var header = doc.querySelector("#co_docHeaderTitleLine");
  if (!header) {
    var docEl = doc.querySelector("#co_document");
    if (docEl) {
      Zotero.monitorDOMChanges(docEl);
    }
    return false;
  }

  var headerText = cleanText(header.textContent);
  if (!headerText) {
    return false;
  }

  var ctx = readPageContext(doc, url);
  var contentType = ctx && ctx.config && ctx.config.contentType;

  if (contentType) {
    if (contentType !== "Cases") {
      return false;
    }
    return "case";
  }

  var parts = doc.title.split(" | ");
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === "Cases") {
      return "case";
    }
  }

  return false;
}

function readPageContext(doc, url) {
  var scripts = doc.querySelectorAll("script");
  var kv = {};
  var keyPattern = /"(DocumentGuid|ContentType|PageEventIdentifier|ResourceToken|RelatedInfo)"\s*:\s*"([^"]*)"/g;

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

  var config = {};
  var secrets = {};
  var ambiguous = false;

  var guidValues = kv["DocumentGuid"] || [];
  var contentTypeValues = kv["ContentType"] || [];
  var peiValues = kv["PageEventIdentifier"] || [];
  var rtValues = kv["ResourceToken"] || [];
  var riValues = kv["RelatedInfo"] || [];

  function validateGUID(v) {
    return /^I[0-9a-f]{32}$/.test(v);
  }

  function validateToken(v) {
    return /^[A-Za-z0-9._~+\/=:-]{8,512}$/.test(v);
  }

  function validateRelatedInfo(v) {
    return /^[A-Za-z0-9.-]{1,253}$/.test(v);
  }

  function validateContentType(v) {
    return v.length <= 64;
  }

  var validGUIDs = [];
  for (var g = 0; g < guidValues.length; g++) {
    if (validateGUID(guidValues[g])) {
      validGUIDs.push(guidValues[g]);
    }
  }

  if (contentTypeValues.length > 0) {
    var uniqCT = [];
    for (var c = 0; c < contentTypeValues.length; c++) {
      if (uniqCT.indexOf(contentTypeValues[c]) === -1) uniqCT.push(contentTypeValues[c]);
    }
    if (uniqCT.length > 1) {
      ambiguous = true;
    } else if (validateContentType(uniqCT[0])) {
      config.contentType = uniqCT[0];
    }
  }

  if (peiValues.length > 0) {
    var uniqPEI = [];
    for (var p = 0; p < peiValues.length; p++) {
      if (uniqPEI.indexOf(peiValues[p]) === -1) uniqPEI.push(peiValues[p]);
    }
    if (uniqPEI.length > 1) {
      ambiguous = true;
    } else if (validateToken(uniqPEI[0])) {
      config.pageEventIdentifier = uniqPEI[0];
      secrets.pageEventIdentifier = uniqPEI[0];
    }
  }

  if (rtValues.length > 0) {
    var uniqRT = [];
    for (var r = 0; r < rtValues.length; r++) {
      if (uniqRT.indexOf(rtValues[r]) === -1) uniqRT.push(rtValues[r]);
    }
    if (uniqRT.length > 1) {
      ambiguous = true;
    } else if (validateToken(uniqRT[0])) {
      config.resourceToken = uniqRT[0];
      secrets.resourceToken = uniqRT[0];
    }
  }

  if (riValues.length > 0) {
    var uniqRI = [];
    for (var ri = 0; ri < riValues.length; ri++) {
      if (uniqRI.indexOf(riValues[ri]) === -1) uniqRI.push(riValues[ri]);
    }
    if (uniqRI.length > 1) {
      ambiguous = true;
    } else if (validateRelatedInfo(uniqRI[0])) {
      config.relatedInfo = uniqRI[0];
    }
  }

  var urlGUID = null;
  var docMatch = url.match(/\/Document\/([^\/?#]+)/);
  if (docMatch) {
    var pathGUID = docMatch[1];
    if (validateGUID(pathGUID)) {
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

  return { config: config, secrets: secrets };
}

function buildRequests(ctx, capture) {
  var cfg = ctx.config;
  if (!cfg || !cfg.guid) return [];

  var base = "https://1.next.westlaw.com/RelatedInfo/v2/citestyles/" + cfg.guid + "?contextData=(sc.Default)";
  var secrets = ctx.secrets;
  var requests = [];

  var commonOpts = "&underline=false&bold=false&italicize=false&subStyle=LegalBriefs";

  var isTexasAppellate = false;
  if (capture && capture.headerTitle) {
    if (/Court of Appeals of Texas/i.test(capture.headerTitle) && !/United States/i.test(capture.headerTitle)) {
      isTexasAppellate = true;
    }
  }

  var styleIDs_A;
  if (isTexasAppellate) {
    styleIDs_A = "styleIDs=texas&styleIDs=standard";
  } else {
    styleIDs_A = "styleIDs=standard";
  }

  var urlA = base + "&" + styleIDs_A + commonOpts + "&history=true&parallelCiteRule=westReporterOnly";
  var aStyleId = isTexasAppellate ? "texas" : "standard";
  requests.push({
    letter: "A",
    url: urlA,
    styleId: aStyleId,
    headers: {
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "x-cobalt-exectype": "async",
      "x-cobalt-pcid": secrets.pageEventIdentifier || "",
      "x-cobalt-rtid": secrets.resourceToken || "",
      "x-cobalt-host": cfg.relatedInfo || ""
    }
  });

  var urlB = base + "&styleIDs=standard&styleIDs=westlaw" + commonOpts + "&history=false&parallelCiteRule=allReporter";
  requests.push({
    letter: "B",
    url: urlB,
    styleId: "westlaw",
    headers: {
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "x-cobalt-exectype": "async",
      "x-cobalt-pcid": secrets.pageEventIdentifier || "",
      "x-cobalt-rtid": secrets.resourceToken || "",
      "x-cobalt-host": cfg.relatedInfo || ""
    }
  });

  return requests;
}

function fetchForm(req) {
  var startTime = Date.now();

  if (!M0._budgetStart) {
    M0._budgetStart = startTime;
  }

  var elapsed = startTime - M0._budgetStart;
  if (elapsed >= M0.totalBudgetMs) {
    Zotero.debug("M0 " + req.letter + " timeout budget-exceeded status=none ms=0");
    return { category: "timeout", status: "none", contentType: "none", styleId: req.styleId || "", styles: "", forms: "", ms: 0 };
  }

  var remaining = M0.totalBudgetMs - elapsed;
  var timeoutMs = Math.min(M0.timeoutMs, remaining);

  var result = ZU.request(req.url, {
    headers: req.headers,
    responseType: "text",
    successCodes: false
  });

  var timer = null;
  var timedOut = false;

  var timeoutPromise = new Promise(function(_, reject) {
    timer = setTimeout(function() {
      timedOut = true;
      var err = new Error("timeout");
      err.name = "timeout";
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([result, timeoutPromise]).then(function(response) {
    if (timer) clearTimeout(timer);
    var ms = Date.now() - startTime;

    if (timedOut) {
      Zotero.debug("M0 " + req.letter + " timeout status=none ms=" + ms);
      return { category: "timeout", status: "none", contentType: "none", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }

    var status = response.status;
    var body = response.body || "";
    var rawContentType = (response.headers && (response.headers["content-type"] || "")) || "";

    if (status === 401 || status === 403) {
      Zotero.debug("M0 " + req.letter + " auth status=" + status + " ms=" + ms);
      return { category: "auth", status: status, contentType: "html", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }

    if (status >= 200 && status < 300) {
      if (rawContentType.indexOf("application/json") === -1 || body.indexOf("<") === 0) {
        Zotero.debug("M0 " + req.letter + " auth login-html status=" + status + " ms=" + ms);
        return { category: "auth", status: status, contentType: "html", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
      }
    }

    if (status === 404) {
      Zotero.debug("M0 " + req.letter + " not-found-html status=" + status + " ms=" + ms);
      return { category: "not-found-html", status: status, contentType: "html", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }

    if (status === 400) {
      Zotero.debug("M0 " + req.letter + " bad-request status=" + status + " ms=" + ms);
      return { category: "bad-request", status: status, contentType: "html", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
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
      Zotero.debug("M0 " + req.letter + " rate-limited status=" + status + " ms=" + ms);
      return { category: "rate-limited", status: status, contentType: "html", styleId: req.styleId || "", styles: "", forms: "", ms: ms, retryAfter: retryAfter };
    }

    if (status >= 500) {
      Zotero.debug("M0 " + req.letter + " server status=" + status + " ms=" + ms);
      return { category: "server", status: status, contentType: "html", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }

    if (body.length > M0.maxBodyBytes) {
      Zotero.debug("M0 " + req.letter + " oversized status=" + status + " ms=" + ms);
      return { category: "oversized", status: status, contentType: "other", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }

    var json;
    try {
      json = JSON.parse(body);
    } catch (e) {
      Zotero.debug("M0 " + req.letter + " malformed-json status=" + status + " ms=" + ms);
      return { category: "malformed-json", status: status, contentType: "other", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }

    if (!json || !Array.isArray(json.responses)) {
      Zotero.debug("M0 " + req.letter + " unexpected-envelope status=" + status + " ms=" + ms);
      return { category: "unexpected-envelope", status: status, contentType: "other", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }

    Zotero.debug("M0 " + req.letter + " ok status=" + status + " ms=" + ms);
    return { category: "ok", status: status, contentType: "json", styleId: req.styleId || "", styles: "", forms: "", ms: ms, json: json };
  }).catch(function(err) {
    if (timer) clearTimeout(timer);
    var ms = Date.now() - startTime;
    var errName = err && err.name ? err.name : "Error";
    if (errName === "timeout") {
      Zotero.debug("M0 " + req.letter + " timeout status=none ms=" + ms);
      return { category: "timeout", status: "none", contentType: "none", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
    }
    Zotero.debug("M0 " + req.letter + " network-or-origin status=none ms=" + ms);
    return { category: "network-or-origin", status: "none", contentType: "none", styleId: req.styleId || "", styles: "", forms: "", ms: ms };
  });
}

function summarizeEnvelope(json) {
  var results = [];
  for (var i = 0; i < json.responses.length; i++) {
    var resp = json.responses[i];
    var req = resp.request || {};
    var styleId = req.styleId || "";

    var keyNames = Object.keys(req);
    var specialValues = {};
    if (req.parallelCiteRule !== undefined) specialValues.parallelCiteRule = req.parallelCiteRule;
    if (req.subStyle !== undefined) specialValues.subStyle = req.subStyle;
    if (req.history !== undefined) specialValues.history = req.history;

    var forms = resp.forms || [];
    var formNames = [];
    var formCounts = {};
    var formHasPlain = {};
    var longText = null;

    for (var f = 0; f < forms.length; f++) {
      var form = forms[f];
      var fname = form.name || "unknown";
      if (!formCounts[fname]) {
        formCounts[fname] = 0;
        formNames.push(fname);
      }
      formCounts[fname]++;
      var hasPlain = !!(form.text && form.text["text/plain"]);
      formHasPlain[fname] = hasPlain;

      if (fname === "long" && (styleId === "standard" || styleId === "texas" || styleId === "westlaw")) {
        var plainText = (form.text && form.text["text/plain"]) || "";
        longText = cleanText(plainText).substring(0, 500);
      }
    }

    results.push({
      styleId: styleId,
      requestKeys: keyNames,
      specialValues: specialValues,
      formNames: formNames,
      formCounts: formCounts,
      formHasPlain: formHasPlain,
      longText: longText
    });
  }
  return results;
}

function extractStyleIdsFromUrl(url) {
  var match = url.match(/[?&]styleIDs=([^&]+)/g);
  if (!match) return "";
  var ids = [];
  for (var i = 0; i < match.length; i++) {
    var val = match[i].replace(/^[?&]styleIDs=/, "");
    ids.push(val);
  }
  return ids.join(",");
}

function extractFormsFromSummary(summary) {
  var names = [];
  for (var i = 0; i < summary.length; i++) {
    var formNames = summary[i].formNames || [];
    for (var j = 0; j < formNames.length; j++) {
      if (names.indexOf(formNames[j]) === -1) {
        names.push(formNames[j]);
      }
    }
  }
  return names.join(",");
}

async function doWeb(doc, url) {
  if (M0.forceFatal) {
    throw new Error("M0 forced fatal");
  }

  var frozenGUID = null;
  var frozenHeaderTitle = "";
  var frozenHeaderLis = [];
  var frozenDocket = "";
  var hasDocket = false;
  var ctx = null;
  var budgetStart = Date.now();
  M0._budgetStart = budgetStart;

  try {
    ctx = readPageContext(doc, url);
    if (ctx.config && ctx.config.guid) {
      frozenGUID = ctx.config.guid;
    }

    var header = doc.querySelector("#co_docHeaderTitleLine");
    if (header) {
      frozenHeaderTitle = cleanText(header.textContent);
    }

    var citationLis = doc.querySelectorAll("#co_docHeaderCitation > li");
    var seen = {};
    for (var i = 0; i < citationLis.length; i++) {
      var text = cleanText(citationLis[i].textContent);
      if (text && !seen[text]) {
        seen[text] = true;
        frozenHeaderLis.push(text);
      }
    }

    var docketEl = doc.querySelector(".co_docketBlock");
    if (docketEl) {
      frozenDocket = cleanText(docketEl.textContent);
      hasDocket = frozenDocket.length > 0;
    }
  } catch (e) {
    // capture errors are non-fatal
  }

  Zotero.debug("M0 v" + M0.version);

  var item = new Zotero.Item("case");
  var anyNonOk = false;
  var extraLines = [];
  extraLines.push("Westlaw translator: m0-probe 0.0.1");

  var resultA = null;
  var resultB = null;
  var aLongText = null;
  var bLongText = null;
  var aLongStyleId = null;
  var bLongStyleId = null;
  var retryAfter = null;
  var identityChanged = false;

  try {
    if (!ctx || !ctx.config || !ctx.config.guid || !ctx.secrets.pageEventIdentifier || !ctx.secrets.resourceToken) {
      extraLines.push("Westlaw M0 A: missing-config status=none ct=none styles=none forms=none ms=0");
      extraLines.push("Westlaw M0 B: skipped");
      anyNonOk = true;
    } else {
      var requests = buildRequests(ctx, { headerTitle: frozenHeaderTitle });
      var results = [];

      for (var ri = 0; ri < requests.length && ri < M0.maxRequests; ri++) {
        var req = requests[ri];
        if (results.length > 0 && results[0].category !== "ok") {
          break;
        }
        var result = await fetchForm(req);
        results.push(result);
      }

      resultA = results[0] || { category: "missing-config", status: "none", contentType: "none", styleId: "", styles: "", forms: "", ms: 0 };
      resultB = results[1] || null;

      // Re-check GUID after requests
      if (frozenGUID) {
        var currentDocMatch = doc.location.href.match(/\/Document\/([^\/?#]+)/);
        if (currentDocMatch) {
          var currentGUID = currentDocMatch[1];
          if (/^I[0-9a-f]{32}$/.test(currentGUID) && currentGUID !== frozenGUID) {
            identityChanged = true;
          }
        }
      }

      if (identityChanged) {
        resultA.category = "identity-changed";
        resultA.json = null;
        resultA.status = "none";
        resultA.contentType = "none";
        resultA.styles = "";
        resultA.forms = "";
        resultA.ms = 0;
        resultB = null;
        anyNonOk = true;
      } else {
        if (resultA.category !== "ok") {
          anyNonOk = true;
        }
        if (resultB && resultB.category !== "ok") {
          anyNonOk = true;
        }

        if (resultA.json) {
          var summary = summarizeEnvelope(resultA.json);
          resultA.styles = extractStyleIdsFromUrl(requests[0] ? requests[0].url : "");
          resultA.forms = extractFormsFromSummary(summary);
          for (var si = 0; si < summary.length; si++) {
            if (summary[si].longText && summary[si].styleId === resultA.styleId) {
              aLongText = summary[si].longText;
              aLongStyleId = summary[si].styleId;
            }
          }
          if (!aLongText) {
            aLongText = "none-matched";
            aLongStyleId = resultA.styleId || "";
          }
        }

        if (resultB && resultB.json) {
          var summaryB = summarizeEnvelope(resultB.json);
          resultB.styles = extractStyleIdsFromUrl(requests[1] ? requests[1].url : "");
          resultB.forms = extractFormsFromSummary(summaryB);
          for (var si2 = 0; si2 < summaryB.length; si2++) {
            if (summaryB[si2].longText && summaryB[si2].styleId === resultB.styleId) {
              bLongText = summaryB[si2].longText;
              bLongStyleId = summaryB[si2].styleId;
            }
          }
          if (!bLongText) {
            bLongText = "none-matched";
            bLongStyleId = resultB.styleId || "";
          }
        }

        if (resultA.retryAfter) {
          retryAfter = resultA.retryAfter;
        }
        if (resultB && resultB.retryAfter) {
          retryAfter = resultB.retryAfter;
        }
      }

      var aStyles = resultA.styles || extractStyleIdsFromUrl(requests[0] ? requests[0].url : "");
      var aForms = resultA.forms || "";
      var aStatus = resultA.status !== undefined ? resultA.status : "none";
      var aCt = resultA.contentType || "none";
      var aMs = resultA.ms || 0;

      extraLines.push("Westlaw M0 A: " + resultA.category + " status=" + aStatus + " ct=" + aCt + " styles=" + aStyles + " forms=" + aForms + " ms=" + aMs);

      if (resultB) {
        var bStyles = resultB.styles || extractStyleIdsFromUrl(requests[1] ? requests[1].url : "");
        var bForms = resultB.forms || "";
        var bStatus = resultB.status !== undefined ? resultB.status : "none";
        var bCt = resultB.contentType || "none";
        var bMs = resultB.ms || 0;
        extraLines.push("Westlaw M0 B: " + resultB.category + " status=" + bStatus + " ct=" + bCt + " styles=" + bStyles + " forms=" + bForms + " ms=" + bMs);
      } else {
        extraLines.push("Westlaw M0 B: skipped");
      }

      if (aLongText) {
        if (aLongText === "none-matched") {
          extraLines.push("Westlaw M0 A long: none-matched");
        } else {
          var aStyleId = aLongStyleId || resultA.styleId || "standard";
          extraLines.push("Westlaw M0 A long (" + aStyleId + "): " + aLongText);
        }
      }
      if (bLongText) {
        if (bLongText === "none-matched") {
          extraLines.push("Westlaw M0 B long: none-matched");
        } else {
          var bStyleId = bLongStyleId || (resultB ? (resultB.styleId || "westlaw") : "westlaw");
          extraLines.push("Westlaw M0 B long (" + bStyleId + "): " + bLongText);
        }
      }

      if (retryAfter) {
        extraLines.push("Westlaw M0 Retry-After: " + retryAfter);
      }

      extraLines.push("Westlaw M0 capture: header-li=" + frozenHeaderLis.length + " docket=" + (hasDocket ? "yes" : "no"));
    }
  } catch (e) {
    anyNonOk = true;
    extraLines.push("Westlaw M0 A: enrichment-error status=none ct=none styles=none forms=none ms=0");
    extraLines.push("Westlaw M0 B: skipped");
    extraLines.push("Westlaw M0 capture: header-li=" + frozenHeaderLis.length + " docket=" + (hasDocket ? "yes" : "no"));
  }

  item.caseName = frozenHeaderTitle || (function() {
    var parts = doc.title.split(" | ");
    return parts[0] || "";
  })();

  if (frozenGUID) {
    item.url = "https://1.next.westlaw.com/Document/" + frozenGUID + "/View/FullText.html";
  }

  for (var li = 0; li < frozenHeaderLis.length; li++) {
    var liText = frozenHeaderLis[li];
    var dateMatch = liText.match(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    if (dateMatch) {
      item.dateDecided = liText;
      break;
    }
  }

  item.attachments = [];
  item.creators = [];
  item.notes = [];

  var tags = ["Westlaw: M0 probe"];
  if (anyNonOk) {
    tags.push("Westlaw: needs citation review");
  }
  item.tags = tags;

  item.extra = extraLines.join("\n");

  item.complete();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { M0: M0, cleanText: cleanText, detectWeb: detectWeb, doWeb: doWeb, readPageContext: readPageContext, buildRequests: buildRequests, fetchForm: fetchForm, summarizeEnvelope: summarizeEnvelope, extractFormsFromSummary: extractFormsFromSummary };
}

var testCases = [];

var wlTrVersion = "0.1.0";

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

var wlTrCodeReasonRe = /^[A-Za-z0-9:_-]{1,120}$/;
var wlTrPageReasonRe = /^[a-z0-9:-]+$/;
var wlTrHtmlTagRe = /<[^>]*>/g;
var wlTrScalarFieldKeys = [
  "caseName", "court", "dateDecided", "docketNumber",
  "reporter", "reporterVolume", "firstPage", "history", "shortTitle", "url"
];

// Adds code-only reasons once each; any demoting reason moves a validated record to unverified.
function wlTrAddReasons(rec, reasons) {
  for (var i = 0; i < reasons.length; i++) {
    if (rec.reviewReasons.indexOf(reasons[i]) === -1) rec.reviewReasons.push(reasons[i]);
  }
  if (rec.status === "validated-profile" && wlMapHasDemotingReason(rec.reviewReasons)) {
    rec.status = "unverified-profile";
  }
}

// Reasons are written verbatim into Extra, so anything that is not a short code is replaced by a fixed code.
function wlTrCodeOnlyReasons(rec) {
  var safe = [];
  var unsafe = false;
  for (var i = 0; i < rec.reviewReasons.length; i++) {
    var reason = rec.reviewReasons[i];
    if (typeof reason === "string" && wlTrCodeReasonRe.test(reason)) {
      if (safe.indexOf(reason) === -1) safe.push(reason);
    } else {
      unsafe = true;
    }
  }
  if (unsafe && safe.indexOf("unsafe-reason") === -1) safe.push("unsafe-reason");
  rec.reviewReasons = safe;
}

// Validation problem strings look like "html:caseName", "token-leak:extra[3]" or "shortTitle-has-cite".
function wlTrProblemCode(problem) {
  return problem.split(":")[0];
}

function wlTrSanitizeFields(fields, problems) {
  var dropExtraIndexes = {};
  var leakedKeys = {};
  for (var i = 0; i < problems.length; i++) {
    var problem = problems[i];
    var lineMatch = problem.match(/^(?:token-leak|html|watermark|value-too-long):extra\[(\d+)\]$/);
    if (lineMatch) dropExtraIndexes[lineMatch[1]] = true;
    var keyMatch = problem.match(/^token-leak:([A-Za-z]+)$/);
    if (keyMatch) leakedKeys[keyMatch[1]] = true;
    // Optional fields that caused problems are dropped rather than aborting the item
    if (problem.indexOf("history") !== -1 && fields.history) fields.history = "";
    if (problem.indexOf("shortTitle") !== -1 && fields.shortTitle) delete fields.shortTitle;
    if (problem.indexOf("url") !== -1 && fields.url) delete fields.url;
  }
  for (var k = 0; k < wlTrScalarFieldKeys.length; k++) {
    var key = wlTrScalarFieldKeys[k];
    if (typeof fields[key] !== "string") continue;
    if (leakedKeys[key]) {
      fields[key] = "";
      continue;
    }
    fields[key] = fields[key].replace(wlTrHtmlTagRe, "").replace(/\s{2,}/g, " ").trim();
  }
  if (typeof fields.extra === "string") {
    var kept = [];
    var lines = fields.extra.split("\n");
    for (var n = 0; n < lines.length; n++) {
      if (!dropExtraIndexes[String(n)]) kept.push(lines[n]);
    }
    fields.extra = kept.join("\n");
  }
}

async function wlTrDoWeb(doc, url) {
  // 1. Capture page context + DOM facts FIRST (frozen)
  var frozenContext = wlDomReadPageContext(doc, url);
  var frozenDom = wlDomReadFacts(doc);
  var frozenGuid = frozenContext.config && frozenContext.config.guid;
  var frozenHeaderName = frozenDom.headerName || "";

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
    wlTrAddReasons(rec, echoReasons);
  }

  // Page-context causes (ambiguous-config, missing-config, ...) explain why the service was skipped
  var pageReasons = [];
  var contextReasons = frozenContext.reviewReasons || [];
  for (var e = 0; e < contextReasons.length; e++) {
    if (typeof contextReasons[e] === "string" && wlTrPageReasonRe.test(contextReasons[e])) pageReasons.push(contextReasons[e]);
  }
  wlTrAddReasons(rec, pageReasons);
  wlTrCodeOnlyReasons(rec);

  // 6. Map to Zotero fields; outgoing validation problems become demoting reasons BEFORE the final
  // status/tag are computed, so a record that fails validation is never validated-profile and always tagged
  var fields = wlMapToZoteroFields(rec, { version: wlTrVersion });
  var validation = wlMapValidateOutgoing(fields);
  for (var pass = 0; pass < 3 && !validation.ok; pass++) {
    var validationReasons = [];
    for (var v = 0; v < validation.problems.length; v++) {
      validationReasons.push("validation-" + wlTrProblemCode(validation.problems[v]));
    }
    var before = rec.reviewReasons.length;
    wlTrAddReasons(rec, validationReasons);
    if (rec.reviewReasons.length === before && pass > 0) break;
    fields = wlMapToZoteroFields(rec, { version: wlTrVersion });
    validation = wlMapValidateOutgoing(fields);
  }

  // 7. Drop or sanitize whatever validation flagged (offending Extra lines, HTML, optional fields)
  if (!validation.ok) {
    wlTrSanitizeFields(fields, validation.problems);
  }

  // 8. Debug log (bounded codes only — no URLs, tokens, names, text)
  var aCategory = svcA.category || "none";
  var bCategory = svcB.category || "none";
  var recStatus = rec.status || "metadata-only";
  Zotero.debug("Westlaw US " + wlTrVersion + " profile=" + profile + " A=" + aCategory + " B=" + bCategory + " status=" + recStatus);

  // 9. Create and complete the item
  var item = new Zotero.Item("case");
  wlMapApply(fields, item);
  item.complete();
}

// Zotero requires real function declarations (not var aliases) so its tooling
// greps for "function detectWeb" / "function doWeb" and finds them as globals.
function detectWeb(doc, url) { return wlTrDetectWeb(doc, url); }
async function doWeb(doc, url) { return wlTrDoWeb(doc, url); }

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlTrVersion: wlTrVersion,
    wlTrDetectWeb: wlTrDetectWeb,
    wlTrDoWeb: wlTrDoWeb,
    detectWeb: detectWeb,
    doWeb: doWeb
  };
}

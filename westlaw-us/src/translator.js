var wlTrVersion = "0.3.5";
var wlTrBuild = "source-unbuilt";

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
  var deadline = Date.now() + wlSvcLimits.totalMs;
  // 1. Capture page context + DOM facts FIRST (frozen)
  var frozenContext = wlDomReadPageContext(doc, url);
  var frozenDom = wlDomReadFacts(doc);
  var frozenGuid = frozenContext.config && frozenContext.config.guid;

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

  if (!identityChanged && ["auth", "rate-limited", "timeout", "network-or-origin"].indexOf(svcA.category) === -1) {
    await wlTrResolveAuthor(doc, url, frozenDom, frozenContext, deadline);
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

async function wlTrFetchAuthorJSON(url, headers, deadline) {
  var remaining = Math.min(wlSvcLimits.timeoutMs, deadline - Date.now());
  if (remaining <= 0) return { ok: false, reason: "timeout" };
  var timer;
  var timedOut = false;
  try {
    var response = await Promise.race([
      ZU.request(url, { headers: headers, responseType: "text", successCodes: false }),
      new Promise(function(_, reject) { timer = setTimeout(function() { timedOut = true; reject(new Error("timeout")); }, remaining); })
    ]);
    if (response.status === 401 || response.status === 403) return { ok: false, reason: "auth" };
    if (response.status === 429) return { ok: false, reason: "rate-limited" };
    if (response.status < 200 || response.status >= 300) return { ok: false, reason: "http" };
    if (typeof response.body !== "string" || response.body.length > wlSvcLimits.maxBodyBytes) return { ok: false, reason: "oversized" };
    if (!response.headers || !/application\/json/i.test(response.headers["content-type"] || "")) return { ok: false, reason: "unexpected-response" };
    try { return { ok: true, json: JSON.parse(response.body) }; }
    catch (_) { return { ok: false, reason: "malformed-json" }; }
  } catch (_) {
    return { ok: false, reason: timedOut ? "timeout" : "network" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function wlTrResolveAuthor(doc, url, dom, context, deadline) {
  var partial = dom.author;
  if (!partial || partial.firstName || partial.fieldMode === 1) return;
  var lines = doc.querySelectorAll(".x_leadAuthorLine");
  var links = [];
  for (var i = 0; i < lines.length; i++) {
    if (wlDomAuthorSkipped(lines[i])) continue;
    var candidates = lines[i].querySelectorAll("button[data-href], a[href]");
    for (var j = 0; j < candidates.length; j++) {
      var candidate = candidates[j];
      if (wlDomClean(candidate.textContent).toLowerCase() !== partial.lastName.toLowerCase()) continue;
      try {
        var linked = new URL(candidate.getAttribute("data-href") || candidate.getAttribute("href"), "https://1.next.westlaw.com");
        if (linked.origin !== "https://1.next.westlaw.com" || linked.pathname !== "/Link/Document/FullText" || linked.username || linked.password || linked.hash) continue;
        var params = linked.searchParams;
        if (params.getAll("findType").length !== 1 || params.get("findType") !== "h" || params.getAll("pubNum").length !== 1 || !/^\d{1,8}$/.test(params.get("pubNum") || "") || params.getAll("cite").length !== 1 || !/^\d{10}$/.test(params.get("cite") || "")) continue;
        var lookup = "https://1.next.westlaw.com/Document/GetProfileSummary?findType=h&pubNum=" + params.get("pubNum") + "&cite=" + params.get("cite") + "&refType=RQ";
        if (links.indexOf(lookup) === -1) links.push(lookup);
      } catch (_) { /* Untrusted links cannot supply a profile. */ }
    }
  }
  if (links.length !== 1) return;
  if (!context.secrets || context.ambiguous || !context.config.guid || !context.config.searchHost) {
    dom.reviewReasons.push("author-profile-context-unavailable");
    return;
  }
  var headers = { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest", "x-cobalt-exectype": "async", "x-cobalt-pcid": context.secrets.pageEventId, "x-cobalt-rtid": context.secrets.resourceToken };
  var mapped = await wlTrFetchAuthorJSON(links[0], headers, deadline);
  if (!mapped.ok) { dom.reviewReasons.push("author-profile-" + mapped.reason); return; }
  var guid = mapped.json && mapped.json.docGuid;
  if (typeof guid !== "string" || !/^I[0-9a-f]{32}$/i.test(guid)) { dom.reviewReasons.push("author-profile-identity-mismatch"); return; }
  headers["x-cobalt-host"] = context.config.searchHost;
  var snapshot = await wlTrFetchAuthorJSON("https://1.next.westlaw.com/Search/v1/snapshot/guid?guid=" + encodeURIComponent(guid) + "&indexType=person", headers, deadline);
  if (!snapshot.ok) { dom.reviewReasons.push("author-profile-" + snapshot.reason); return; }
  var author = wlDomReadJudgeProfile(snapshot.json, partial, guid);
  if (!author) { dom.reviewReasons.push("author-profile-identity-mismatch"); return; }
  var fresh = wlDomReadPageContext(doc, url);
  var header = doc.querySelector("#co_docHeaderTitleLine");
  var title = header && wlDomClean(header.getAttribute("title") || header.textContent).split(" | Cases")[0];
  if (fresh.config.guid !== context.config.guid || title !== dom.headerName) { dom.reviewReasons.push("author-profile-document-changed"); return; }
  dom.author = author;
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

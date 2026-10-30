var wlTrVersion = "0.3.2";
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlTrVersion: wlTrVersion,
    wlTrDetectWeb: wlTrDetectWeb,
    wlTrDoWeb: wlTrDoWeb,
    detectWeb: detectWeb,
    doWeb: doWeb
  };
}

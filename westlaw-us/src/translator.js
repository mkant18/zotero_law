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

      // Read envelopes
      if (results[0]) {
        if (results[0].category === "ok" && results[0].json) {
          svcA = { category: "ok", envelope: wlSvcReadEnvelope(results[0].json, profile === "texas" ? ["texas", "standard"] : ["standard"]) };
        } else {
          svcA = { category: results[0].category, envelope: null };
        }
      }
      if (results[1]) {
        if (results[1].category === "ok" && results[1].json) {
          svcB = { category: "ok", envelope: wlSvcReadEnvelope(results[1].json, ["standard", "westlaw"]) };
        } else {
          svcB = { category: results[1].category, envelope: null };
        }
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

  // 6. Map to Zotero fields
  var fields = wlMapToZoteroFields(rec, { version: wlTrVersion });

  // 7. Validate outgoing — drop offending optional fields rather than aborting
  var validation = wlMapValidateOutgoing(fields);
  if (!validation.ok) {
    for (var i = 0; i < validation.problems.length; i++) {
      var problem = validation.problems[i];
      var code = problem.split(":")[0];
      // Drop optional fields that caused validation problems
      if (problem.indexOf("history") !== -1 && fields.history) {
        fields.history = "";
      }
      if (problem.indexOf("shortTitle") !== -1 && fields.shortTitle) {
        delete fields.shortTitle;
      }
      if (problem.indexOf("url") !== -1 && fields.url) {
        delete fields.url;
      }
      // Add review line for validation issues
      var extraLines = fields.extra.split("\n");
      extraLines.push("Westlaw review: validation-" + code);
      fields.extra = extraLines.join("\n");
    }
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

// Zotero requires these unprefixed entry points
var detectWeb = wlTrDetectWeb;
var doWeb = wlTrDoWeb;

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlTrVersion: wlTrVersion,
    wlTrDetectWeb: wlTrDetectWeb,
    wlTrDoWeb: wlTrDoWeb,
    detectWeb: detectWeb,
    doWeb: doWeb
  };
}

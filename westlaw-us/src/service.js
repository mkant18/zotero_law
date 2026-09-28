var wlSvcWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
var wlSvcNbspRe = /\u00A0/g;
var wlSvcSpaceCollapseRe = /\s+/g;

var wlSvcRecipes = {
  citationFormA: "westReporterOnly",
  citationFormB: "allReporter"
};

var wlSvcLimits = {
  timeoutMs: 8000,
  totalMs: 20000,
  maxBodyBytes: 2000000,
  maxRequests: 3
};

function wlSvcClean(s) {
  if (s == null) return "";
  return s
    .replace(wlSvcWatermarkRe, "")
    .replace(wlSvcNbspRe, " ")
    .replace(wlSvcSpaceCollapseRe, " ")
    .trim()
    .normalize("NFC");
}

function wlSvcBuildRequests(config, secrets, profile) {
  if (!config || !config.guid || !config.relatedInfoHost) return [];
  if (!secrets || !secrets.pageEventId || !secrets.resourceToken) return [];
  if (!/^I[0-9a-f]{32}$/.test(config.guid)) return [];

  var base = "https://1.next.westlaw.com/RelatedInfo/v2/citestyles/" + config.guid;
  var commonOpts = "contextData=(sc.Default)&underline=false&bold=false&italicize=false&subStyle=LegalBriefs";

  var styleIdsA = profile === "texas" ? ["texas", "standard"] : ["standard"];

  var urlA = base + "?styleIDs=" + styleIdsA[0] + "&" + commonOpts + "&history=true&parallelCiteRule=" + wlSvcRecipes.citationFormA;
  if (styleIdsA.length > 1) {
    urlA += "&styleIDs=" + styleIdsA[1];
  }

  var urlB = base + "?styleIDs=standard&styleIDs=westlaw&" + commonOpts + "&history=false&parallelCiteRule=" + wlSvcRecipes.citationFormB;

  var headers = {
    "X-Requested-With": "XMLHttpRequest",
    "x-cobalt-exectype": "async",
    "x-cobalt-pcid": secrets.pageEventId,
    "x-cobalt-rtid": secrets.resourceToken,
    "x-cobalt-host": config.relatedInfoHost
  };

  return [
    { label: "A", url: urlA, headers: headers, styleIds: styleIdsA },
    { label: "B", url: urlB, headers: headers, styleIds: ["standard", "westlaw"] }
  ];
}

function wlSvcFetch(req, deps) {
  var startTime = Date.now();
  var timeoutMs = (deps && deps.timeoutMs) || wlSvcLimits.timeoutMs;
  var timer = null;
  var timedOut = false;

  var timeoutFn = (deps && deps.setTimeout) || setTimeout;
  var clearTimeoutFn = (deps && deps.clearTimeout) || clearTimeout;

  var timeoutPromise = new Promise(function(_, reject) {
    timer = timeoutFn(function() {
      timedOut = true;
      var err = new Error("timeout");
      err.name = "timeout";
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([
    deps.request(req.url, { headers: req.headers, responseType: "text", successCodes: false }),
    timeoutPromise
  ]).then(function(response) {
    if (timer) clearTimeoutFn(timer);
    var ms = Date.now() - startTime;

    if (timedOut) {
      return { label: req.label, category: "timeout", status: "none", ms: ms };
    }

    var status = response.status;
    var body = response.body || "";
    var rawContentType = (response.headers && (response.headers["content-type"] || "")) || "";

    if (status === 401 || status === 403) {
      return { label: req.label, category: "auth", status: status, ms: ms };
    }

    if (status >= 200 && status < 300) {
      if (rawContentType.indexOf("application/json") === -1 || body.indexOf("<") === 0) {
        return { label: req.label, category: "auth", status: status, ms: ms };
      }
    }

    if (status === 404) {
      return { label: req.label, category: "not-found-html", status: status, ms: ms };
    }

    if (status === 400) {
      return { label: req.label, category: "bad-request", status: status, ms: ms };
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
      return { label: req.label, category: "rate-limited", status: status, ms: ms, retryAfter: retryAfter };
    }

    if (status >= 500) {
      return { label: req.label, category: "server", status: status, ms: ms };
    }

    if (body.length > wlSvcLimits.maxBodyBytes) {
      return { label: req.label, category: "oversized", status: status, ms: ms };
    }

    var json;
    try {
      json = JSON.parse(body);
    } catch (e) {
      return { label: req.label, category: "malformed-json", status: status, ms: ms };
    }

    if (!json || !Array.isArray(json.responses)) {
      return { label: req.label, category: "unexpected-envelope", status: status, ms: ms };
    }

    return { label: req.label, category: "ok", status: status, ms: ms, json: json };
  }).catch(function(err) {
    if (timer) clearTimeoutFn(timer);
    var ms = Date.now() - startTime;
    var errName = err && err.name ? err.name : "Error";
    if (errName === "timeout") {
      return { label: req.label, category: "timeout", status: "none", ms: ms };
    }
    return { label: req.label, category: "network-or-origin", status: "none", ms: ms };
  });
}

async function wlSvcFetchAll(requests, deps) {
  var startTime = Date.now();
  var results = [];
  var budgetMs = wlSvcLimits.totalMs;
  var maxRequests = wlSvcLimits.maxRequests;

  for (var i = 0; i < requests.length && i < maxRequests; i++) {
    var req = requests[i];

    var elapsed = Date.now() - startTime;
    if (elapsed >= budgetMs) {
      results.push({ label: req.label, category: "timeout", status: "none", ms: 0 });
      continue;
    }

    if (results.length > 0) {
      var prevResult = results[results.length - 1];
      if (prevResult.label === "A" &&
          (prevResult.category === "auth" ||
           prevResult.category === "rate-limited" ||
           prevResult.category === "timeout" ||
           prevResult.category === "network-or-origin")) {
        results.push({ label: req.label, category: "skipped", status: "none", ms: 0 });
        continue;
      }
    }

    var remaining = budgetMs - (Date.now() - startTime);
    var adjustedDeps = {
      request: deps.request,
      setTimeout: deps.setTimeout,
      clearTimeout: deps.clearTimeout,
      timeoutMs: Math.min(wlSvcLimits.timeoutMs, Math.max(1, remaining))
    };

    var result = await wlSvcFetch(req, adjustedDeps);
    results.push(result);
  }

  return results;
}

function wlSvcReadEnvelope(json, wantedStyleIds) {
  var reviewReasons = [];
  var styles = {};
  var seenStyleIds = {};

  var responses = json.responses || [];
  for (var i = 0; i < responses.length; i++) {
    var resp = responses[i];
    var req = resp.request || {};
    var styleId = req.styleId || "";

    if (seenStyleIds[styleId]) {
      reviewReasons.push("duplicate-style:" + styleId);
      continue;
    }
    seenStyleIds[styleId] = true;

    if (wantedStyleIds.indexOf(styleId) === -1) {
      continue;
    }

    var forms = resp.forms || [];
    var longText = null;
    var shorts = [];
    var enhanced = null;

    for (var f = 0; f < forms.length; f++) {
      var form = forms[f];
      var fname = form.name || "unknown";

      if (fname === "long") {
        var plainText = (form.text && form.text["text/plain"]) || "";
        longText = wlSvcClean(plainText);
      } else if (fname === "short") {
        var shortText = (form.text && form.text["text/plain"]) || "";
        shorts.push(wlSvcClean(shortText));
      } else if (fname === "enhanced") {
        var enhText = (form.text && form.text["text/plain"]) || "";
        enhanced = wlSvcClean(enhText);
      }
    }

    styles[styleId] = {
      long: longText,
      shorts: shorts,
      id: styleId,
      enhanced: enhanced
    };
  }

  for (var w = 0; w < wantedStyleIds.length; w++) {
    if (!styles[wantedStyleIds[w]]) {
      reviewReasons.push("missing-style:" + wantedStyleIds[w]);
    }
  }

  return {
    ok: reviewReasons.length === 0,
    styles: styles,
    reviewReasons: reviewReasons
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlSvcBuildRequests: wlSvcBuildRequests,
    wlSvcFetch: wlSvcFetch,
    wlSvcFetchAll: wlSvcFetchAll,
    wlSvcReadEnvelope: wlSvcReadEnvelope
  };
}

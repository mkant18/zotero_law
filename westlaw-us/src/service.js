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
  if (typeof s !== "string") return "";
  return s
    .replace(wlSvcWatermarkRe, "")
    .replace(wlSvcNbspRe, " ")
    .replace(wlSvcSpaceCollapseRe, " ")
    .trim()
    .normalize("NFC");
}

// Fixed format options sent on every request; also the echo-check expectations.
var wlSvcFixedOptions = {
  underline: "false",
  bold: "false",
  italicize: "false",
  subStyle: "LegalBriefs"
};

// One source of truth for a request's format options: the URL query and `expect` both derive from it.
function wlSvcFormatOptions(history, parallelCiteRule) {
  return {
    history: history,
    parallelCiteRule: parallelCiteRule,
    subStyle: wlSvcFixedOptions.subStyle,
    underline: wlSvcFixedOptions.underline,
    bold: wlSvcFixedOptions.bold,
    italicize: wlSvcFixedOptions.italicize
  };
}

function wlSvcFormatQuery(o) {
  return "contextData=(sc.Default)&underline=" + o.underline + "&bold=" + o.bold + "&italicize=" + o.italicize +
    "&subStyle=" + o.subStyle + "&history=" + o.history + "&parallelCiteRule=" + o.parallelCiteRule;
}

function wlSvcBuildRequests(config, secrets, profile) {
  if (!config || !config.guid || !config.relatedInfoHost) return [];
  if (!secrets || !secrets.pageEventId || !secrets.resourceToken) return [];
  if (!/^I[0-9a-f]{32}$/.test(config.guid)) return [];

  var base = "https://1.next.westlaw.com/RelatedInfo/v2/citestyles/" + config.guid;
  var optsA = wlSvcFormatOptions("true", wlSvcRecipes.citationFormA);
  var optsB = wlSvcFormatOptions("false", wlSvcRecipes.citationFormB);

  var styleIdsA = profile === "texas" ? ["texas", "standard"] : ["standard"];

  var urlA = base + "?styleIDs=" + styleIdsA[0] + "&" + wlSvcFormatQuery(optsA);
  if (styleIdsA.length > 1) {
    urlA += "&styleIDs=" + styleIdsA[1];
  }

  var urlB = base + "?styleIDs=standard&styleIDs=westlaw&" + wlSvcFormatQuery(optsB);

  var headers = {
    "X-Requested-With": "XMLHttpRequest",
    "x-cobalt-exectype": "async",
    "x-cobalt-pcid": secrets.pageEventId,
    "x-cobalt-rtid": secrets.resourceToken,
    "x-cobalt-host": config.relatedInfoHost
  };

  return [
    { label: "A", url: urlA, headers: headers, styleIds: styleIdsA, expect: optsA },
    { label: "B", url: urlB, headers: headers, styleIds: ["standard", "westlaw"], expect: optsB }
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

function wlSvcIsObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function wlSvcNormalizeEcho(v) {
  return String(v).trim().toLowerCase();
}

// Returns the first `expect` key whose echoed value is present and differs, or "" if none.
// Absent (undefined/null) echo keys are not failures: the live envelope may not echo them.
function wlSvcFindEchoMismatch(echoedRequest, expect) {
  if (!wlSvcIsObject(expect)) return "";
  for (var key in expect) {
    if (!Object.prototype.hasOwnProperty.call(expect, key)) continue;
    if (!Object.prototype.hasOwnProperty.call(echoedRequest, key)) continue;
    var echoed = echoedRequest[key];
    if (echoed === undefined || echoed === null) continue;
    if (wlSvcNormalizeEcho(echoed) !== wlSvcNormalizeEcho(expect[key])) return key;
  }
  return "";
}

function wlSvcFormText(form) {
  if (wlSvcIsObject(form.text)) {
    var plain = form.text["text/plain"];
    if (typeof plain === "string") return wlSvcClean(plain);
  }
  if (Array.isArray(form.cites)) {
    for (var i = 0; i < form.cites.length; i++) {
      var cite = form.cites[i];
      if (wlSvcIsObject(cite) && cite.type === "text/plain" && typeof cite.value === "string") return wlSvcClean(cite.value);
    }
  }
  return "";
}

// Reads a citestyles envelope. Never throws.
// `expect` (optional) is the request's format-option map; echoed options that contradict it make the
// style unusable: the style is OMITTED from `styles` and `echo-mismatch:<styleId>:<key>` is recorded
// (key names only, never option values), so consumers see neither a missing-style duplicate nor bad text.
// A style with neither a long nor an enhanced form is kept (long: null) and flagged `missing-form:<id>:long`.
function wlSvcReadEnvelope(json, wantedStyleIds, expect) {
  var reviewReasons = [];
  var styles = {};
  var seenStyleIds = {};
  var rejectedStyleIds = {};

  if (!wlSvcIsObject(json) || !Array.isArray(json.responses) || !Array.isArray(wantedStyleIds)) {
    return { ok: false, styles: styles, reviewReasons: ["malformed-envelope"] };
  }

  var malformed = false;
  var responses = json.responses;
  for (var i = 0; i < responses.length; i++) {
    var resp = responses[i];
    if (!wlSvcIsObject(resp)) {
      malformed = true;
      continue;
    }
    var req = wlSvcIsObject(resp.request) ? resp.request : {};
    var styleId = typeof req.styleId === "string" ? req.styleId : "";
    if (styleId === "") continue;

    if (seenStyleIds[styleId]) {
      reviewReasons.push("duplicate-style:" + styleId);
      continue;
    }
    seenStyleIds[styleId] = true;

    if (wantedStyleIds.indexOf(styleId) === -1) {
      continue;
    }

    var mismatchKey = wlSvcFindEchoMismatch(req, expect);
    if (mismatchKey) {
      reviewReasons.push("echo-mismatch:" + styleId + ":" + mismatchKey);
      rejectedStyleIds[styleId] = true;
      continue;
    }

    var forms = Array.isArray(resp.forms) ? resp.forms : [];
    var longText = null;
    var shorts = [];
    var enhanced = null;

    for (var f = 0; f < forms.length; f++) {
      var form = forms[f];
      if (!wlSvcIsObject(form)) {
        malformed = true;
        continue;
      }
      var fname = typeof form.name === "string" ? form.name : form.form;
      var text = wlSvcFormText(form);

      if (fname === "long") {
        if (text) longText = text;
      } else if (fname === "short") {
        shorts.push(text);
      } else if (fname === "enhanced") {
        if (text) enhanced = text;
      }
    }

    if (longText === null && enhanced === null) {
      reviewReasons.push("missing-form:" + styleId + ":long");
    }

    styles[styleId] = {
      long: longText,
      shorts: shorts,
      id: styleId,
      enhanced: enhanced
    };
  }

  if (malformed) {
    reviewReasons.push("malformed-envelope");
  }

  for (var w = 0; w < wantedStyleIds.length; w++) {
    if (!styles[wantedStyleIds[w]] && !rejectedStyleIds[wantedStyleIds[w]]) {
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

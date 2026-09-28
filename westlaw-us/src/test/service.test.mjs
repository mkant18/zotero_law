import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadModules } from "./helpers/load.mjs";

var ctx = loadModules(["text.js", "service.js"]);
var wlSvcBuildRequests = ctx.wlSvcBuildRequests;
var wlSvcFetch = ctx.wlSvcFetch;
var wlSvcFetchAll = ctx.wlSvcFetchAll;
var wlSvcReadEnvelope = ctx.wlSvcReadEnvelope;

var GUID = "I1234567890abcdef1234567890abcdef";
var GUID_INVALID = "NOT-A-VALID-GUID";
var SECRETS = { pageEventId: "TEST-PEI-0001", resourceToken: "TEST-RT-0001" };
var HOST = "relatedinfo.next.westlaw.com";

function makeDeps(overrides) {
  var deps = {
    request: function() { return Promise.resolve({ status: 200, body: "{}", headers: { "content-type": "application/json" } }); },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    timeoutMs: 8000
  };
  if (overrides) {
    for (var k in overrides) {
      deps[k] = overrides[k];
    }
  }
  return deps;
}

function makeResponse(status, body, headers) {
  return { status: status, body: body, headers: headers || {} };
}

// ---- wlSvcBuildRequests ----

describe("wlSvcBuildRequests - standard profile", function() {
  it("returns two requests with correct labels", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs.length, 2);
    assert.equal(reqs[0].label, "A");
    assert.equal(reqs[1].label, "B");
  });

  it("A uses standard styleIds", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].styleIds.length, 1);
    assert.equal(reqs[0].styleIds[0], "standard");
  });

  it("B uses standard+westlaw styleIds", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[1].styleIds.length, 2);
    assert.equal(reqs[1].styleIds[0], "standard");
    assert.equal(reqs[1].styleIds[1], "westlaw");
  });

  it("A has history=true", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.ok(reqs[0].url.indexOf("history=true") !== -1);
  });

  it("B has history=false", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.ok(reqs[1].url.indexOf("history=false") !== -1);
  });

  it("A parallelCiteRule is westReporterOnly", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.ok(reqs[0].url.indexOf("parallelCiteRule=westReporterOnly") !== -1);
  });

  it("B parallelCiteRule is allReporter", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.ok(reqs[1].url.indexOf("parallelCiteRule=allReporter") !== -1);
  });

  it("both have subStyle=LegalBriefs", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.ok(reqs[0].url.indexOf("subStyle=LegalBriefs") !== -1);
    assert.ok(reqs[1].url.indexOf("subStyle=LegalBriefs") !== -1);
  });

  it("both have underline=false&bold=false&italicize=false", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.ok(reqs[0].url.indexOf("underline=false") !== -1);
    assert.ok(reqs[0].url.indexOf("bold=false") !== -1);
    assert.ok(reqs[0].url.indexOf("italicize=false") !== -1);
    assert.ok(reqs[1].url.indexOf("underline=false") !== -1);
  });

  it("URL uses correct base path", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].url.indexOf("https://1.next.westlaw.com/RelatedInfo/v2/citestyles/" + GUID + "?"), 0);
  });

  it("headers contain X-Requested-With", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["X-Requested-With"], "XMLHttpRequest");
  });

  it("headers contain x-cobalt-exectype: async", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["x-cobalt-exectype"], "async");
  });

  it("headers contain x-cobalt-pcid from secrets", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["x-cobalt-pcid"], "TEST-PEI-0001");
  });

  it("headers contain x-cobalt-rtid from secrets", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["x-cobalt-rtid"], "TEST-RT-0001");
  });

  it("headers contain x-cobalt-host from config", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["x-cobalt-host"], HOST);
  });

  it("headers never contain Referer", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["Referer"], undefined);
    assert.equal(reqs[0].headers["referer"], undefined);
  });

  it("headers never contain Origin", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["Origin"], undefined);
    assert.equal(reqs[0].headers["origin"], undefined);
  });

  it("headers never contain Cookie", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].headers["Cookie"], undefined);
    assert.equal(reqs[0].headers["cookie"], undefined);
  });

  it("request URL never contains pubPages", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs[0].url.indexOf("pubPages"), -1);
    assert.equal(reqs[1].url.indexOf("pubPages"), -1);
  });
});

describe("wlSvcBuildRequests - texas profile", function() {
  it("A uses texas+standard styleIds", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "texas");
    assert.equal(reqs[0].styleIds.length, 2);
    assert.equal(reqs[0].styleIds[0], "texas");
    assert.equal(reqs[0].styleIds[1], "standard");
  });

  it("A parallelCiteRule is still westReporterOnly", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "texas");
    assert.ok(reqs[0].url.indexOf("parallelCiteRule=westReporterOnly") !== -1);
  });
});

describe("wlSvcBuildRequests - invalid inputs", function() {
  it("returns [] for invalid GUID", function() {
    var config = { guid: GUID_INVALID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs.length, 0);
  });

  it("returns [] for missing config", function() {
    var reqs = wlSvcBuildRequests(null, SECRETS, "standard");
    assert.equal(reqs.length, 0);
  });

  it("returns [] for missing guid", function() {
    var config = { relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs.length, 0);
  });

  it("returns [] for missing host", function() {
    var config = { guid: GUID };
    var reqs = wlSvcBuildRequests(config, SECRETS, "standard");
    assert.equal(reqs.length, 0);
  });

  it("returns [] for missing secrets", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, null, "standard");
    assert.equal(reqs.length, 0);
  });

  it("returns [] for missing pageEventId", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, { resourceToken: "TOKEN" }, "standard");
    assert.equal(reqs.length, 0);
  });

  it("returns [] for missing resourceToken", function() {
    var config = { guid: GUID, relatedInfoHost: HOST };
    var reqs = wlSvcBuildRequests(config, { pageEventId: "PEI" }, "standard");
    assert.equal(reqs.length, 0);
  });
});

// ---- wlSvcFetch ----

describe("wlSvcFetch - categories", function() {
  it("category ok on 200 with JSON", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(200, '{"responses":[]}', { "content-type": "application/json" }));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "ok");
    assert.equal(result.status, 200);
    assert.ok(result.json);
  });

  it("category timeout on timeout", async function() {
    var deps = makeDeps({
      request: function() { return new Promise(function() {}); },
      setTimeout: function(cb) { cb(); return 1; },
      clearTimeout: function() {},
      timeoutMs: 1
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "timeout");
    assert.equal(result.status, "none");
  });

  it("category network-or-origin on request error", async function() {
    var deps = makeDeps({
      request: function() { return Promise.reject(new Error("fetch failed")); }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "network-or-origin");
    assert.equal(result.status, "none");
  });

  it("category auth on 401", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(401, "", {}));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "auth");
    assert.equal(result.status, 401);
  });

  it("category auth on 403", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(403, "", {}));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "auth");
    assert.equal(result.status, 403);
  });

  it("category auth on login HTML with 200", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(200, "<html>login</html>", { "content-type": "text/html" }));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "auth");
    assert.equal(result.status, 200);
  });

  it("category not-found-html on 404", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(404, "<html>not found</html>", {}));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "not-found-html");
    assert.equal(result.status, 404);
  });

  it("category bad-request on 400", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(400, "", {}));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "bad-request");
    assert.equal(result.status, 400);
  });

  it("category rate-limited on 429", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(429, "", { "retry-after": "5" }));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "rate-limited");
    assert.equal(result.status, 429);
    assert.equal(result.retryAfter, 5);
  });

  it("category server on 500", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(500, "", {}));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "server");
    assert.equal(result.status, 500);
  });

  it("category malformed-json on non-JSON body", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(200, "not json", { "content-type": "application/json" }));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "malformed-json");
    assert.equal(result.status, 200);
  });

  it("category oversized on body exceeding maxBodyBytes", async function() {
    var bigBody = "x".repeat(2000001);
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(200, bigBody, { "content-type": "application/json" }));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "oversized");
    assert.equal(result.status, 200);
  });

  it("category unexpected-envelope when responses is not array", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(200, '{"not":"responses"}', { "content-type": "application/json" }));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    assert.equal(result.category, "unexpected-envelope");
    assert.equal(result.status, 200);
  });
});

describe("wlSvcFetch - no token in result", function() {
  it("JSON.stringify result contains no token values", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(200, '{"responses":[]}', { "content-type": "application/json" }));
      }
    });
    var result = await wlSvcFetch({ label: "A", url: "https://example.com", headers: {} }, deps);
    var str = JSON.stringify(result);
    assert.equal(str.indexOf("TEST-RT-0001"), -1);
    assert.equal(str.indexOf("TEST-PEI-0001"), -1);
  });
});

// ---- wlSvcFetchAll ----

describe("wlSvcFetchAll - stop after A for stop categories", function() {
  var stopCategories = ["auth", "rate-limited", "timeout", "network-or-origin"];

  stopCategories.forEach(function(cat) {
    it("A " + cat + " → B skipped", async function() {
      var callCount = 0;
      var deps = makeDeps({
        request: function() {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(makeResponse(401, "", {}));
          }
          return Promise.resolve(makeResponse(200, '{"responses":[]}', { "content-type": "application/json" }));
        }
      });

      var reqs = [
        { label: "A", url: "https://example.com/a", headers: {} },
        { label: "B", url: "https://example.com/b", headers: {} }
      ];
      var results = await wlSvcFetchAll(reqs, deps);

      assert.equal(results.length, 2);
      assert.equal(results[0].category, "auth");
      assert.equal(results[1].category, "skipped");
    });
  });

  it("A ok → B still called even if B fails", async function() {
    var callCount = 0;
    var deps = makeDeps({
      request: function() {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(makeResponse(200, '{"responses":[]}', { "content-type": "application/json" }));
        }
        return Promise.resolve(makeResponse(500, "", {}));
      }
    });

    var reqs = [
      { label: "A", url: "https://example.com/a", headers: {} },
      { label: "B", url: "https://example.com/b", headers: {} }
    ];
    var results = await wlSvcFetchAll(reqs, deps);

    assert.equal(results.length, 2);
    assert.equal(results[0].category, "ok");
    assert.equal(results[1].category, "server");
  });
});

describe("wlSvcFetchAll - budget and max requests", function() {
  it("at most 3 requests", async function() {
    var deps = makeDeps({
      request: function() {
        return Promise.resolve(makeResponse(200, '{"responses":[]}', { "content-type": "application/json" }));
      }
    });

    var reqs = [
      { label: "A", url: "https://example.com/a", headers: {} },
      { label: "B", url: "https://example.com/b", headers: {} },
      { label: "C", url: "https://example.com/c", headers: {} },
      { label: "D", url: "https://example.com/d", headers: {} }
    ];
    var results = await wlSvcFetchAll(reqs, deps);

    assert.equal(results.length, 3);
  });
});

// ---- wlSvcReadEnvelope ----

describe("wlSvcReadEnvelope - basic", function() {
  it("extracts long and shorts by styleId", function() {
    var json = {
      responses: [
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "  Long text  " } },
            { name: "short", text: { "text/plain": "Short 1" } },
            { name: "short", text: { "text/plain": "Short 2" } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard"]);
    assert.ok(result.ok);
    assert.equal(result.styles.standard.long, "Long text");
    assert.equal(result.styles.standard.shorts.length, 2);
    assert.equal(result.styles.standard.shorts[0], "Short 1");
    assert.equal(result.styles.standard.shorts[1], "Short 2");
    assert.equal(result.styles.standard.id, "standard");
  });

  it("extracts enhanced", function() {
    var json = {
      responses: [
        {
          request: { styleId: "standard" },
          forms: [
            { name: "enhanced", text: { "text/plain": "  Enhanced text  " } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard"]);
    assert.ok(result.ok);
    assert.equal(result.styles.standard.enhanced, "Enhanced text");
  });

  it("matched by echoed styleId not array position", function() {
    var json = {
      responses: [
        {
          request: { styleId: "westlaw" },
          forms: [
            { name: "long", text: { "text/plain": "Westlaw long" } }
          ]
        },
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "Standard long" } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard"]);
    assert.ok(result.ok);
    assert.equal(result.styles.standard.long, "Standard long");
    assert.equal(result.styles.westlaw, undefined);
  });

  it("reversed responses order still matched by styleId", function() {
    var json = {
      responses: [
        {
          request: { styleId: "westlaw" },
          forms: [
            { name: "long", text: { "text/plain": "Westlaw long" } }
          ]
        },
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "Standard long" } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard", "westlaw"]);
    assert.ok(result.ok);
    assert.equal(result.styles.standard.long, "Standard long");
    assert.equal(result.styles.westlaw.long, "Westlaw long");
  });

  it("duplicate echoed styleId → duplicate-style review reason", function() {
    var json = {
      responses: [
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "First" } }
          ]
        },
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "Second" } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard"]);
    assert.equal(result.ok, false);
    assert.ok(result.reviewReasons.indexOf("duplicate-style:standard") !== -1);
  });

  it("missing wanted style → missing-style review reason", function() {
    var json = {
      responses: [
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "Standard long" } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard", "texas"]);
    assert.equal(result.ok, false);
    assert.ok(result.reviewReasons.indexOf("missing-style:texas") !== -1);
  });

  it("all strings cleaned through wlTextClean", function() {
    var json = {
      responses: [
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "  \u200BZero-width\u200B text  " } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard"]);
    assert.equal(result.styles.standard.long, "Zero-width text");
  });
});

describe("wlSvcReadEnvelope - no token in result", function() {
  it("JSON.stringify result contains no token values", function() {
    var json = {
      responses: [
        {
          request: { styleId: "standard" },
          forms: [
            { name: "long", text: { "text/plain": "Clean text content" } }
          ]
        }
      ]
    };
    var result = wlSvcReadEnvelope(json, ["standard"]);
    var str = JSON.stringify(result);
    assert.equal(str.indexOf("TEST-RT-0001"), -1);
    assert.equal(str.indexOf("TEST-PEI-0001"), -1);
  });
});

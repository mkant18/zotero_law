# M1-E — citation-service client (offline, mocked HTTP)

Read `westlaw-us/tasks/COMMON.md`, `westlaw-us/src/CONTRACT.md`. Plan §3 (request budget/policy + failure table — read fully), §4 step 1 (envelope validation), §12 logging, §13.

## Allowed files
`westlaw-us/src/service.js`, `westlaw-us/src/test/service.test.mjs`, `westlaw-us/src/PROGRESS-E.md`.

## Read-only inputs
`westlaw-us/m0/probe/Westlaw US M0 Probe.js` (`buildRequests`, `fetchForm`, `summarizeEnvelope` — port and generalize; the probe's tests in `westlaw-us/m0/probe/test/` show how `ZU.request` is faked), `reports/10-WESTLAW-LIVE-FINDINGS.md` §3 (endpoint, headers, response shape), `westlaw-us/src/dom.js` (shape of `config`/`secrets`), `westlaw-us/src/test/helpers/load.mjs`.

## Deliverables — `service.js` (prefix `wlSvc`)
1. `wlSvcBuildRequests(config, secrets, profile)` → array of request descriptors `{ label:"A"|"B", url, headers, styleIds:[…] }`:
   - A (citation form): styleIDs per profile — `standard` (default) or `texas`+`standard` (profile `texas`); `parallelCiteRule` from a constant table `wlSvcRecipes` (so it can be changed after the live M0 spike): A = `westReporterOnly`, B = `allReporter`. (The recorded matrix shows `CAFormat`, `allReporter`, `officialReporterOnly`, `westReporterOnly` all accepted; an older note in reports/10 §3 saying only two are accepted is stale.)
   - Both: `subStyle=LegalBriefs`, `underline=false&bold=false&italicize=false`, `contextData=(sc.Default)`; A `history=true`, B `history=false`; B styleIDs `standard`+`westlaw`. No `pubPages`, no `paragraphNumber`.
   - URL = `https://1.next.westlaw.com/RelatedInfo/v2/citestyles/<guid>?…` (encode params; guid must match `^I[0-9a-f]{32}$` else return `[]`).
   - Headers exactly: `X-Requested-With: XMLHttpRequest`, `x-cobalt-exectype: async`, `x-cobalt-pcid`, `x-cobalt-rtid`, `x-cobalt-host` (relatedInfoHost). NEVER Referer/Origin/Cookie.
   - Missing secrets or host → `[]`.
2. `wlSvcFetch(req, deps)` → Promise of a classified result `{ label, category, status, ms, json? , retryAfter? }` using `deps.request(url, {headers, responseType:"text"})` (the real `ZU.request` in the translator; injected in tests) raced against `deps.setTimeout` with `wlSvcLimits.timeoutMs = 8000`. Categories exactly as plan §3 table / probe: ok, timeout, network-or-origin, auth (401/403 or login HTML with 200), not-found-html, bad-request, rate-limited (+Retry-After), server, malformed-json, oversized (`wlSvcLimits.maxBodyBytes = 2_000_000`), unexpected-envelope. Never include header values, URLs with tokens, or bodies in the result other than `json` on ok.
3. `wlSvcFetchAll(requests, deps)` → sequential; stop after A when A's category is auth / rate-limited / timeout / network-or-origin (B skipped with category `skipped`); overall budget `wlSvcLimits.totalMs = 20000`; at most 3 requests ever.
4. `wlSvcReadEnvelope(json, wantedStyleIds)` → `{ ok, styles: { <styleId>: { long, shorts:[…], id, enhanced } } , reviewReasons }` selecting `responses[]` by echoed `request.styleId` (never array position), taking `text/plain` content of forms `long`, `short` (all occurrences, in order), `specialRef`, `enhanced`. Missing wanted style → review reason `missing-style:<id>`; duplicate echoed styleId → `duplicate-style:<id>`. All strings through `wlTextClean`.

## Tests (mock `deps.request`; synthetic envelopes; placeholder tokens `TEST-RT-0001`)
Every category; A-fail → B skipped for the four stop categories; A ok + B 500 → A kept, B server; reversed `responses` order still matched by styleId; duplicate styleId; missing texas style; headers contain no Referer/Origin/Cookie; no token value appears in any returned object (JSON.stringify check); request URL never contains `pubPages`; guid validation; timeout test finishes quickly (use a fake setTimeout or tiny timeout override via `deps.timeoutMs`).

## Acceptance
`node --test "westlaw-us/src/test/service.test.mjs"` passes; `node westlaw-us/tools/check-private-data.mjs --paths westlaw-us/src` fail=0.

# M0-B — Connector request-path probe translator + mocked failure tests (offline)

Read `westlaw-us/tasks/COMMON.md` first; its rules override anything here.
Plan sections: `reports/20-ASTRA-ARCHITECTURE.md` §3 (request budget, headers, failure table), §7 (detection/identity), §8 (no attachments), §9, §11 M0 steps 1–6, §12 logging. Live findings: `reports/10-WESTLAW-LIVE-FINDINGS.md` §§1–3, 5.

## Objective
A TEMPORARY minimal web translator that, when the user later installs it in a disposable environment, performs the
real Chrome MV3 Connector request path (`ZU.request`) to the Westlaw citation service and saves a metadata-only `case`
item containing only REDACTED probe facts. It is NOT the parser: do not parse citation grammar, split names,
abbreviate courts, or map reporters. Plus offline node tests with mocks for every handled failure category.

## Allowed files (create only under this directory)
`westlaw-us/m0/probe/**`

## Read-only references
- `translate/src/utilities_translate.js` lines ~290–395 (`ZU.request`: options `headers`, `successCodes` (false = accept all), `responseType` 'text'|'json'|'document'; no timeout option; resolves `{status, responseURL, headers, body}`; rejects on network error or non-success status unless `successCodes:false`).
- `zotero-connectors/src/common/http.js` (`_requestFetch`, MV3 relay) and `zotero-connectors/src/common/inject/http.js` (`addDefaultReferrer`: the connector itself adds the page URL as Referer for same-origin requests — the translator must NOT set Referer/Origin/Cookie).
- `translators/Lexis+.js`, `translators/WestLaw UK.js` — header JSON format only.
- DOM shape comes ONLY from `reports/10-WESTLAW-LIVE-FINDINGS.md` §2 (you may NOT read `westlaw-samples/*.html`).

## Deliverable 1: `westlaw-us/m0/probe/Westlaw US M0 Probe.js`
Standard Zotero translator file. Header JSON exactly:
`translatorID "b426c5b0-4383-4224-aeb4-1237b2a20479"`, `label "Westlaw US (M0 probe)"`, `creator "local M0 spike"`,
`target "^https://1\\.next\\.westlaw\\.com/"`, `minVersion "5.0"`, `maxVersion ""`, `priority 100`, `inRepository false`,
`translatorType 4`, `browserSupport "gcsibv"`, `lastUpdated "2026-09-28 09:00:00"`. Include the usual AGPL license comment block like upstream translators.
Define all helpers yourself (do not rely on `text()`/`attr()` globals). Use only `doc.querySelector(All)`, `doc.title`, `doc.location.href` / `url`, `el.textContent`, `el.getAttribute`.

Behavior:
- Constants object `M0` = `{ version: "m0-probe 0.0.1", timeoutMs: 8000, totalBudgetMs: 20000, maxBodyBytes: 2000000, maxRequests: 3, forceFatal: false }` (tests may mutate `timeoutMs`/`forceFatal`).
- `cleanText(s)`: remove `[\u200B-\u200F\u2060-\u2064\uFEFF]`, NBSP→space, collapse whitespace, trim, NFC. Written with `\u` escapes (no literal zero-width characters in the source file). Apply to EVERY string written to the item.
- `detectWeb(doc, url)`: NO network. Return `"case"` only if: host matches; `#co_docHeaderTitleLine` exists with non-empty cleaned text; and (config ContentType === "Cases", OR config ContentType unavailable AND `doc.title` has an exact ` | Cases | ` segment). If config ContentType exists and !== "Cases" → return false even if the title says Cases. Title/URL alone never suffice. If the header is missing and `#co_document` exists, call `Zotero.monitorDOMChanges(thatElement)` once and return false.
- `readPageContext(doc, url)`: scan only inline `<script>` elements' `textContent` with regexes for `"Key":"value"` pairs for keys `DocumentGuid, ContentType, PageEventIdentifier, ResourceToken, RelatedInfo`. No eval/JSON.parse of whole scripts. Validation: GUID `^I[0-9a-f]{32}$`; PageEventIdentifier & ResourceToken `^[A-Za-z0-9._~+\/=:-]{8,512}$`; RelatedInfo `^[A-Za-z0-9.-]{1,253}$`; ContentType ≤ 64 chars. Non-GUID keys with more than one distinct value → treat that key as unavailable (reason `config-ambiguous`). GUID selection: if the URL path has `/Document/<GUID>/`, it MUST be among config GUID values (else `identity-mismatch`); else exactly one distinct config GUID; else the GUID from `#co_docHeaderTitleLine a[href*="/Document/I"]` if it is among config values; else `identity-ambiguous`. Tokens are returned in a separate `secrets` object that is never logged, stored, or included in thrown errors.
- `buildRequests(ctx, capture)`: base `https://1.next.westlaw.com/RelatedInfo/v2/citestyles/<GUID>?contextData=(sc.Default)` plus:
  - A (default): `styleIDs=standard&underline=false&bold=false&italicize=false&subStyle=LegalBriefs&history=true&parallelCiteRule=westReporterOnly`
  - A (Texas intermediate appellate, i.e. cleaned court line matches `/Court of Appeals of Texas/i` and NOT `/United States/i`): `styleIDs=texas&styleIDs=standard` + same options.
  - B: `styleIDs=standard&styleIDs=westlaw&underline=false&bold=false&italicize=false&subStyle=LegalBriefs&history=false&parallelCiteRule=allReporter`
  - Headers exactly: `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, `x-cobalt-exectype: async`, `x-cobalt-pcid`, `x-cobalt-rtid`, `x-cobalt-host` (from validated config). Never Origin, Cookie, Referer, Authorization. Never any other host or path; never a host taken from HTML.
- `fetchForm(req)`: `ZU.request(url, {headers, responseType: "text", successCodes: false})` raced against a `timeoutMs` timer (clear the timer afterwards); enforce overall budget. Classify into exactly one category: `ok | missing-config | identity-mismatch | identity-ambiguous | network-or-origin | timeout | auth | not-found-html | bad-request | rate-limited | server | malformed-json | oversized | unexpected-envelope`.
  - 401/403 → auth; 2xx with non-JSON content-type or body starting with `<` → auth (login/HTML page); 404 → not-found-html; 400 → bad-request; 429 → rate-limited (record `Retry-After` as integer seconds if numeric, capped 86400); 5xx → server; body > maxBodyBytes → oversized; JSON parse error → malformed-json; JSON without `responses` array → unexpected-envelope; rejected promise → network-or-origin (record only the error class/name, never the message if it could contain the URL).
- `summarizeEnvelope(json)`: redacted facts only: per `responses[i]`: echoed `request.styleId`; the list of `request` KEY NAMES (not values) plus values of `parallelCiteRule`, `subStyle`, `history` if present; form names in order with counts; for each form whether a `text/plain` cite exists. Plus, for `long` forms of style ids `standard`, `texas`, `westlaw` only: the text/plain value, cleaned, truncated to 500 chars (bibliographic citation text). Select responses by echoed styleId, never by array position.
- `doWeb(doc, url)`: freeze capture first (GUID, cleaned header title, deduplicated cleaned `#co_docHeaderCitation > li` texts, cleaned `.co_docketBlock` text) — capture once, before any await. If `M0.forceFatal` → throw `new Error("M0 forced fatal")` before creating any item (documented as disposable-environment-only). Otherwise: if secrets/config missing → no request. Else request A; request B only if A is `ok` (skip B for any other category). ≤3 requests total. Re-check that `doc.location.href` GUID (if any) still matches the frozen GUID after the requests; if not → record `identity-changed` and do not use responses.
  Then create exactly ONE `new Zotero.Item("case")`: `caseName` = cleaned header title (fallback: title segment before ` | `); `url` = `https://1.next.westlaw.com/Document/<GUID>/View/FullText.html` only if a validated GUID exists (no query/fragment), else unset; `dateDecided` = first header li text that parses as a full `Month D, YYYY` date (keep as the plain cleaned string); `attachments = []`; `creators = []`; `notes = []`; tags `Westlaw: M0 probe` and, when any category ≠ ok, `Westlaw: needs citation review`; `extra` lines ONLY of the forms:
  `Westlaw translator: m0-probe 0.0.1` · `Westlaw M0 A: <category> status=<int|none> ct=<json|html|other|none> styles=<ids> forms=<names> ms=<int>` · same for `Westlaw M0 B:` (or `Westlaw M0 B: skipped`) · `Westlaw M0 A long (<styleId>): <text>` · `Westlaw M0 B long (<styleId>): <text>` · `Westlaw M0 Retry-After: <n>` when present · `Westlaw M0 capture: header-li=<count> docket=<yes|no>`.
  Call `item.complete()` exactly once. Any exception during enrichment is caught and becomes a category; `doWeb` must not throw except under `forceFatal`.
- Logging: `Zotero.debug` with reason codes only (version, request letter, category, status, ms). Never log headers, URLs with tokens, body text, HTML, or error messages from the network layer.
- End of file: `if (typeof module !== "undefined" && module.exports) { module.exports = { M0, cleanText, detectWeb, doWeb, readPageContext, buildRequests, fetchForm, summarizeEnvelope }; }`. No `/** BEGIN TEST CASES **/` block needed (empty `var testCases = [];` is fine).

## Deliverable 2: `westlaw-us/m0/probe/test/probe.test.mjs` (node:test) + `test/fakes.mjs`
Load the translator source via `vm` in a context providing fakes: `Zotero` (`Item` class recording field assignments and `complete()` calls; `debug` capturing strings; `monitorDOMChanges` spy), `ZU.request` mock (records url/options; scripted responses), a tiny fake DOM (objects with `querySelector/querySelectorAll/textContent/getAttribute`, `title`, `location.href`) — no jsdom. Fake secrets must be distinctive, e.g. `TEST-RT-0001-SECRET`, `TEST-PCID-0001-SECRET`, `relatedinfo.test.invalid`.
Cases (each a separate test):
1. success A+B (synthetic envelope with `standard` and `texas`/`westlaw` responses, forms long/short/short/specialRef/enhanced, text/plain + text/html) → category ok, 2 requests, B uses `allReporter`, Extra has long lines, responses matched by styleId even when array order is reversed.
2. Texas court line → A has `styleIDs=texas&styleIDs=standard`; a Fifth Circuit line containing "Texas" in the title facet but "United States Court of Appeals" in the court line → standard only.
3. missing ResourceToken → 0 requests, category missing-config, item still saved once.
4. 401, 403 → auth, B skipped. 5. 200 + `text/html` login body → auth. 6. 404 HTML → not-found-html. 7. 400 → bad-request.
8. 429 with `Retry-After: 120` → rate-limited, Retry-After line, B skipped. 9. 500 → server.
10. malformed JSON → malformed-json. 11. body > maxBodyBytes → oversized. 12. JSON without responses → unexpected-envelope.
13. timeout (mock never resolves; set `M0.timeoutMs = 30`) → timeout; test finishes quickly. 14. rejected request → network-or-origin, error message (containing a fake URL with the token) NOT present anywhere in item/debug.
15. URL GUID ≠ config GUID → identity-mismatch, 0 requests. 16. two distinct config GUIDs on a /Link/ URL with header anchor resolving one → uses it; unresolvable → identity-ambiguous, 0 requests.
17. location changes to a different GUID during request → identity-changed, responses unused.
18. detectWeb: case page → "case" with 0 requests; config ContentType "SecondarySources" + stale "| Cases |" title → false; title-only (no header element) → false + monitorDOMChanges called once when `#co_document` exists; no config but header + Cases title → "case"; secondary-source title → false.
19. forceFatal → doWeb throws, 0 items completed (documents the fallback experiment).
20. Watermark: header title containing U+2060–U+2064 / U+200B / U+FEFF → none of those code points in any item field.
Global assertions for every saving test: exactly one `complete()`; itemType `case`; `attachments` empty; `creators` empty; no notes; `JSON.stringify(item)` and all debug output contain none of the fake secrets/relatedinfo host; request URLs all start with `https://1.next.westlaw.com/RelatedInfo/v2/citestyles/`; no request header named Origin/Cookie/Referer/Authorization (case-insensitive); ≤3 requests.

## Deliverable 3: `westlaw-us/m0/probe/README.md`
Purpose, what is/isn't recorded, the `forceFatal` flag (edit constant only in a disposable profile), that it must be removed from the Zotero translators directory after M0, and known limitations (no lint run unless you actually run one; Scaffold not used; connector behavior untested).

## Test command
`node --test westlaw-us/m0/probe/test/` from workspace root — all tests must pass.

## Stop conditions
- Any requirement conflicts with how `ZU.request` actually behaves in the read-only sources — report the conflict with file:line.
- You would need to read private samples, add dependencies, or touch files outside `westlaw-us/m0/probe/`.

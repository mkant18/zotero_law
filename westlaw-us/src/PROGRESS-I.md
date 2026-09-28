# M1-I Progress

## Step 1 → pass/19
Created `westlaw-us/src/translator.js` with `wlTrDetectWeb`, `wlTrDoWeb`, `detectWeb`, `doWeb`, `wlTrVersion = "0.1.0"`, and `var testCases = [];` at the end. Entry points unprefixed as Zotero requires; helpers prefixed `wlTr`.

## Step 2 → pass/19
Created `westlaw-us/tools/build-translator.mjs` — Node script that writes `westlaw-us/dist/Westlaw Advantage US.js`. Fixed per orchestrator review:
- B1: File now begins with bare JSON header (JSON.stringify with tab indent, no `var header = ` wrapper), matching Bluesky.js format
- B2: translatorID is hard-coded constant `9abca805-707d-4064-958f-e08ac37f0862` (stable across builds)
- B3: AGPL license block inserted after header with copyright "Copyright © 2026 local"
- B4: File ends with `/** BEGIN TEST CASES **/\nvar testCases = [\n]\n/** END TEST CASES **/`
- B5: Build script verifies no `module.exports` or `require(` in output; removed `node --check` (incompatible with bare JSON header)
Also fixed license block regex (`[\s\S]*?` instead of `\s*` before `*/`) so it correctly extracts the full AGPL block from the probe file.

## Step 3 → pass/19
Created `westlaw-us/src/test/translator.test.mjs` — 19 tests covering detectWeb (6 scenarios), doWeb G1-like Sanchez (3), Texas page (1), A 401 metadata-only (1), GUID change identity-changed (1), no attachments/notes/creators (1), ZU.request call count (1), Zotero.debug strings (3), build script (2). All pass.

Added per orchestrator review:
- B2: Test asserting two builds produce the same translatorID (hard-coded constant)
- B5: Test asserting no `module.exports` or `require(` in built file
- B5: Test that JSON.parse of header block succeeds and has expected label/target/priority/translatorType
- Fixed `loadBuiltFile` to strip bare JSON header before vm.runInContext (required because bare JSON is not valid JS)

## Step 4 → pass/24
T1: Replaced `var detectWeb = wlTrDetectWeb; var doWeb = wlTrDoWeb;` in src/translator.js with real function declarations:
- `function detectWeb(doc, url) { return wlTrDetectWeb(doc, url); }`
- `async function doWeb(doc, url) { return wlTrDoWeb(doc, url); }`
Added 2 tests asserting the built file matches `/^function detectWeb\(/m` and `/^async function doWeb\(/m`.

T2: Added trailing newline after `/** END TEST CASES **/` in build-translator.mjs (append empty string to outputParts).

## Commands run
- `node westlaw-us/tools/build-translator.mjs` → success
- `node --test "westlaw-us/src/test/translator.test.mjs"` → 24/24 pass
- `node --test "westlaw-us/src/test/*.test.mjs"` → 419/419 pass
- `node westlaw-us/tools/check-private-data.mjs --paths westlaw-us` → fail=0 warn=0

## W5 — forward non-echo envelope review reasons
- Probe (under .cache): before the change `wlRecReconcile` never read `envelope.reviewReasons`; `wlTrReadService` forwarded only `echo-mismatch:*`, so `malformed-envelope`, `missing-style:<id>`, `duplicate-style:<id>`, `missing-form:<id>:long` were dropped.
- Fix in `reconcile.js` (single place): new `wlRecAddEnvelopeReasons` copies envelope A reasons (and envelope B reasons when B category is `ok`) into `rec.reviewReasons`, deduped. Any demoting reason makes the record non-validated (`unverified-profile`, or `metadata-only` when no primary); informational reasons (currently only `header-fallback`) do not demote and, since the review-fix pass, do not add the needs-review tag (map.js `wlMapHasDemotingReason`), though the `Westlaw review:` Extra line stays. `translator.js` unchanged (echo path already dedupes).
- Note: `responses` not an array is classified `unexpected-envelope` by `wlSvcFetch` before `wlSvcReadEnvelope`, so it surfaces as `service-unexpected-envelope` / metadata-only (existing path). `malformed-envelope` is reachable via non-object entries in `responses`/`forms`.
- Tests: 5 in `reconcile.test.mjs`, 5 in `translator.test.mjs` (B routed by `styleIDs=westlaw` because the B URL also contains `styleIDs=standard`).

## Review fixes (lane C, final review P1-3/P1-4/P2-7/P2-8/P2-11/P2-12)
- `translator.js`: page-context reasons (`frozenContext.reviewReasons`, filtered `/^[a-z0-9:-]+$/`) are forwarded before mapping, so a skipped service shows `service-none` plus the cause (`ambiguous-config`, `missing-config`, later `ambiguous-guid`). Reasons that are not short codes become `unsafe-reason`.
- `translator.js`: `wlMapValidateOutgoing` problems now become `validation-<code>` reasons before the final map pass (validated -> unverified, tag added, up to 3 passes). Flagged Extra lines (token/html/watermark/too long) are removed, HTML tags are stripped from scalar fields, token-leaking scalar fields are blanked, and history/shortTitle/url are dropped as before.
- `map.js`: tag uses `wlMapHasDemotingReason`; `Westlaw unparsed citation:` reads `raw || text`, collapses whitespace, caps at 200 chars plus an ellipsis, and skips empty payloads; new problem `caseName-has-cite`.
- `service.js`: `duplicate-style:<id>` only for wanted ids (unwanted response styleIds are ignored silently).

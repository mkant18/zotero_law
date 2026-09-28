# M1-J — offline end-to-end golden pipeline (reconcile → map → Zotero CSL-JSON → citeproc)

Read `westlaw-us/tasks/COMMON.md`, `westlaw-us/src/CONTRACT.md`, `westlaw-us/golden/GOLDEN-TARGETS.md`, plan §11 "Golden citation examples" and §10 verification checklist.

## Allowed files
`westlaw-us/src/test/golden-pipeline.test.mjs`, `westlaw-us/src/test/fixtures/golden-inputs.mjs`, `westlaw-us/src/PROGRESS-J.md`.

## Read-only inputs
`westlaw-us/src/*.js` (load with `helpers/load.mjs`: `['text.js','reporters.js','cite-parse.js','profile.js','service.js','dom.js','map.js','reconcile.js']`), `westlaw-us/m0/csl/harness/render.mjs` (exports `render(items, clusters)`; items are Zotero item JSON with `uri`, `itemType`, field names, `creators: []`, `extra` string), `westlaw-us/m0/csl/fixtures/expected.json` (E-strings), `westlaw-us/m0/csl/test/render.test.mjs` (comparison helper: normalize U+2019→' and accept one trailing "."), `westlaw-us/src/test/reconcile.test.mjs` (how inputs are shaped).

## Deliverables
1. `fixtures/golden-inputs.mjs` — exports reconcile INPUTS (DomFacts + synthetic service envelopes, shaped like `wlSvcReadEnvelope` output) for G1 Sanchez, G2 Philip Morris (history on), G4 Miele, G5 Rogers (texas), G7 Example (WL-only, synthetic), G3 Brown (synthetic SCOTUS: DOM court `Supreme Court of the United States`, cites `347 U.S. 483`, `74 S. Ct. 686`; service long `Brown v. Bd. of Educ., 347 U.S. 483 (1954)`). Service strings: use the golden texts from GOLDEN-TARGETS.md / expected.json (these are bibliographic citation strings, allowed). Placeholder GUIDs `I` + 32 hex; no tokens needed.
2. `golden-pipeline.test.mjs`: for each input → `wlRecReconcile` → `wlMapToZoteroFields` → add `uri` = the golden id → `render()` with the M0-A harness → assert, using the same comparison helper:
   - First cite (no locator) equals the golden first-cite string: G1 E1, G2 E17, G4 E16, G5 E8 (with history), G7 E11, G3 `Brown v. Bd. of Educ., 347 U.S. 483 (1954)`.
   - Pin: G1 `@490` → E2; G3 `@495` → E18; G7 `@*4` → E10.
   - Subsequent after an intervening cite: G1 `@490` → E3; G5 `@791` → E9; G7 `@*4` → E12; G2 `@15` → E21.
   - Id.: `[G1],[G1 @491]` → E6.
   - Records are `validated-profile` for G1, G4, G5 (and G2 if its history round-trips); G7/G3 may be `unverified-profile` — assert and print the review reasons.
   - Every mapped item passes `wlMapValidateOutgoing`; no rendered text contains `Westlaw`, `No. ` dockets (except G7), or `WL` (except G7 and alternates never print).
   If an assertion fails because of a defect in a src module, DO NOT edit src or expected strings: mark that test `{ todo: "<reason>" }` and list it in your final report with the observed vs expected string — the orchestrator will route the fix.

## Acceptance
`node --test "westlaw-us/src/test/golden-pipeline.test.mjs"` passes (todo items allowed only with a precise reason).

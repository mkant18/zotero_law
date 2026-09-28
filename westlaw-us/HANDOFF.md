# Handoff — Westlaw US → Zotero build loop

Last updated: end of orchestrator session 2 (2026-09-28). Branch `main`, pushed to `origin` (private `mkant18/zotero_law`).

## How the loop runs
- Orchestrator (Opus) = reviewer + planner only. Builders = `worker` agent with model `openrouter/inclusionai/ling-3.0-flash`.
- Read first: `westlaw-us/LEDGER.md` (status + findings), `westlaw-us/src/CONTRACT.md` (module conventions, shapes),
  `westlaw-us/tasks/COMMON.md` (worker hard rules), plan `reports/20-ASTRA-ARCHITECTURE.md`.
- What works with Ling: one small brief per worker, exact file allow-list, exact defect list with concrete inputs and
  expected outputs, "never end your turn with a plan", PROGRESS-*.md line per step. Run at most 1–2 in parallel
  (parallel runs triggered OpenRouter 402 in-flight limits).
- Ling as *reviewer* does not work (ends with no output). The orchestrator reviews directly using probe scripts
  (load modules with `westlaw-us/src/test/helpers/load.mjs` via a `file:///M:/…` import URL on Windows).
- Windows: `node --test "<dir>/*.test.mjs"` (quoted glob); a bare directory argument fails.

## Verify state
```
node --test "westlaw-us/src/test/*.test.mjs"        # 475/475
node --test "westlaw-us/m0/csl/test/*.test.mjs"     # 28/28
node --test "westlaw-us/m0/probe/test/*.test.mjs"   # 23/23
node --test "westlaw-us/tools/test/*.test.mjs"      # 50/50
node westlaw-us/tools/check-private-data.mjs        # fail=0 warn=6 (legacy tracked westlaw-samples JSON)
node westlaw-us/tools/build-translator.mjs          # → westlaw-us/dist/Westlaw Advantage US.js
```

## BLOCKER at handoff
OpenRouter key out of credits (402: "can only afford 8572 tokens … adjust the key's monthly limit"). Raise the key
limit / add credits, or give explicit approval for a different builder model.

## Next task (ready to dispatch verbatim once credits exist)
Allowed: `westlaw-us/src/cite-parse.js`, `westlaw-us/src/test/cite-parse.test.mjs`, `westlaw-us/src/PROGRESS-A2.md`.
R4: `wlCiteRoundTrip` for WL forms drops the docket and full date: `Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)`
recomposes to `Example v. Sample, 2024 WL 1234567, at *4 (D. Kan. 2024)` → false `round-trip-mismatch`. Keep the
original parenthetical date token (`parsed.dateText`), recompose name + dockets + citations/pin + `(court dateText|year[, suffix])` + history.
Tests: G7 form; `Sample v. Example, No. 24-456, 2024 WL 7654321 (D. Kan. Sept. 5, 2024)`; pin form `…187 F.3d 486, 490 (5th Cir. 1999)`; Miele parallel form.
Then: re-run `/tmp`-style golden probe → G7 should be `validated-profile` (or court-only reason); finalize
`westlaw-us/src/test/golden-pipeline.test.mjs` (G4 is now validated; remove its todo/expectation mismatch).

## After that — needs the user
- M0-L live spike (`westlaw-us/m0/MANUAL-SPIKE.md`): connector origin/cookie acceptance, fallback/snapshot behavior,
  installed-Zotero CSL proof. Install `dist/Westlaw Advantage US.js` + `m0/csl/bluebook-law-review-westlaw-us.csl` only
  in a disposable, unsynced profile.
- Real fixtures for G3 (SCOTUS), G6 (state high court), G7 (real WL-only opinion).
- Plan §14 questions (Bluebook context, history printing, parallel cites, snapshot fallback acceptance, sync, ToS).

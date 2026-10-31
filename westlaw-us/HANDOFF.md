# Handoff — Westlaw US → Zotero build loop

Last updated: end of orchestrator session 3. Branch `main`, pushed to `origin` (private `mkant18/zotero_law`).

## How the loop runs
- **Orchestrator** (Opus 5.5) = reviewer + planner only; does not edit source.
- **Builders** = Sonnet/Haiku via pi subagents (approved by user); supersedes prior Ling 3.0 Flash + OpenRouter setup. Builders create and edit source files.
- **Workflow:**
  1. Read first: `westlaw-us/LEDGER.md` (status + findings), `westlaw-us/src/CONTRACT.md` (module conventions, shapes), `westlaw-us/tasks/COMMON.md` (worker hard rules), plan `reports/20-ASTRA-ARCHITECTURE.md`.
  2. Builders: one task per run, edit files in the allowed list only, follow CONTRACT.md conventions (no imports, ES2020 only, module exports).
  3. Workers must run all relevant test suites before returning (no "run these tests to verify" handoffs).
  4. Orchestrator reviews via test results + code inspection; may run additional probe scripts on accepted changes.
- **Windows notes:** `node --test "<dir>/*.test.mjs"` (quoted glob); bare directory argument fails. Build translator: `node westlaw-us/tools/build-translator.mjs` → `dist/Westlaw Advantage US.js`.

## Verify state (session 3 end)
```
node --test "westlaw-us/src/test/*.test.mjs"        # 723/723 pass
node --test "westlaw-us/m0/csl/test/*.test.mjs"     # 28/28 pass
node --test "westlaw-us/m0/probe/test/*.test.mjs"   # 23/23 pass
node --test "westlaw-us/tools/test/*.test.mjs"      # 50/50 pass
node westlaw-us/tools/check-private-data.mjs        # scope to publication files; no sample-path exceptions
node westlaw-us/tools/build-translator.mjs          # → westlaw-us/dist/Westlaw Advantage US.js (stable translatorID 9abca805-707d-4064-958f-e08ac37f0862)
```

## Top 3 offline items (ready to start)
1. **Multi-pin citations:** Detect and model forms like `… 486, 490, 495 (5th Cir. 1999)`; currently flagged as round-trip-mismatch. Priority: low (rare in practice).
2. **Unknown state courts:** Remaining 5–10 states lack intermediate appellate or trial court mappings; currently returned as unknown. List in `westlaw-us/src/PROGRESS-G.md` §5. Safe to add incrementally.
3. **Bluebook 10.4(b) district/division:** Currently drops district/division numbers from abbreviation (e.g., `5th Cir.` instead of `5th Cir., Fourth Division`). Not modelled. Priority: user decision (CSL variant for multi-level citations?).

## User-gated items
- **M0-L live spike** (`westlaw-us/m0/MANUAL-SPIKE.md`): connector origin/cookie acceptance, fallback/snapshot behavior, installed-Zotero CSL proof. Install `dist/Westlaw Advantage US.js` + `m0/csl/bluebook-law-review-westlaw-us.csl` in a disposable, unsynced profile.
- **Real fixtures for G3 (SCOTUS), G6 (state high court), G7 (real WL-only opinion):** Required before M1 sign-off.
- **Plan §14 questions:** Bluebook context, history printing, parallel cites, snapshot fallback, sync, ToS.

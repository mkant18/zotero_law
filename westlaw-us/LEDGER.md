# Westlaw US → Zotero — task / status ledger

Orchestrator: `anthropic/claude-opus-5-5` (Opus 5.5, this session). Workers/reviewers: `openrouter/inclusionai/ling-3.0-flash`
(Ling 3.0 Flash; exact id resolved from the session model registry — variants `-fin`, `-vl`, `:free` NOT used).
Plan: `reports/20-ASTRA-ARCHITECTURE.md`. Workspace: `M:/Coding_Projects/_zotero-research/` (coach-teacher untouched).

Labels: **[V]** verified (command/evidence recorded) · **[I]** inferred · **[P]** proposed · **[B]** blocked.

## 0. Baseline (2026-09-28)
- [V] Repo `main` == `origin/main` (`a96c117`), remote `mkant18/zotero_law` is **PRIVATE** (gh repo view). Only untracked file at start: `reports/20-ASTRA-ARCHITECTURE.md` (left untouched, not staged).
- [V] Upstream clones clean: zotero e863643, zotero-connectors 876e41a, translate dd524ae, utilities 4051881, translators c830037, styles 2e93558.
- [V] Installed Zotero desktop 7.0.32 (read-only `application.ini`); real library at `~/Zotero` — **not touched**. Chrome running — **not accessed**.
- [V] Node v22.21.0, npm 11.18.0. No test deps installed.
- [V] CSL locale cached (ignored) `westlaw-us/.cache/csl-locales/locales-en-US.xml`, CSL locales commit a89adece, sha256 ac864c7c…; `month-09` short = `Sept.`.

## 1. Privacy preparation
- [V] `.gitignore` broadened: entire `/westlaw-samples/`, `/westlaw-us/.private/`, `/westlaw-us/**/out/`, `/westlaw-us/**/node_modules/`, `/westlaw-us/.cache/`, `*.har`, `*.har.json`. Verified with `git check-ignore --no-index` on 9 probe paths (7 ignored, source paths eligible).
- [V] **Already-tracked sensitive-class material (not rewritten, not untracked):** `westlaw-samples/citations-settings.json` (user's Westlaw citation preference values) and `westlaw-samples/cite-matrix/{5th-cir,dc-cir,ddc,ny-appdiv,tex-app}.json` (Westlaw-formatted citation strings, 5 document GUIDs, page titles). Pushed to the private remote in `a96c117`. Scan found **no** tokens/ResourceToken values, cookies, URLs, or zero-width watermark characters in them. Ignore rules do not untrack these; removal would require `git rm --cached` + commit (**user decision**, no history rewrite).
- [V] Tracked `tools/*.js` reference config key *names* (`ResourceToken`, `PageEventIdentifier`) but contain no values. `reports/*` contain no token values (grep).
- [V] Raw HTML / JS dumps (`westlaw-samples/*.html`, `*.txt`) untracked and ignored.

## 2. Milestone status
| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P0 | Privacy prep + ledger + golden registry | orchestrator | done | §1, `golden/GOLDEN-TARGETS.md` |
| M0-A | CSL bridge spike (local derivative + offline citeproc render) | Ling worker | [V] built, 28/28 tests; pending review | `node --test "westlaw-us/m0/csl/test/*.test.mjs"`; orchestrator spot-render of E1–E21/G2i matched brief |
| M0-B | M0 probe translator + mocked failure tests | Ling worker | [V] built, 22/22 tests; pending review | `node --test "westlaw-us/m0/probe/test/*.test.mjs"` |
| M0-C | Private-data checker | Ling worker | [V] 44/44 tests; **false positives** on real repo (see §3) → fix task M0-C2 | `node --test "westlaw-us/tools/test/*.test.mjs"` |
| M0-R | Independent review of M0-A/B/C | Ling reviewers (non-authors) | pending | — |
| M0-L | **Live** connector request path, fallback/snapshot, installed-Zotero CSL proof | user + orchestrator | **[B] blocked on user authorization** | `m0/MANUAL-SPIKE.md` |
| M0-G | M0 go/no-go | orchestrator + reviewer | [B] needs M0-L | — |
| M1.* | Parser/adapters/mapping/CSL/integration | — | [B] gated on M0 go + user decisions | — |

## 2a. Source findings made during M0 prep
- [V] Connector MV3 `ZU.request` → `Zotero.COHTTP` → service-worker `fetch(credentials:'include')` (`zotero-connectors/src/common/http.js` `_requestFetch`).
- [V] Connector adds `Referer` = full page URL for same-origin targets (`common/inject/http.js` `getDefaultReferrer`), set through a DNR header rule (`HEADERS_SPECIAL_HANDLING` incl. Referer/Cookie). Page URL may carry query params; sent only to the same Westlaw origin. Disclose; translator must not set Referer/Origin/Cookie itself.
- [V] `ZU.request` has no timeout option (translate `utilities_translate.js:307`); translator must race its own timer (cannot abort the underlying fetch).
- [V] Pinned CSL locale short months already match Bluebook T12 (`Sept.`, `June`, `July`); style will pin them locally anyway.

## 3. Review findings
- [V] (session 2) Ling 3.0 Flash workers often end their turn after one sentence or degenerate into blank-line loops when given broad briefs. Mitigation that worked: small surgical tasks with exact file + defect lists, run sequentially, plus a `PROGRESS.md` line per step.
- [V] M0-A orchestrator decisions (documented in csl test/README): (1) comparisons normalize U+2019→' (citeproc smart apostrophe) and accept one trailing layout `.`; (2) `Medium:`/`Genre:` Extra lines stay in CSL `note` after `itemToCSLJSON` and become variables via citeproc field-hack — C1 checks either location. Fixed defects: fake Zotero bootstrap → real `utilities/test/init.js` bootstrap; wrong test note sequences (E3/E4/E9/E12/E21 had no genuine subsequent position); invalid CSL (`<if>` outside `<choose>`); genre spacing; double comma before references.
- [V] M0-C checker on real repo: 18 FAIL, all false positives — regex capture patterns `"ResourceToken":"([^"]+)"` in `tools/*.js`, template literals `${…}` in probe tests, the rule description prose in `tasks/M0-C-private-data-check.md`, and R4 on `reports/C1-…md` (a report that merely mentions `<script`/`co_document`). Also `--paths` mode must honour ignore rules (it scanned ignored `westlaw-us/.cache/`).

## 4. Blockers / user decisions
(see final report; batched questions)

## 5. Next bounded task
M0-C2 (checker false-positive fix) ∥ M0-R reviews of M0-A and M0-B (read-only Ling reviewers).

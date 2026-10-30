# Westlaw US → Zotero — task / status ledger

## Field accuracy update (2026-10-11)

- Prior working-tree build timestamp committed as `e1648d1` before implementation.
- Translator 0.2.0 captures explicit lead-opinion authors, preserves literal names, excludes dissent/panel/counsel,
  and flags ambiguous author lines. This user-requested behavior supersedes the original empty-creators policy.
- Full-date, normalized docket, header/service name, and court disagreements require review. Header court
  classification wins conflicts; official reporter omission requires the matching state high court.
- Outgoing validation rejects impossible dates, unsafe authors, and malformed citation numbers. Unsafe optional
  values are removed and flagged; invalid required metadata or failed revalidation prevents completion.
- DOM-only WL records now retain Medium: Westlaw. Built-translator author test and real itemToCSLJSON/citeproc
  regression confirm author metadata survives without changing Bluebook case citation output.
- Offline verification command: `node --test "westlaw-us/src/test/*.test.mjs" "westlaw-us/m0/csl/test/*.test.mjs" "westlaw-us/m0/probe/test/*.test.mjs" "westlaw-us/tools/test/*.test.mjs"`.
  803 tests passed across the final source run and supporting CSL/probe/tool suites. Privacy scan: 0 failures,
  0 warnings on modified code/test directories. Live Westlaw/installed Zotero verification remains pending;
  absent lead lines remain blank.

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
| M0-A | CSL bridge spike (local derivative + offline citeproc render) | Ling worker | [V] done, reviewed by orchestrator; 28/28 | `node --test "westlaw-us/m0/csl/test/*.test.mjs"` |
| M0-B | M0 probe translator + mocked failure tests | Ling worker | [V] done, review fixes applied (styles=/forms= wired, positional long-text fallback removed); 23/23 | `node --test "westlaw-us/m0/probe/test/*.test.mjs"` |
| M0-C | Private-data checker | Ling worker | [V] done + M0-C2 false-positive fixes; 50/50; repo fail=0 warn=6 (legacy) | `node --test "westlaw-us/tools/test/*.test.mjs"`; `node westlaw-us/tools/check-private-data.mjs` |
| M0-R | Review of M0-A/B/C | orchestrator (Ling reviewers unreliable, see §3) | [V] done | §3 |
| M0-L | **Live** connector request path, fallback/snapshot, installed-Zotero CSL proof | user + orchestrator | **[B] blocked on user authorization** | `m0/MANUAL-SPIKE.md` |
| M0-G | M0 go/no-go | orchestrator + reviewer | [B] needs M0-L | — |
| M1-A1 | `src/text.js`, `src/reporters.js` | Ling | [V] done, reviewed | tests text/reporters |
| M1-A2 | `src/cite-parse.js` (standard/texas/westlaw-inventory, short names, R4 round-trip fix) | Sonnet worker | [V] done; R4 fixed (dateText + historySep + pinAfter; WL forms round-trip dockets and full dates); G7 validated-profile | tests cite-parse |  
| M1-C | `src/dom.js` + fake DOM helper; W7 fallback selectors; W9 review reasons | Sonnet worker | [V] done; header-fallback + conflicting-header forwarded to rec.reviewReasons | tests dom |
| M1-D | `src/map.js` | Sonnet worker | [V] done | tests map |
| M1-E | `src/service.js` (requests, fetch/classify, envelope); W2 echo checks | Sonnet worker | [V] done; wlSvcReadEnvelope validates echo format options; malformed-envelope hardened | tests service |
| M1-G | `src/profile.js` court table + omission policy; W3 court backlog; W4 fixes; W10 NY Sup. Ct. trial court | Sonnet worker | [V] done; P1 SCOTUS any-reporter; P2 bankruptcy + 20 state appeals courts; P4 NY trial court + Appellate rules; Or./Md./WV/DC fixes | tests profile |
| M1-H | `src/reconcile.js`; W9 envelope/DOM reasons forwarding | Sonnet worker | [V] done; wlRecAddEnvelopeReasons + wlRecAddDomReasons forward review reasons; conflicting-header demotes, header-fallback informational | tests reconcile |
| M1-I | `src/translator.js` + `tools/build-translator.mjs` → `dist/Westlaw Advantage US.js` | Sonnet worker | [V] done; bare JSON header, stable ID, license, test-case block, real function decls, doWeb B-routing | tests translator |
| M1-J | offline golden pipeline (reconcile→map→itemToCSLJSON→citeproc) | Sonnet worker | [V] done; G1–G7 all validated-profile; 44/44 pass | `node --test "westlaw-us/src/test/golden-pipeline.test.mjs"` |
| M1-install | Installation guide for INSTALL.md | Sonnet worker | [V] done; doc-only | n/a |
| M1-live | Real Chrome/connector/Zotero install + real SCOTUS/state-high/WL-only fixtures | user | [B] gated on M0-L + user decisions (plan §14) | — |

All M1 work is **at-risk pre-gate** (plan says proceed after M0 go); it is needed under either M0-L outcome (service-enriched or DOM-only).
Full suite (session 3 end): `node --test "westlaw-us/src/test/*.test.mjs"` → 723/723 pass; CSL 28/28; probe 23/23; tools 50/50; check-private-data: fail=0 warn=6 (legacy).

## 2a. Source findings made during M0 prep
- [V] Connector MV3 `ZU.request` → `Zotero.COHTTP` → service-worker `fetch(credentials:'include')` (`zotero-connectors/src/common/http.js` `_requestFetch`).
- [V] Connector adds `Referer` = full page URL for same-origin targets (`common/inject/http.js` `getDefaultReferrer`), set through a DNR header rule (`HEADERS_SPECIAL_HANDLING` incl. Referer/Cookie). Page URL may carry query params; sent only to the same Westlaw origin. Disclose; translator must not set Referer/Origin/Cookie itself.
- [V] `ZU.request` has no timeout option (translate `utilities_translate.js:307`); translator must race its own timer (cannot abort the underlying fetch).
- [V] Pinned CSL locale short months already match Bluebook T12 (`Sept.`, `June`, `July`); style will pin them locally anyway.

## 3. Review findings (this session and prior)

### Prior sessions (session 2 + earlier)
- [V] (session 2) Ling 3.0 Flash workers often end their turn after one sentence or degenerate into blank-line loops when given broad briefs. Mitigation that worked: small surgical tasks with exact file + defect lists, run sequentially, plus a `PROGRESS.md` line per step.
- [V] M0-A orchestrator decisions (documented in csl test/README): (1) comparisons normalize U+2019→' (citeproc smart apostrophe) and accept one trailing layout `.`; (2) `Medium:`/`Genre:` Extra lines stay in CSL `note` after `itemToCSLJSON` and become variables via citeproc field-hack — C1 checks either location. Fixed defects: fake Zotero bootstrap → real `utilities/test/init.js` bootstrap; wrong test note sequences (E3/E4/E9/E12/E21 had no genuine subsequent position); invalid CSL (`<if>` outside `<choose>`); genre spacing; double comma before references.
- [V] M0-C checker on real repo: 18 FAIL, all false positives — regex capture patterns `"ResourceToken":"([^"]+)"` in `tools/*.js`, template literals `${…}` in probe tests, the rule description prose in `tasks/M0-C-private-data-check.md`, and R4 on `reports/C1-…md` (a report that merely mentions `<script`/`co_document`). Also `--paths` mode must honour ignore rules (it scanned ignored `westlaw-us/.cache/`).
- [V] (session 2) Ling reviewers (`reviewer` agent: no bash; `worker` agent in read-only mode) repeatedly ended without output. Orchestrator performed reviews directly with adversarial probe scripts; every wave found real defects (see git log messages for fixes). Workers perform well only on small, exact defect lists.
- [V] Notable wrong-data defects caught and fixed: generic "Supreme Court of <State>" prefix-matched "Supreme Court of New York, Appellate Division." → `N.Y.`; Texas history taken from the standard form duplicated "writ denied"; service citation conflicting with DOM exported as a parallel; `Nos.` docket lists mangled; `extra` emitted as array; built translator started with `var header =` and regenerated its translatorID each build.
- [V] `parallelCiteRule=westReporterOnly` IS accepted (cite-matrix has all 4 rules); the reports/10 §3 note "only CAFormat/allReporter" is stale.

### This session (session 3 — Sonnet/Haiku builders)
- **[V] R4 (WL round-trip):** fixed `wlCiteRoundTrip` to preserve dockets, full date-text (`dateText`), and pin position via new ParsedLongForm fields. Added `historySep` field, recompose as `name + dockets + citations (pin at original position) + (court dateText|year[, suffix]) + historySep + history`. G7 now validated-profile.
- **[V] Envelope echo checks:** wlSvcReadEnvelope validates echoed format options; if any echo key is present and mismatches the `expect` value, that style is rejected (echo-mismatch review reason). Translator-level policy: if ANY style in a request has echo-mismatch, entire envelope is unusable (falls back to DOM).
- **[V] Malformed-envelope hardening:** added envelope structural validation; missing `responses` array is caught, not crashed on.
- **[V] DOM review reasons forwarding:** wlRecAddDomReasons and wlRecAddEnvelopeReasons now forward review reasons from envelope and DOM into rec.reviewReasons; conflicting-header demotes profile to unverified; header-fallback is informational (non-demoting).
- **[V] Court-table expansion (W3/W4/W10):** added 20+ state court entries (PA/OH/FL/NJ/LA/VA/MD/CT/TN/MO/WA/AZ intermediate appellate courts; NY trial-court Supreme Court; bankruptcy courts; state high court fixes for Or./Md./WV/DC). Profile tests 228/228.
- **[V] Docket forms (P1-2):** docket regions now support `&` and `and` joins, and short parentheticals like `(JPO)`. Added review reason `docket-in-name` when name still contains `, No. / Nos. ` after peeling.
- **[V] Input-length guard (P2):** parse entry points return `{ ok:false, reason:'input-too-long' }` for cleaned input > 2000 chars.
- **[V] Texas fixes:** Texas date parentheticals now correctly preserve full date-text (no court-swallowing). Added explicit Texas rules for date parsing.
- **[V] Item-field snapshot (W7):** added Scaffold-style full-field diff for G1/G2/G4/G5/G7 with `item-fields.test.mjs` + expected.json.
- **[V] B-routed doWeb:** translator now correctly routes echo-mismatched requests to B (westlaw-style), only using A when validated; 4 doWeb routing tests added.

## 4. Blockers / user decisions
- [B] M0-L live spike needs user authorization (plan §11 M0, `m0/MANUAL-SPIKE.md`).
- [B] Plan §14 open questions 1–10 remain unanswered (Bluebook context, history printing, parallel cites, snapshot fallback, sync, ToS).

## 5. Remaining open items
1. **Offline items (no user gate):**
   - Multi-pin citation forms (flagged via round-trip mismatch, not modelled)
   - `No. 1 Shoe Co.`-style name/docket ambiguity (over-peel known, low priority)
   - Kentucky pre-1976 Court of Appeals highest-court date-aware classification (no date logic)
   - Bluebook 10.4(b) district/division display (not modelled; numbers currently dropped)
   - Remaining unknown-court states (list in `westlaw-us/src/PROGRESS-G.md`)
2. **User-gated items:**
   - M0-L live spike (`m0/MANUAL-SPIKE.md`): connector origin/cookie acceptance, fallback/snapshot behavior, installed-Zotero CSL proof.
   - Real fixtures for G3 (SCOTUS), G6 (state high court), G7 (real WL-only opinion).
   - Plan §14 questions.

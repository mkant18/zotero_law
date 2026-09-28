# Zotero + Chrome Connector + Westlaw — Consolidated Findings (investigation only)

Sources: shallow clones in `M:/Coding_Projects/_zotero-research/` (zotero, zotero-connectors, translate, utilities, translators, styles).
Scout reports: A, C1, E, F1 (DeepSeek V4 Flash); C2, D, F2 (Ling 3.0 Flash, 2nd attempt). Report B failed twice (Ling) — its scope was verified directly by the orchestrator (below).
Legend: ✅ verified in source/URL by ≥2 independent checks (scout + cross-audit or orchestrator) · ☑️ verified once · ❓ unknown (needs Westlaw login).

---

## 1. How the Chrome connector (MV3) turns a page into a Zotero item

1. Content script (`browserExt/inject/inject.jsx`) is injected into every http(s) page; `PageSaving.onPageLoad()` (`common/inject/pageSaving.js:95`) runs detection. ✅
2. **Stage 1 – URL match:** every web translator has a `target` regex; `Zotero.Translators.getWebTranslatorsForLocation()` keeps those whose regex matches. Translators with `target: ""` are generic (Embedded Metadata 320, COinS 310, DOI 400). ✅
3. **Stage 2 – `detectWeb(doc,url)`** runs in a sandbox (MV3: offscreen document) for each candidate; returns an itemType string (`"case"`), `"multiple"`, or falsy. Candidates sorted by `priority` (lower = wins; site translators use 100). ✅
4. Toolbar icon = itemType of best translator (`treeitem-case` icon for cases). ✅
5. **Save:** `doWeb` → `new Zotero.Item("case")` … `item.complete()` → `ItemSaver` → desktop Zotero `POST localhost:23119/connector/saveItems` (`server_connector.js:301`); if desktop is offline → zotero.org API via OAuth. ✅
6. **No translator matched** → `saveAsWebpage` → `/connector/saveSnapshot` (`server_connector.js:608`) → itemType **`webpage`** + SingleFile snapshot. ✅
7. **SPA handling:** background listens to `webNavigation.onHistoryStateUpdated` (`background.js:1343`) and re-runs detection on pushState navigation; translators may call `Zotero.monitorDOMChanges(target)` during detect to re-detect when content loads late (`translate.js:735`). ☑️ Relevant because Westlaw is a JS-heavy app.
8. **Proxies:** `common/proxy.js` auto-detects EZproxy/OpenAthens hosts and de-proxifies URLs; translator `target` regexes are matched against de-proxied URLs. ☑️
9. **Translator distribution:** connector gets metadata/code from desktop Zotero (`/connector/getTranslators`, `/getTranslatorCode`), falling back to `repo.zotero.org`; 24 h update cycle; desktop hash change on ping triggers refresh. **A custom `.js` dropped into `<Zotero data dir>/translators/` (or made in Scaffold) is served to the connector immediately** — no repo release needed. ✅

## 2. What happens on US Westlaw today

- Only Westlaw translator in existence: `WestLaw UK.js`, `target: ^https://uk\.westlaw\.com/Document/`. No US/Classic/Edge/Precision translator, now or historically (grep of all 5 repos + `gh search`). ✅
- Embedded Metadata's `detectWeb` (`Embedded Metadata.js:229`) returns falsy when a page has no meta/RDF data → nothing matches → **grey icon, saved as `webpage`** (title + URL + snapshot). Consistent with issue zotero/translators#2887 ("captured files are simply 'web' entries"). ✅ (Whether Westlaw emits *any* `<meta>`/OG tags is ❓.)
- Open issue **#2887 "Add translator for Westlaw Classic"** (2022, OPEN, one maintainer reply: "Please link some example pages"). ✅

## 3. Zotero `case` schema → CSL → Bluebook

`schema.json` itemType `case` (verified by orchestrator):

| Zotero field | CSL variable | Notes |
|---|---|---|
| caseName (base title) | title | |
| court (base authority) | authority | printed **verbatim** |
| dateDecided (base date) | issued | |
| docketNumber (base number) | number | |
| reporter | container-title | |
| reporterVolume (base volume) | volume | |
| firstPage (base pages) | page / page-first | |
| history | references | not used by Bluebook styles |
| shortTitle | title-short | used for short cites |
| extra | note | `Key: value` lines parsed as CSL overrides (`utilities_item.js:844`, e.g. `authority:`, `container-title-short:`) |
| creators | author (primary), counsel, contributor | |

CSL type mapping `legal_case → case`. ✅
No fields for jurisdiction, parallel citation, WL citation, pin cite (pin cite comes from the citation *locator* at cite time). Juris-M (fork) adds jurisdiction, division, yearAsVolume, abbreviation machinery. ☑️

`bluebook-law-review.csl` legal_case first cite (`:138-150`): `title, volume container(short) page-first, locator (authority year)`; `issuance` for legal_case = `authority` + year (`:263-267`); subsequent cite `title(short), volume container-title(short) at page`. URLs suppressed for legal_case. ✅
`bluebook-inline.csl` additionally prints `number` (docket) and full month/day/year. ✅

**Consequences (observations):**
- `court` must already be the Bluebook court abbreviation (`9th Cir.`, `S.D.N.Y.`, `Cal. Ct. App.`); Zotero's `abbreviations.json` only covers `container-title` (journal titles), no court category (`cite.js:444-520`, `resource/schema/abbreviations.json`). ✅
- For SCOTUS the Bluebook parenthetical is just `(1973)` → `court` would have to be empty/omitted for U.S. Reports cites, otherwise the style prints `(U.S. 1973)` or whatever string is stored. ☑️ (style logic read by orchestrator)
- Reporter must be stored as the Bluebook abbreviation (`F.3d`, `U.S.`); `form="short"` falls back to the stored value. ☑️
- Parallel citations / WL cites have no native slot; existing translators put them in `history` (CourtListener) or create one item per reporter linked via seeAlso (Google Scholar). ✅

## 4. Existing legal translators worth copying

| Translator | Extraction | Parallel cites | Creators | Tests |
|---|---|---|---|---|
| **Lexis+.js** (closest analog, auth-walled) | DOM: `h1#SS_DocumentTitle`, `span.active-reporter` split on spaces, `p.SS_DocumentInfo`[0]=court, `span.date`, docket regex-gated | no | no | **empty** (login wall) ✅ |
| **CourtListener.js** | DOM `.citation .volume/.reporter/.page`, fallback regex `^(\d+)\s((?:[A-Z][a-z]?\.\s?)+(?:[2-3]d)?(?:Supp\.)?)\s(\d{1,4})`, extra cites → `history`, judges → `author` (`:97-123`) | yes (history) | yes | 5 ✅ |
| **Google Scholar.js** | parses citelet string ("X v. Y, 395 US 486 - Supreme Court 1969") via ItemFactory | one item per reporter, seeAlso | no | 6 ☑️ |
| **WestLaw UK.js** | delegates to Embedded Metadata then overrides; `#co_docHeaderContainer`, `#co_docContentWhereReported`, `#co_docContentCourt` | picks first non-WLUK | no | real URLs (fail in CI) ✅ |

No shared reporter/court abbreviation helper anywhere in translators/translate/utilities. ☑️
Note: WestLaw UK uses the same `co_` DOM naming family as US Westlaw (same Thomson Reuters "Cobalt" platform) — INFERRED.

## 5. US Westlaw page anatomy (public evidence only)

From open-source scrapers (verified by fetching their source):
- `nnormandin/CitationMachine` `old/westlaw_parser.py:55-70`: `h2#co_docHeaderTitleLine[title]` = case name, `span#courtline` = court, `span#filedate` = date, `span#cite0/#cite1/#cite2` = citations. ✅ (age of code unknown — may be stale)
- `edcottrell/Research-Tools` `main.js`: `.co_courtBlock`, `.co_docketBlock`, `.x_opinionBody`, `.x_opinionDissent`, `.co_starPage`, `#co_document_0`. ✅
- URL shapes: `https://1.next.westlaw.com/Document/I<32hex>/View/FullText.html?...`, `/Link/Document/FullText?findType=Y&cite=...`, search at `/Search/Results.html`. ☑️ (from ezpaarse / westlaw-epub; not confirmed live)

❓ Needs a logged-in look: current selectors (Edge/Precision may differ), where the WL cite (`2024 WL 1234567`) appears, whether `#citeN` order = official reporter first, judge/panel markup, whether any `<meta>` tags exist, what "Copy with Reference" produces, whether RIS/citation-list export exists, whether content is inside iframes, whether search-result pages expose enough to support `"multiple"`.

## 6. Policy / ecosystem

- fbennett (Juris-M / citeproc-js author), 2015-09-26, forum comment 235058 (verbatim verified): "I'm not likely to build a site translator for WestLaw or Lexis unless they make it clear that it's not caught by their terms of use…" ✅
- adamsmith, 2013, comment 169881 (verbatim verified): Westlaw/Lexis unsupported "due to the terrible state of systematic citation metadata in the legal field." ✅
- Yet Lexis+.js (2023) and WestLaw UK.js (2022) were **merged** into the official repo → maintainers do accept login-walled legal translators, with empty/unrunnable tests. ✅
- Translator repo CI (`translators/.github/workflows/ci.yml`) builds the connector in Chromium and runs `testCases`; lint via custom eslint plugin (header JSON, translatorID, lastUpdated, license, robust querySelector…). ☑️

## 7. Scout-process notes

- DeepSeek V4 Flash: all 4 lanes produced substantive, largely accurate reports (minor line-number drift).
- Ling 3.0 Flash: 1st pass all 4 lanes failed (runaway repetition / empty output). 2nd pass with tight budgets: 3/4 succeeded (C2, D, F2 useful but shallower); schema lane hit its hard tool budget and ended without writing.

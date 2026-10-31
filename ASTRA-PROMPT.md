You are Astra, the architecture advisor. Produce a PLAN / ARCHITECTURE (no implementation code beyond short illustrative snippets) for a new personal, local Zotero web translator: "Westlaw Advantage (US) → Zotero `case` items that cite cleanly in Bluebook."

## Goal and constraints (from the user)
- Personal use only: a local translator .js file placed in the Zotero data directory `translators/` folder (served to the Chrome connector automatically). Possible upstream contribution later, not now.
- User's platform: Westlaw Advantage at `https://1.next.westlaw.com/...`; Chrome with the Zotero Connector (Manifest V3); Zotero desktop; Windows.
- Output target: Bluebook citations for ALL courts and reporters (federal and every state), via Zotero's CSL Bluebook styles.
- Problem being solved: today, saving from Westlaw with the connector produces a generic "Web Page" item (title = "Case | Cases | Jurisdiction | Westlaw Advantage"). Westlaw's own "Copy with Reference" is fine; the Zotero save is what is broken.
- Work lives in `M:/Coding_Projects/_zotero-research/` (NOT in the coach-teacher repo). Never commit the Westlaw sample HTML (it contains full opinion text and the user's account identifiers).

## Read these first (all evidence-backed)
1. `M:/Coding_Projects/_zotero-research/reports/00-SYNTHESIS.md` — how Zotero, the connector, translators, the `case` schema → CSL mapping, and the Bluebook CSL styles work; comparable translators (Lexis+, CourtListener, Google Scholar, WestLaw UK).
2. `M:/Coding_Projects/_zotero-research/reports/10-WESTLAW-LIVE-FINDINGS.md` — live Westlaw page anatomy and the Copy-with-Reference citation service, including the full option map and test matrix (§5–6).
3. Synthetic test evidence: `westlaw-us/src/test/fixtures/`. Real page/sample/preference captures remain private and are not required; source clones `zotero/`, `zotero-connectors/`, `translate/`, `translators/`, `styles/`, `utilities/`.
4. Supporting scout reports: `reports/A-*.md` (connector architecture), `E-*.md` (CSL/Bluebook + dev workflow), `D-*.md` (legal translators), `C1/C2` (Westlaw background, ToS history).

## Key facts you must design around
- No metadata tags on Westlaw pages; data comes from the DOM: `#co_docHeaderCitation > li` (court, filedate, cite0..N, page count — IDs vary between `courtline/cite0` and `chapter/chapter0`, list duplicated by a sticky header), `.co_docketBlock`, `.co_partyLine`, `.co_panelBlock`, `.x_leadAuthorLine`, star pages `co_pp_sp_<seriesId>_<page>`, embedded config JSON with `DocumentGuid`, `ContentType`, `PageEventIdentifier`, `ResourceToken`, and service hosts.
- Hidden zero-width-character watermark inside `.co_title` → must be stripped from anything stored.
- Citation service: `GET /RelatedInfo/v2/citestyles/{DocumentGuid}` with headers `X-Requested-With`, `x-cobalt-exectype`, `x-cobalt-pcid`, `x-cobalt-rtid`, `x-cobalt-host` (values in page config). Options: 39 `styleIDs` (standard ≈ Bluebook, westlaw, alwd, 36 states), `parallelCiteRule` ∈ {CAFormat, allReporter, officialReporterOnly, westReporterOnly}, `subStyle` ∈ {LegalBriefs, LawReviews}, `history`, `pubPages`. Returns long/short/Id./enhanced forms.
- Observed best Bluebook recipe: `standard` + `westReporterOnly` + `history=true` (e.g. `Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)`); Texas needs the `texas` style for `(Tex. App.—Beaumont 1988, writ denied)`; `allReporter` / `westlaw` style expose WL cite, all dockets, exact date.
- Zotero `case` fields: caseName, court (→ CSL authority, printed verbatim), dateDecided, docketNumber, reporter, reporterVolume, firstPage, history, shortTitle, extra (supports CSL `Key: value` overrides), url; creators author/counsel/contributor. No native slot for parallel/WL cites or jurisdiction. Zotero has no court-abbreviation table.
- MV3 connector relays translator HTTP requests to the extension service worker (`fetch`, credentials included, custom headers forwarded). UNTESTED: whether Westlaw accepts `Origin: chrome-extension://…`.
- Westlaw is a JS app; connector re-detects on pushState; translators can use `Zotero.monitorDOMChanges`.

## What the plan must decide (give a recommendation + rationale + rejected alternatives for each)
1. Data-source strategy: DOM-only vs citation-service vs hybrid; primary/fallback order; behaviour when the service call fails (origin rejection, session expiry, 4xx).
2. Parsing strategy for the service's formatted strings into structured fields (name, volume, reporter, page, court parenthetical, year, subsequent history), robust to all 39 styles' quirks you choose to use; which style/option combination(s) to request per jurisdiction (e.g. Texas special case; how to discover other state-specific exceptions).
3. Field mapping to Zotero `case`, including Bluebook court-parenthetical rules (omit court when reporter implies it — U.S. Reports, state official reporters; court+year otherwise), exact vs year-only dates, WL-only unpublished opinions (docket + WL cite + full date), parallel cites / WL cite / history placement (history vs extra), shortTitle, creators (judges?), url canonicalisation to `/Document/<GUID>/View/FullText.html`.
4. Which Zotero CSL style the user should cite with (bluebook-law-review vs bluebook-inline vs a customised local CSL), and whether a small CSL tweak is needed for anything the fields cannot express.
5. Detection & scope: detectWeb rules (title "| Cases |", config ContentType), SPA timing, search-result pages ("multiple") yes/no for v1, other content types (statutes, secondary sources) deferred or included.
6. Attachments: snapshot or not (full text + watermark), PDF delivery or not.
7. Testing & dev workflow without CI: fixture-based tests from saved HTML + recorded service JSON, Scaffold usage, a verification checklist against real Bluebook outputs; how to test the connector-origin risk first (spike).
8. Maintenance/robustness: selector fallbacks, versioning, how the user updates the local file, logging/debug.
9. Risks: ToS/rate considerations for personal use, data privacy (no account identifiers stored), breakage modes.

## Deliverable
A single markdown plan written to `M:/Coding_Projects/_zotero-research/reports/20-ASTRA-ARCHITECTURE.md` containing: architecture overview (diagram), module/function breakdown of the translator, the decisions above, a phased milestone plan (spike → v1 → hardening), acceptance criteria per milestone (concrete example citations for federal appellate, federal district, SCOTUS, NY App. Div., Texas App., state high court, WL-only unpublished), and open questions for the user. Do not implement the translator yet. Mark anything you infer rather than verify.

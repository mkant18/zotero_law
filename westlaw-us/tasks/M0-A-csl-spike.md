# M0-A — CSL bridge spike (offline)

Read `westlaw-us/tasks/COMMON.md` first; its rules override anything here.
Plan sections: `reports/20-ASTRA-ARCHITECTURE.md` §5 (field contract, Extra bridge, WL-only mapping), §6 (CSL derivative), §11 M0 item 7 + golden table. Registry: `westlaw-us/golden/GOLDEN-TARGETS.md`.

## Objective
Prove offline that the proposed Zotero field + Extra contract (`Medium:`, `Genre:`, native `history`→`references`) survives
Zotero's item→CSL conversion and renders correctly through citeproc-js with a small local derivative of Bluebook Law Review.
This is a SPIKE; installed-Zotero verification is a separate, later gate — do not claim it.

## Allowed files (create only under this directory)
`westlaw-us/m0/csl/**`

## Read-only inputs
- `styles/bluebook-law-review.csl` (upstream styles commit 2e93558) — base to copy.
- `zotero/chrome/content/zotero/xpcom/citeproc.js` (citeproc-js 1.4.61) — load it read-only (e.g. `vm.runInThisContext` / `new Function` over the file text, or `require` via a small shim). It has `CSL.parseXml`; field-hack (`note` → `Key: value` variables) is on by default.
- `utilities/utilities_item.js` (`Zotero.Utilities.Item.itemToCSLJSON`, `extraToCSL`), `utilities/schema.js`, `utilities/utilities.js`, `utilities/date.js`, `utilities/cachedTypes.js`, `utilities/resource/zoteroTypeSchemaData.js`, `utilities/resource/dateFormats.json`; see `utilities/test/init.js` for the minimal global `Zotero` bootstrap (do NOT use chai/mocha).
- `zotero/resource/schema/global/schema.json` (schema for `Zotero.Schema.init`).
- `westlaw-us/.cache/csl-locales/locales-en-US.xml` (pinned CSL locale).

## Deliverables
1. `westlaw-us/m0/csl/bluebook-law-review-westlaw-us.csl` — copy of the upstream style with:
   - `<id>` and self `<link>` = `http://local.invalid/styles/bluebook-law-review-westlaw-us`; `<title>` = `Bluebook Law Review (Westlaw US local)`; keep all original authors/contributors and the CC BY-SA 3.0 `<rights>`; add an XML comment recording "derived from zotero/styles bluebook-law-review.csl @ 2e93558 (updated 2025-05-06)" and a short change list; set `<updated>` to `2026-09-28T00:00:00+00:00`.
   - Style-local `<locale>` month short terms pinned to Bluebook T12: Jan. Feb. Mar. Apr. May June July Aug. Sept. Oct. Nov. Dec. (so output does not depend on the host's locale version).
   - Changes ONLY in `legal_case` paths:
     a. Reported case first cite: `title, volume reporter page-first[, locator] (authority year[, genre])[, references]`. No docket, no month/day. Remove the `text-case="title"` transform on the case title (names are pre-normalized; must print verbatim).
     b. WL-primary branch, selected ONLY by presence of `medium` (`<if variable="medium">`): `title, number, volume reporter page-first[, at locator] (authority Mon. D, YYYY)`. Without locator no `, at`.
     c. `genre` appended after the year inside the parentheses with `, ` (Texas writ/petition status).
     d. `references` (Zotero `history`) appended after the closing parenthesis with `, ` on FIRST (non-subsequent, non-ibid) cites only.
     e. Subsequent legal_case: `short-title, volume reporter at locator`; if no locator: `short-title, volume reporter page-first` (no dangling `at`). WL-primary subsequent: `short-title, volume WL id, at locator` / no locator: `short-title, volume WL id`. No genre, history, court, or date in short forms.
     f. ibid / ibid-with-locator unchanged in meaning: `Id.` / `Id. at <locator>` (the style supplies `at`; the user types `*4` for star pages).
   - Do not implement `annote` in this spike (record as not implemented).
2. `westlaw-us/m0/csl/harness/render.mjs` — exports a function that takes Zotero-style item JSON objects and a list of citation clusters (each: `[{id, locator?, label?}]`, sequential noteIndex 1..n) and returns per-cluster `{text, html}` plus the intermediate CSL-JSON per item. Pipeline MUST be: Zotero item JSON → `Zotero.Utilities.Item.itemToCSLJSON` (this applies `extraToCSL` to Extra) → citeproc-js engine (`processCitationCluster` or equivalent with positions) using the derivative style + pinned locale. No network, no npm packages.
3. `westlaw-us/m0/csl/fixtures/items.json` — synthetic Zotero `case` items (itemType `case`, fields `caseName, court, dateDecided, docketNumber, reporter, reporterVolume, firstPage, history, shortTitle, extra`; `creators: []`). Use exactly these (synthetic metadata, no Westlaw raw output):
   - `G1` Sanchez v. Liggett & Myers, Inc. | court `5th Cir.` | date `1999-08-25` | docket `No. 98-40679` | `F.3d` 187 486 | short `Sanchez` | extra lines: `Westlaw alternate WL citation: 1999 WL 652310`, `Westlaw court (raw): United States Court of Appeals, Fifth Circuit.`, `Westlaw jurisdiction: US-FED-CA5`, `Westlaw translator: m0-spike`
   - `G2` United States v. Philip Morris USA, Inc. | `D.D.C.` | `2006-08-17` | `F. Supp. 2d` 449 1 | short `Philip Morris USA, Inc.` | history `aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)`
   - `G2i` same as G2 but id G2i and history `<i>aff'd in part, vacated in part</i>, 566 F.3d 1095 (D.C. Cir. 2009)` (typography observation)
   - `G3` Brown v. Bd. of Educ. | court EMPTY | `1954-05-17` | `U.S.` 347 483 | short `Brown`
   - `G4` Miele v. Am. Tobacco Co. | `App. Div.` | `2003-12-29` | `N.Y.S.2d` 770 386 | short `Miele` | extra: `Westlaw parallel citation: 2 A.D.3d 799`, `Westlaw alternate WL citation: 2003 WL 23099090` (NO Medium line)
   - `G5` Rogers v. R.J. Reynolds Tobacco Co. | `Tex. App.—Beaumont` (U+2014) | `1988` | `S.W.2d` 761 788 | short `Rogers` | extra `Genre: writ denied`
   - `G5h` same as G5 plus history `disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)`
   - `G7` Example v. Sample | `D. Kan.` | `2024-03-01` | `No. 24-123` | `WL` 2024 1234567 | short `Example` | extra `Medium: Westlaw`
   - `G7s` Sample v. Example | `D. Kan.` | `2024-09-05` | `No. 24-456` | `WL` 2024 7654321 | short `Sample` | extra `Medium: Westlaw`
   - `G7j` Doe v. Roe | `S.D.N.Y.` | `2023-06-03` | `No. 23-789` | `WL` 2023 1111111 | short `Doe` | extra `Medium: Westlaw`
   - `GX` Doe v. eBay Inc. | `N.D. Cal.` | `2015` | `F. Supp. 3d` 100 200 | short `eBay`
4. `westlaw-us/m0/csl/fixtures/expected.json` — copy these EXACTLY (plain text; tests compare after removing one trailing `.` added by the style's layout suffix):
   - E1 `[G1]` → `Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)`
   - E2 `[G1 @490]` → `Sanchez v. Liggett & Myers, Inc., 187 F.3d 486, 490 (5th Cir. 1999)`
   - E3 subsequent `[G1 @490]` (after an intervening different cite) → `Sanchez, 187 F.3d at 490`
   - E4 subsequent `[G1]` no locator (after an intervening cite) → `Sanchez, 187 F.3d 486`
   - E5 ibid `[G1]` → `Id.`
   - E6 ibid-with-locator `[G1 @491]` → `Id. at 491`
   - E7 `[G5]` → `Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)`
   - E8 `[G5h]` → `Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied), disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)`
   - E9 subsequent `[G5h @791]` → `Rogers, 761 S.W.2d at 791`
   - E10 `[G7 @*4]` → `Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)`
   - E11 `[G7]` first, no locator (separate document/sequence) → `Example v. Sample, No. 24-123, 2024 WL 1234567 (D. Kan. Mar. 1, 2024)`
   - E12 subsequent `[G7 @*4]` → `Example, 2024 WL 1234567, at *4`
   - E13 ibid-with-locator `[G7 @*5]` → `Id. at *5`
   - E14 `[G7s]` → `Sample v. Example, No. 24-456, 2024 WL 7654321 (D. Kan. Sept. 5, 2024)`
   - E15 `[G7j]` → `Doe v. Roe, No. 23-789, 2023 WL 1111111 (S.D.N.Y. June 3, 2023)`
   - E16 `[G4]` → `Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)`
   - E17 `[G2]` → `United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)`
   - E18 `[G3 @495]` → `Brown v. Bd. of Educ., 347 U.S. 483, 495 (1954)`
   - E19 one cluster `[G1, G4]` → `Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999); Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)`
   - E20 `[GX]` → `Doe v. eBay Inc., 100 F. Supp. 3d 200 (N.D. Cal. 2015)`
   - E21 subsequent `[G2 @15]` → `Philip Morris USA, Inc., 449 F. Supp. 2d at 15`
5. `westlaw-us/m0/csl/test/render.test.mjs` (node:test) asserting every E-string, arranged in explicit note sequences so positions (first/subsequent/ibid) are genuine. Also assert:
   - H1: E3 html italicizes the short name (`<i>Sanchez</i>`); E5 html italicizes `Id.`; E1 html does NOT italicize the full case name (law-review footnote full cite is roman).
   - H2: `[G2i]` first cite — record whether html contains `<i>aff'd in part, vacated in part</i>` and plain text contains no `<i>` tags. Assert the plain text equals E17 text.
   - C1: CSL-JSON of G7 has `medium`; G4 and G1 do NOT have `medium`; G5 has `genre: "writ denied"`; G2 has `references`; G1 has `number` and full `issued` date parts [1999,8,25] even though not printed.
   - C2: Diagnostic Extra lines (`Westlaw …`) do not create CSL variables (list the CSL-JSON keys for G1 and assert only expected keys: id, type, title, title-short, authority, issued, number, container-title, volume, page, page-first(if produced), note/extra-derived, etc. — decide the exact allowed set from what itemToCSLJSON legitimately produces and explain it in the README) and do not change E1.
   - C3: Rendered text never contains `WL` for G1/G4 and never contains the docket for G1/G4/G5.
6. `westlaw-us/m0/csl/README.md`: change list vs upstream, the Extra contract as implemented, how to run tests, CSL-JSON key findings, observations for H2, and limitations: offline citeproc 1.4.61 from the clone + clone schema, NOT the installed Zotero 7.0.32; CSL schema validation (only claim it if you actually ran a validator — none is installed; say "not run" otherwise).

## Test command
`node --test westlaw-us/m0/csl/test/` (from workspace root). Must pass fully, or report exactly which E/H/C checks fail and why.

## Stop conditions (stop and report instead of improvising)
- Loading citeproc/utilities requires modifying upstream files, npm packages, or network.
- An expected string appears wrong per Bluebook — report it with reasoning; do NOT edit it.
- A requirement is impossible in CSL 1.0 / citeproc-js — report precisely.

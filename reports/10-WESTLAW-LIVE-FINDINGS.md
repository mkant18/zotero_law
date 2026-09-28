# Westlaw Advantage — live page findings (from the user's logged-in Chrome, 2026-09-28)

Method: Chrome DevTools Protocol against the user's running Chrome (read-only: DOM reads + the same
same-origin GETs the page itself makes). Samples: `../westlaw-samples/*.html` (contain full opinion text —
local only, never commit). Tools: `../tools/cdp-daemon.mjs`, `../tools/c.mjs`, `../tools/probe*.js`, `../tools/cite*.js`.

Cases inspected: 566 F.3d 1095 (D.C. Cir.), 449 F.Supp.2d 1 (D.D.C.), 187 F.3d 486 (5th Cir.),
761 S.W.2d 788 (Tex. App.), 2 A.D.3d 799 (N.Y. App. Div., NY Official Reports version); plus one
secondary source (Restatement (Second) of Torts § 876).

## 1. Why Zotero saves a "Web Page" today (confirmed)
- Host `1.next.westlaw.com`; URLs are either `/Document/I<32hex>/View/FullText.html?...` or
  `/Link/Document/FullText?findType=Y&cite=...` (doc GUID then NOT in URL).
- `<title>` = `Case Name | Cases | Jurisdiction | Westlaw Advantage` (secondary: `... | Secondary Sources | National | ...`).
- Meta tags: only content-type, X-UA-Compatible, a generic `description`, viewport, apple-itunes-app.
  **No** citation_*, Dublin Core, OpenGraph, JSON-LD, COinS (Z3988), unAPI, or DOIs on any sample.
- ⇒ No site translator matches (only WestLaw UK, `uk.westlaw.com`), Embedded Metadata/COinS/DOI detect
  nothing ⇒ connector saves `webpage` titled "Miele v American Tobacco Co. | Cases | New York | Westlaw Advantage".
- No iframes; document is in the top frame (`#co_document`). JS-heavy SPA, but document content is in the DOM once loaded.

## 2. Page anatomy (stable across all 5 cases)
| Data | Selector | Notes |
|---|---|---|
| Content type | `document.title.split(' | ')[1]` == "Cases"; also embedded config `"ContentType":"Cases"` | use for detectWeb |
| Doc GUID | embedded config `"DocumentGuid":"I…"`; or `#co_docHeaderTitleLine a[href*="/Document/I"]` | URL may not contain it |
| Case name (Westlaw form) | `#co_docHeaderTitleLine` text (title attr sometimes missing) | e.g. "Miele v American Tobacco Co.", "U.S. v. Philip Morris USA Inc." — NOT Bluebook-abbreviated |
| Header facts | `#co_docHeaderCitation > li` in order: court, filedate, cite0..N, "(Approx. N pages)" | **IDs vary** (`courtline/filedate/cite0` vs NY official `chapter/filedate/chapter0`) → read by position; list appears **twice** (sticky header) → dedupe |
| Court (full) | first li / `.co_courtBlock` | "United States Court of Appeals, Fifth Circuit." |
| Date decided | `li#filedate` | "August 25, 1999" (full date) |
| Citations | li cite0..N / `.co_cites` | first = primary reporter; then parallels (U.S.App.D.C., CCH, Slip Op.). **WL cite not shown** |
| Docket | `.co_docketBlock` | "No. 98–40679." (en-dashes, trailing period, multiple dockets) |
| Full parties | `.co_title .co_partyLine` | long caption |
| Panel / author | `.co_panelBlock`, `.x_leadAuthorLine`, `.x_dissentAuthorLine` | "BROOKSHIRE, Justice.", "PER CURIAM:" |
| Counsel | `.co_attorneyBlock` | |
| Star paging | `.co_starPage` ids `co_pp_sp_<seriesId>_<page>` + hidden JSON `{pageset,pageNumber}` | seriesId 506=F.3d, 4637=F.Supp.2d, 713=S.W.2d, 7049=A.D.3d, 4603=N.Y.S.2d, 781=U.S.App.D.C. |

**Watermark:** `.co_title` contains a hidden `<span style="display:none">` of ~76 zero-width chars
(U+2060–U+2064) — a per-user fingerprint. Any text taken from `.co_title` must strip `[\u200B-\u200F\u2060-\u2064\uFEFF]`;
avoid storing it in Zotero.

## 3. The "Copy with Reference" citation service (key finding)
Endpoint used by the page's Copy-with-Reference: 
`GET /RelatedInfo/v2/citestyles/{DocumentGuid}?contextData=(sc.Default)&styleIDs=<id>&styleIDs=<fallbackId>&underline=false&bold=false&italicize=false&subStyle=LegalBriefs&history=<bool>&parallelCiteRule=<CAFormat|allReporter>[&pubPages=<seriesId>,<page>]`
Required headers (all values in page HTML config): `X-Requested-With: XMLHttpRequest`, `x-cobalt-exectype: async`,
`x-cobalt-pcid: <PageEventIdentifier>`, `x-cobalt-rtid: <ResourceToken>`, `x-cobalt-host: <config "RelatedInfo" host>`.
Without `x-cobalt-host` the server returns an HTML 404.
Style list: `GET /RelatedInfo/v2/citestyles/styles` → `standard` (Bluebook-like), `westlaw`, `alwd`, + 36 state styles.
Response: JSON `responses[].forms[]` with forms `long`, `short` (×2), `specialRef` (Id.), `enhanced`; each as text/html, text/plain, rtf.

Observed (`standard`, CAFormat, history=true):
- `United States v. Philip Morris USA Inc., 566 F.3d 1095 (D.C. Cir. 2009)` — short: `Philip Morris USA Inc., 566 F.3d 1095`
- `Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App. 1988), writ denied (July 12, 1989), and disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)`
- `Miele v. Am. Tobacco Co., 2 A.D.3d 799, 770 N.Y.S.2d 386 (2003)` (standard) vs
  `Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (N.Y. App. Div. 2d Dept. 2003)` (alwd)
- `allReporter` adds every parallel incl. the **WL cite** (`2003 WL 23099090`, `1988 WL 134491`).
- `subStyle` LegalBriefs / LawReview / CourtDocuments made no difference on these samples; `parallelCiteRule` accepts only `CAFormat`, `allReporter` (others → 400).

What this gives a translator that the DOM does not: Bluebook T6-abbreviated case name, Bluebook court
abbreviation (D.C. Cir., Tex. App.), short-form name, subsequent history, WL cite.
Caveat: "Standard" ≠ strict Bluebook in some jurisdictions (e.g. NY parallel form without court; Texas Bluebook
T1 form "(Tex. App.—Beaumont 1988, writ denied)" not produced). ALWD output carries the court for NY.

Connector feasibility: in Chrome MV3 a translator's `ZU.request*` from the page is relayed to the extension
service worker, which calls `fetch(url, {credentials:'include', headers})` (`zotero-connectors/src/common/http.js:281-376`),
so cookies + custom headers are sent. UNTESTED: whether Westlaw accepts `Origin: chrome-extension://…`.

## 4. Mapping sketch to Zotero `case` (observations, not a plan)
caseName ← Standard long-form name (fallback: header title) · court ← Bluebook court abbrev from Standard/ALWD parenthetical
(fallback: full court line) · dateDecided ← `#filedate` · reporter/reporterVolume/firstPage ← first citation ·
docketNumber ← `.co_docketBlock` · history ← subsequent history + parallel/WL cites · shortTitle ← Standard short form ·
url ← `https://1.next.westlaw.com/Document/<GUID>/View/FullText.html` · creators ← panel/author (optional).
Bluebook CSL `court` rule: omit court for U.S. Reports / when reporter implies it (SCOTUS, state high courts in official reporters).

## 5. Citation-service option map (authoritative, from `GET /V2/UserSettings` → tab "Citations")
Saved: `../westlaw-samples/citations-settings.json`; full test matrix: `../westlaw-samples/cite-matrix/*.json`.

| Query param | Pref key | Values |
|---|---|---|
| `styleIDs` (repeatable; UI sends chosen + fallback, server accepts all 39 at once) | CiteAdvisorRulesSet | standard, westlaw, alwd, 36 state styles (arizona … washington, district_columbia, virgin_islands) |
| `subStyle` | CiteAdvisorCitationStyle | `LegalBriefs`, `LawReviews` (no observed difference in plain text) |
| `parallelCiteRule` | CiteAdvisorParallelCites | `CAFormat` (Westlaw decides), `allReporter`, `officialReporterOnly`, `westReporterOnly` |
| `history` | CiteAdvisorIncludeHistory | bool — appends subsequent history |
| `italicize` / `underline` / `bold` | CiteAdvisor…Title | bool (affects text/html + rtf only) |
| `pubPages` (repeatable) | — | `<starPageSeriesId>,<page>` → pin cite in long + `at` short form |
| `paragraphNumber` | — | paragraph pin |
UI-only (not API): hyperlink, quotation marks, reference placement.

## 6. Matrix results (5 cases × 4 parallel rules × 2 substyles × history; plus all 39 styles)
- Federal cases: every rule gives the same Bluebook cite, e.g. `Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)`;
  `allReporter` adds `, Prod. Liab. Rep. (CCH) P 15610, 1999 WL 652310`.
- **NY App. Div. — `standard` + `westReporterOnly` = Bluebook T1 form:** `Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)`.
  `officialReporterOnly` → `2 A.D.3d 799 (N.Y. App. Div. 2003)`; CAFormat → NY-local parallel form without court.
- **Texas — `texas` style = Bluebook/Greenbook form:** `761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)` (U+2014 em dash).
  `standard` drops district + writ: `(Tex. App. 1988)`; with history=true it appends `, writ denied (July 12, 1989), and disapproved of by …`.
- `history=true` on D.D.C.: `…449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009), and order clarified, …`.
- Pin: `pubPages=506,490` → `187 F.3d 486, 490 (5th Cir. 1999)` / short `Sanchez, 187 F.3d at 490`.
- Forms: long; short (`Sanchez, 187 F.3d 486`); short-cite-only (`187 F.3d 486`); `Id.`; enhanced (= long in all samples).
- `westlaw` style is a data-rich format: all dockets + WL cite + exact date, e.g.
  `Miele v American Tobacco Co., No. 019125/97, …, 770 N.Y.S.2d 386, 2003 N.Y. Slip Op. 19972, 2003 WL 23099090 (N.Y.A.D. 2 Dept., Dec. 29, 2003)`.
- Across 39 styles: 29–33 styles are identical to `standard` for federal/Texas cases; NY case produced 14 distinct outputs
  (New York style: `Miele v Am. Tobacco Co., 2 AD3d 799 [2d Dept 2003]`; California puts court/year before the cite).
- Case-name abbreviation differs by style: standard/alwd `Am. Tobacco Co.`; kentucky/california/north_dakota keep `American`;
  `United States` (standard) vs `U.S.` (alwd, westlaw).

# Cross-Audit: Reports A & E — Claim Verification

## Audit Table

| # | Claim | Report | Verdict | Evidence | Correction |
|---|-------|--------|---------|----------|------------|
| 1 | `Embedded Metadata.js` `detectWeb` returns `false` when a page has no metadata | A | **WRONG** | `translators/Embedded Metadata.js:229-234` | `detectWeb` returns `undefined` (not `false`) when it must run async `init()`. The RDF fallback at line 354 can yield `"webpage"` or `false`, but that path is in `doWeb`, not `detectWeb`. The translate framework treats `undefined` as falsy (line 1753 of `translate/src/translation/translate.js`), so the effect is the same — the translator is not selected — but the return value is `undefined`, not `false`. |
| 2 | `detectWeb` falls back to `'webpage'` when no metadata found | A | **WRONG** | `translators/Embedded Metadata.js:229-234, 354` | The `"webpage"` fallback (`rdf.defaultUnknownType`) only applies inside the RDF import path (`doWeb`/`importRDF`), not in `detectWeb` itself. `detectWeb` returns `undefined` when no metadata is found and async init is needed. |
| 3 | Connector gets custom translators from desktop Zotero's data-dir translators folder | A | **CONFIRMED** | `zotero-connectors/src/common/repo.js:60` and `zotero/chrome/content/zotero/xpcom/zotero.js:1070-1072` | The connector calls `POST /connector/getTranslators` to desktop Zotero (localhost:23119), which serves all translators from `Zotero.DataDirectory/translators/`. The connector never reads the filesystem directly. |
| 4 | Translator priority: lower number = higher priority (selected first) | A | **CONFIRMED** | `translate/src/translation/translate.js:1774-1779` | Sort is `a.priority - b.priority`, so priority 100 sorts before 320. The report's claim is correct. |
| 5 | `/connector/saveItems` and `/connector/saveSnapshot` endpoints exist in `server_connector.js` | A | **CONFIRMED** | `zotero/chrome/content/zotero/xpcom/server/server_connector.js:301, 608` | `Zotero.Server.Endpoints["/connector/saveItems"]` at line 301; `Zotero.Server.Endpoints["/connector/saveSnapshot"]` at line 608. Both are POST endpoints. |
| 6 | `detectWeb` contract: returns item type string, `"multiple"`, or `false` | A | **PARTIALLY CONFIRMED** | `translate/src/translation/translate.js:1516-1518` | The framework also accepts `undefined` (treated as falsy, same as `false`). The report omits `undefined` as a valid non-match return. |
| 7 | `Embedded Metadata` has `priority: 320` and is the only generic fallback | A | **CONFIRMED** | `translators/Embedded Metadata.js:16` | Priority 320 confirmed. `target: ""` makes it generic (matches all URLs). |
| 8 | Two-stage detection: URL regex (`target`) → `detectWeb()` | A | **CONFIRMED** | `translate/src/translation/translate.js:1117, 1734-1753` | URL matching first, then `detectWeb` in priority order. First non-false return wins. |
| 9 | When no translator matches, a `webpage` item is created via `/connector/saveSnapshot` | A | **CONFIRMED** | `zotero-connectors/src/common/inject/pageSaving.js:309-320` and `server_connector.js:608-648` | The save flow falls back to `saveAsWebpage()` → `saveSnapshot` RPC → creates a `webpage` item. |
| 10 | No Westlaw US translator exists in the repository | A | **CONFIRMED** | `translators/` directory (no Westlaw US file) | Only `WestLaw UK.js` exists (target: `^https://uk\.westlaw\.com/Document/`). |
| 11 | Zotero `case` item type maps to CSL `legal_case` | E | **CONFIRMED** | `zotero/resource/schema/global/schema.json:3273-3274` | `"legal_case": ["case"]` in the CSL types mapping. |
| 12 | `caseName` → `title`, `court` → `authority`, `reporter` → `container-title`, `reporterVolume` → `volume`, `firstPage` → `page`, `docketNumber` → `number`, `dateDecided` → `issued` | E | **CONFIRMED** | `zotero/resource/schema/global/schema.json:562-590` | Each field's `baseField` maps to the CSL variable as claimed. `reporter` has no `baseField` and maps to `container-title` via the Zotero-to-CSL-JSON convention. |
| 13 | Bluebook `legal_case` macro in `bluebook-law-review.csl` renders `title` + `volume` + `container-title` (short) + `page-first` + `locator` + `issuance` (authority + year) | E | **CONFIRMED** | `styles/bluebook-law-review.csl:138-147` | First citation legal_case branch: `<text variable="title" text-case="title"/>`, `<text variable="volume"/>`, `<text macro="container"/>` (short form), `<text variable="page-first"/>`, `<text macro="issuance" prefix="(" suffix=")"/>`. |
| 14 | Bluebook `legal_case` `issuance` macro renders `authority` + year in parentheses | E | **CONFIRMED** | `styles/bluebook-law-review.csl:263-267` | `<text variable="authority"/>` + `<date variable="issued"><date-part name="year"/></date>`. |
| 15 | Bluebook `legal_case` subsequent citation uses `title form="short"` + `volume` + `container-title form="short"` + `at_page` | E | **CONFIRMED** | `styles/bluebook-law-review.csl:332-340` | Subsequent legal_case branch: `<text variable="title" form="short" font-style="italic"/>` + volume + container-title form="short" + `at_page` macro. |
| 16 | Bluebook inline style `legal_case` first citation: `title` + `number` (docket) + `volume` + `container-title` + `page` + `(authority date)` | E | **CONFIRMED** | `styles/bluebook-inline.csl:84-130` | legal_case branch includes `number` (docketNumber), full date with month/day/year in parentheses. |
| 17 | Bluebook requires abbreviated court names — Zotero does NOT auto-abbreviate | E | **CONFIRMED** | `styles/bluebook-law-review.csl:265` and `styles/bluebook-inline.csl:128` | `authority` variable rendered verbatim. No CSL auto-abbreviation for court names. |
| 18 | Standard Zotero lacks `jurisdiction`, `division`, `yearAsVolume` fields | E | **CONFIRMED** | `zotero/resource/schema/global/schema.json:562-590` | The `case` item type fields do not include `jurisdiction`, `division`, or `yearAsVolume`. These are Juris-M extensions. |
| 19 | WestLaw UK translator has real test cases; Lexis+ has empty `testCases` array | E | **CONFIRMED** | `translators/WestLaw UK.js:139-172` and `translators/Lexis+.js:262-263` | WestLaw UK has non-empty `testCases` with `itemType: "case"`. Lexis+ has `var testCases = []`. |
| 20 | CSL does not handle parallel citations (multiple reporters for same case) | E | **CONFIRMED** | `styles/bluebook-law-review.csl` and `styles/bluebook-inline.csl` | Neither style has a mechanism for parallel citations. This is a known CSL limitation. |

## Key Facts

1. **Report A's claim #1 is wrong**: `detectWeb` returns `undefined`, not `false`, when no metadata is found and async init is required. The `"webpage"` fallback is in the `doWeb`/RDF path, not `detectWeb`.
2. **Report A's claim #2 is correct in substance** but the mechanism is indirect: the connector gets translators from desktop Zotero via HTTP RPC, which in turn reads the data-dir.
3. **Report A's claim #6 is correct**: `Embedded Metadata` priority 320, `target: ""`, is the generic fallback.
4. **Report A's claim #5 is imprecise**: `detectWeb` can return `undefined` (not just `false` or a string), which the framework treats as non-matching.
5. **Report E's CSL field mappings are verified** against `schema.json` lines 562-590. The `baseField` values (`title`, `authority`, `date`, `number`, `volume`, `pages`) map to CSL variables (`title`, `authority`, `issued`, `number`, `volume`, `page`).
6. **Report E's Bluebook macro quotes are verified** against the actual CSL files. The first-citation and subsequent-citation branches are correctly described.
7. **Report E's claim about court name abbreviation** is correct — Zotero has no auto-abbreviation; the translator must supply Bluebook abbreviations.
8. **Report E's claim about missing Juris-M fields** is correct — `jurisdiction`, `division`, `yearAsVolume` are not in the standard Zotero schema.

## Open Questions

1. **Westlaw US page structure**: What embedded metadata (Dublin Core, JSON-LD, microdata) do `next.westlaw.com` pages expose? This determines whether Embedded Metadata catches them before a custom translator.
2. **Priority for a Westlaw US translator**: Must be < 320 (Embedded Metadata priority) to win URL matching before the generic fallback.
3. **Court name abbreviation mapping**: Westlaw may provide full court names; a mapping table to Bluebook abbreviations will likely be needed.
4. **Login-walled testing**: Westlaw US requires authentication; test cases will likely be empty (like Lexis+).
5. **Parallel citations**: CSL/Bluebook styles in this repo don't handle them; a first-version translator should focus on single-reporter citations.

## Implications for a Westlaw Case-Citation Feature (Observations Only)

1. **A new US Westlaw translator is the only needed change** — no modifications to Zotero desktop, CSL styles, or schema. The existing `case` item type and Bluebook CSL styles handle everything downstream.
2. **The translator must return `itemType: "case"`** from `detectWeb()` to prevent the webpage fallback. It needs a `target` regex matching US Westlaw URLs with priority < 320.
3. **Critical fields to populate**: `caseName`, `court` (Bluebook abbreviation), `reporter` (Bluebook abbreviation), `reporterVolume`, `firstPage`, `dateDecided`, `docketNumber`.
4. **Court name abbreviation is the hardest part** — Westlaw may provide full court names, requiring a mapping table.
5. **The WestLaw UK translator is a viable template** — same pattern: `target` regex → `detectWeb` → `doWeb` data extraction → `case` item creation.
6. **Proxy awareness is already built in** — EZproxy URLs will be de-proxified by the connector's proxy system.
7. **Custom translator deployment is immediate** — placing a `.js` file in the Zotero data dir makes it available to the connector on the next `/connector/getTranslators` call.

# D — Comparative Study of Existing Translators That Create itemType 'case'

## 1. Translators Handling itemType 'case'

41 translators in `M:/Coding_Projects/_zotero-research/translators/` match `"case"`. The table below lists each, its target site, and how case fields are obtained.

| Translator | Target Site | Field Extraction Method |
|---|---|---|
| AustLII and NZLII.js | austlii.edu.au / nzlii.org | DOM (CSS selectors, XPath) |
| BAILII.js | bailii.org | DOM (CSS selectors) |
| BibTeX.js | bib | Import parser (field mapping) |
| Bibliontology RDF.js | RDF | RDF/ontology mapping |
| CanLII.js | canlii.org | DOM (CSS selectors) |
| Citavi 5 XML.js | Citavi | XML import mapping |
| Cornell LII.js | law.cornell.edu | DOM (CSS selectors) |
| CourtListener.js | courtlistener.com | DOM (CSS + XPath), fallback regex on citation string |
| Datacite JSON.js | datacite.org | JSON import mapping |
| EUR-Lex.js | eur-lex.europa.eu | DOM (CSS selectors, XPath) |
| Endnote XML.js | Endnote | XML import mapping |
| Google Research.js | Google Research | RDF/import mapping |
| Google Scholar.js | scholar.google.com | Citelet string parsing (regex + DOM fallback) |
| Harvard Caselaw Access Project.js | case.law / cite.law | API JSON (REST API) |
| Hanrei Watch.js | kanz.jp | DOM (CSS selectors) |
| HUDOC.js | hudoc.echr.coe.int | DOM (CSS selectors, XPath) |
| JurPC.js | jurpc.de | DOM (CSS selectors) |
| Juricaf.js | juricaf.org | DOM (CSS selectors) |
| Juris.js | juris.de | DOM (CSS selectors) |
| Lagen.nu.js | lagen.nu | DOM (CSS selectors) |
| Legifrance.js | legifrance.gouv.fr | DOM (CSS selectors) |
| Lexis+.js | plus.lexis.com | DOM (CSS selectors), citation-string parsing |
| LexisNexis.js | lexis-nexis.com | DOM (CSS selectors) |
| National Archives UK Case Law.js | caselaw.nationalarchives.gov.uk | DOM (CSS selectors, XPath) |
| Old Bailey Online.js | oldbaileyonline.org | DOM (CSS selectors) |
| OVID Tagged.js | Ovid | Tagged-text import mapping |
| Rechtspraak.nl.js | rechtspraak.nl / linkeddata.overheid.nl | DOM (CSS selectors, XPath) |
| Retsinformation.js | retsinformation.dk | DOM (CSS selectors) |
| WestLaw UK.js | uk.westlaw.com | DOM (CSS selectors) |
| ZIPonline.js | zip-online.de | DOM (CSS selectors) |
| beck-online.js | beck-online.beck.de | DOM (CSS selectors) |
| dejure.org.js | dejure.org | DOM (CSS selectors, XPath) |
| jurion.js | recht.jurion.de | DOM (CSS selectors) |
| openJur.js | openjur.de | DOM (CSS selectors) |
| RDF.js | rdf | RDF import mapping |
| RIS.js | ris | RIS import mapping |
| RefWorks Tagged.js | RefWorks | Tagged-text import mapping |
| MEDLINEnbib.js | MEDLINE | nbib import mapping |
| MODS.js | mods | MODS XML import mapping |
| Wikidata.js | wikidata.org | Wikidata API / RDF |

**Methods legend:** DOM = CSS selectors / XPath on the web page; meta tags = `<meta>` or JSON-LD extraction; API = direct REST/JSON API call; citation-string regex = parsing the raw citation text (e.g., "5 U.S. 137") with regular expressions; import parser = field mapping in a structured import format (BibTeX, RIS, RDF, etc.).

## 2. Deep Read: Lexis+.js (translators/Lexis+.js)

**Target:** `^https?://plus\.lexis\..*/` (Lexis+ web platform)
**Last updated:** 2023-05-26 (bfahrenfort)
**Test cases:** None (empty `testCases` array)

### detectWeb Logic (lines 28–43)
- **Multiple results:** `doc.title.includes("results")` → returns `"multiple"`
- **Statute:** Title contains `§` followed by digits, or `acts?` keyword, or `p.l.` → returns `"statute"`
- **Case:** Title matches `/\d+\s[a-zA-Z0-9. ]+\d+/` (e.g., "5 U.S. 137") → returns `"case"`
- Otherwise returns `false`

### Field-by-Field Extraction (lines 102–145)

| Field | How Obtained | Code Location |
|---|---|---|
| caseName | `title` from `h1#SS_DocumentTitle` | line 106 |
| reporterVolume | Parsed from `span.active-reporter` citation text | lines 112–113 |
| reporter | Parsed from `span.active-reporter` citation text | lines 112–113 |
| firstPage | Parsed from `span.active-reporter` citation text | lines 112–113 |
| court | First `<p class="SS_DocumentInfo">` element | line 115 |
| dateDecided | `<span class="date">` element | line 117 |
| docketNumber | Third `<p class="SS_DocumentInfo">` element, if matches `/^no\./i`, `/^\d+/`, or `/^case no\./i` | lines 119–122 |
| history | **Not populated** | — |
| extra | **Not populated** | — |
| creators | **Not populated** | — |

### Citation-String Parsing (lines 111–114)
```js
let citation = text(doc, 'span.active-reporter');
newCase.reporterVolume = citation.substring(0, citation.indexOf(' '));
newCase.reporter = citation.substring(citation.indexOf(' ') + 1, citation.lastIndexOf(' '));
newCase.firstPage = citation.substring(citation.lastIndexOf(' ') + 1);
```
This assumes the citation is formatted as `Volume Reporter Page` (e.g., "5 U.S. 137") with single spaces. It splits on the first and last space. **No shared reporter-abbreviation helper is used.** The reporter name is taken verbatim from the page (e.g., "U.S.", "S. Ct.").

### Multiple Results Handling (lines 55–76)
- `getSearchResults()` queries `a.titleLink` for titles and `span.metaDataItem` for dates/citations
- Items are keyed by URL, displayed as `title + "(" + date + ")"`
- User selects items via `Zotero.selectItems()`, then each URL is scraped individually

### Parallel Citations
**Not handled.** Only the primary reporter citation (`span.active-reporter`) is extracted. No parallel citation logic exists.

### Notes
- The page snapshot (innerHTML of `#document-content`) is saved in a note (line 108)
- Docket number detection is heuristic and may miss non-standard formats (line 119–122)
- No test cases are defined

## 3. Deep Read: CourtListener.js (translators/CourtListener.js)

**Target:** `^https?://www\.courtlistener\.com/`
**Last updated:** 2025-04-29 (Sebastian Karcher)
**Test cases:** 5 (4 case items + 1 multiple search)

### detectWeb Logic (lines 33–39)
- URL contains `/opinion/` → returns `'case'`
- Search results found via `getSearchResults(doc, true)` → returns `'multiple'`
- Otherwise `false`

### Field-by-Field Extraction (lines 100–155)

| Field | How Obtained | Code Location |
|---|---|---|
| caseName | `#caption` element text | line 103 |
| court | `.case-court` element text | line 104 |
| reporter | `.citation .reporter` element text | line 105 |
| reporterVolume | `.citation .volume` element text | line 106 |
| firstPage | `.citation .page` element text | line 107 |
| history | All citation `<span>` elements after the first, joined by `, ` | lines 113–116 |
| dateDecided | `.case-date-new` element text | line 118 |
| docketNumber | XPath: `//li[strong[contains(text(), "Docket Number:")]]/text()[1]` | lines 120–121 |
| creators | `<a href*='/person/'>` elements in `.opinion-section-title`, cleaned via `ZU.cleanAuthor()` | lines 122–124 |
| extra | Set to empty string `""` | line 126 |

### Citation-String Parsing (lines 107–116)
Primary extraction uses DOM selectors (`.citation .reporter`, `.citation .volume`, `.citation .page`). If those are empty, a **fallback regex** is applied:
```js
let citeExpr = citation.trim().match(/^(\d+)\s((?:[A-Z][a-z]?\.\s?)+(?:[2-3]d)?(?:Supp\.)?)\s(\d{1,4})(,|$)/);
```
This matches: `Volume Reporter Page` where the reporter is one or more capitalized abbreviations with optional periods and spaces (e.g., "594 So.2d", "401 U.S."). If the regex fails, the whole citation is stored in `item.history`.

### Multiple Results Handling (lines 39–50)
- `getSearchResults()` queries `article > h3 > a` for result links
- User selects via `Zotero.selectItems()`
- Each selected URL is fetched with `requestDocument()` and scraped

### Parallel Citations
**Handled.** All citations after the primary one are joined into `item.history` (line 113–116). The primary citation is extracted from DOM elements; if DOM elements are missing, the first citation string from the page is used as a fallback.

### Multiple-Results Handling
Uses `Zotero.selectItems()` with titles keyed by URL. No deduplication or grouping logic.

### Notes
- CourtListener is the only translator of the three that populates `creators` (judges as authors)
- The `history` field carries parallel citations and LEXIS/Westlaw cite forms (e.g., "1991 La. App. LEXIS 3211, 1991 WL 249791")
- Test cases include a range of courts (Supreme Court, Court of Appeals, District Court)

## 4. Deep Read: Google Scholar.js (translators/Google Scholar.js — case-law portion)

**Target:** `^https?://scholar[-.]google[-.](com|cat|(com?[-.])?[a-z]{2})(\.[^/]+)?/(scholar(_case|_labs/search/session/\d+)?\?|citations\?)`
**Last updated:** 2025-12-11
**Test cases:** 6 inline case test cases (lines 1031–1155)

### detectWeb Logic (lines 59–88)
- URL contains `/scholar_case?` and `case=` → returns `"case"`
- URL contains `/citations?` and a GS case link is found → returns `"case"`
- Search results found → returns `"multiple"`
- Otherwise `false`

### Case Scraping Entry Point (lines 372–391)
```js
var scrapeCase = function (doc, url) {
    var refFrag = doc.evaluate('//div[@id="gsl_reference"] | //div[@id="gs_reference"]', ...);
    if (refFrag) {
        var factory = new ItemFactory(doc, refFrag.textContent, [attachmentPointer]);
        factory.repairCitelet();
        factory.getDate();
        factory.getCourt();
        factory.getVolRepPag();
        if (!factory.hasReporter()) { factory.getDocketNumber(doc); }
        factory.getTitle();
        factory.saveItem();
    }
};
```
The citelet string (e.g., "Powell v. McCormack, 395 US 486 - Supreme Court 1969") is parsed by the `ItemFactory` object through a pipeline of methods.

### ItemFactory Citelet Parsing Pipeline

**`repairCitelet()` (line 431):** Ensures a ` - ` separator exists between case name and citation, inserting it if needed via `/, +([A-Z][a-z]+:)/`.

**`getDate()` (line 474):** Splits on ` - ` or regex `^(.*),\s+([^,]+Court,\s+[^,]+)$`. Extracts year from the last segment with `/(?:(.*)\s+)*([0-9]{4})$/`. Falls back to parsing the centered opinion text for a more specific date, stripping "Decided"/"Dated"/"Released"/"Submitted"/"Argued" prefixes.

**`getCourt()` (line 531):** Pops the last hyphen-split segment, removes trailing comma/ellipsis, then tries:
1. `/(.* Court),\s+(.*)/` → court + jurisdiction
2. `/(?:([a-zA-Z]+):\s*)*(.*)/` → jurisdiction prefix + court name

**`getVolRepPag()` (line 558):** Splits the last segment on commas, then iterates backward applying:
```js
/^([0-9]+)\s+(.*)\s+(.*)/
```
This captures `volume`, `reporter`, and `pages`. It validates that pages end with a digit (or accepts non-digit pages if a prior match was found). **Multiple parallel citations are handled** — each valid vol/rep/pag tuple becomes a separate `Zotero.Item("case")`, linked via `seeAlso`.

**`getDocketNumber()` (line 594):** XPath for `//center[preceding-sibling::center//h3[@id="gsl_case_name"]]` or `//div[@class="gsc_value" and preceding-sibling::div[text()="Docket id"]]`. Strips leading "No." and trailing period.

**`saveItem()` (line 670):** Creates one `Zotero.Item("case")` per vol/rep/pag entry. Sets `caseName`, `reporter`, `reporterVolume`, `firstPage`, `dateDecided`, `court`, `extra` (jurisdiction), `docketNumber` from the factory's `v` and `vv` properties.

### Field Mapping Summary

| Field | Populated? | Source |
|---|---|---|
| caseName | Yes | Citelet text before the citation |
| court | Yes | Last segment of citelet after court name |
| dateDecided | Yes | Year extracted from citelet + DOM fallback |
| reporter | Yes | Parsed from vol/rep/pag regex |
| reporterVolume | Yes | Parsed from vol/rep/pag regex |
| firstPage | Yes | Parsed from vol/rep/pag regex |
| docketNumber | Yes (if no reporter) | DOM XPath fallback |
| history | **Not populated** | — |
| extra | Yes (jurisdiction) | From `getCourt()` jurisdiction capture |
| creators | **Not populated** | — |

### Multiple Parallel Citations
**Handled.** Each parallel citation (e.g., "91 S. Ct. 849, 28 L. Ed. 2d 158") that matches the vol/rep/pag regex produces a separate Zotero item, linked via `seeAlso`. If no reporter is found, the docket number is extracted from the DOM.

### Multiple-Results Handling
Uses `Z.selectItems()` for search results. For profile results, uses `Zotero.selectItems()` on profile citation links. Scraping is batched with a 2-second delay between requests.

## 5. Citation-String Parsing Regexes Compared

### Lexis+.js (line 111–114)
No regex used. Splits the `span.active-reporter` text on spaces:
- `substring(0, indexOf(' '))` → reporterVolume
- `substring(indexOf(' ') + 1, lastIndexOf(' '))` → reporter
- `substring(lastIndexOf(' ') + 1)` → firstPage

**Assumption:** Exactly three space-separated tokens: `Volume Reporter Page`. Fragile if reporter has spaces (e.g., "F. 3d") or if page has suffixes.

### CourtListener.js (lines 107–116)
Primary: DOM selectors (`.citation .volume`, `.citation .reporter`, `.citation .page`).
Fallback regex (line 110):
```js
/^(\d+)\s((?:[A-Z][a-z]?\.\s?)+(?:[2-3]d)?(?:Supp\.)?)\s(\d{1,4})(,|$)/
```
Captures: volume, reporter (abbreviations with periods, optional "Supp."), page. The reporter pattern `(?:[A-Z][a-z]?\.\s?)+(?:[2-3]d)?(?:Supp\.)?` handles reporters like "So.2d", "F.Supp.", "U.S.".

### Google Scholar.js (line 558–576)
```js
/^([0-9]+)\s+(.*)\s+(.*)/
```
Applied to comma-split segments of the citelet's last hyphen-split portion. The greedy `.*` for reporter means it captures everything between volume and the last space-separated token (pages). This is more permissive than Lexis+'s approach but can misparse if the reporter name contains commas.

### Shared Reporter-Abbreviation Helper
**None found.** No shared helper for reporter abbreviation expansion (e.g., "U.S." → "United States Reports") exists in:
- `M:/Coding_Projects/_zotero-research/translators/` (grep for `reporterAbbrev`, `abbreviat`, `parseCite`, `parseCitation`)
- `M:/Coding_Projects/_zotero-research/translate/`
- `M:/Coding_Projects/_zotero-research/utilities/`

Each translator handles reporter names as-is, without normalization or expansion.

## 6. Lexis+ Maintenance History

Two commits found via `gh api 'repos/zotero/translators/commits?path=Lexis%2B.js&per_page=20'`:

| Date | Author | Message |
|---|---|---|
| 2023-05-26 | bfahrenfort | Lexis+: Fix bug with word capture for "act" (#3038) |
| 2023-04-12 | bfahrenfort | Add Lexis+ Translator (#3012) |

The translator was added and had one bug fix in May 2023. No commits since then (last updated 2023-05-26 per translator metadata).

## Key Facts

1. **41 translators** create itemType 'case' across the Zotero translators repo, spanning US and international legal sources.
2. **Lexis+** (2023, single author) is the newest US case translator and has **zero test cases**. Its citation parsing is the most fragile — simple space-splitting of the `span.active-reporter` text.
3. **CourtListener** (2025, active maintenance) has the most robust DOM-based extraction with XPath fallback for docket numbers and 5 test cases covering multiple court levels.
4. **Google Scholar** has the most sophisticated citelet-parsing pipeline (ItemFactory with repairCitelet → getDate → getCourt → getVolRepPag → getDocketNumber → saveItem), handles parallel citations as separate items linked via `seeAlso`, and has 6 inline test cases. However, it does not populate `creators` or `history`.
5. **No shared reporter-abbreviation helper** exists in the codebase. All three translators store reporter names verbatim (e.g., "U.S.", "So.2d", "F. 3d").
6. **None of the three translators** populate the `history` field with the full citation string in the way CourtListener does for parallel cites — only CourtListener does this.
7. **WestLaw** has a dedicated translator (`WestLaw UK.js`) but it targets the UK domain (`uk.westlaw.com`), not the US platform.

## Open Questions

1. Does the US Westlaw platform (westlaw.com) have a Chrome connector or translator that saves as itemType 'case'? The existing `WestLaw UK.js` targets only the UK domain.
2. How does the Zotero Chrome connector handle US Westlaw pages — does it use a generic web scraper or a dedicated translator?
3. What is the structure of the `span.active-reporter` element on Lexis+ case pages — does it consistently contain exactly `Volume Reporter Page` with single spaces?
4. Are there reporter-abbreviation normalization needs for a Westlaw citation feature, or is the raw reporter name sufficient for Zotero's citation styles?
5. How do citation styles (e.g., Bluebook) in the `styles/` directory consume the `case` itemType fields — do they require `reporter` to be a specific abbreviation format?

## Implications for a Westlaw Case-Citation Feature (Observations Only)

1. **Field model is consistent:** All three translators map to the same Zotero `case` itemType fields (`caseName`, `reporter`, `reporterVolume`, `firstPage`, `court`, `dateDecided`, `docketNumber`), suggesting a stable target schema for a Westlaw translator.
2. **Citation parsing is site-specific:** Each translator uses a different strategy (DOM selectors vs. citelet regex vs. space-splitting). A Westlaw translator would need to reverse-engineer the HTML structure of westlaw.com case pages.
3. **Parallel citations are handled differently:** CourtListener stores them in `history`; Google Scholar creates separate items. A Westlaw translator should consider whether to store parallel citations in `history` (simpler, preserves all cites) or create multiple items (more structured but complex).
4. **No reporter normalization exists:** If the goal is clean legal citations, a reporter-abbreviation mapping (e.g., "F.2d" → "Federal Reporter, Second Series") would need to be built or imported from an external source. The `styles/` directory may contain such data indirectly through citation formatting rules.
5. **Test coverage gap:** Lexis+ has no test cases despite being a major legal database. A new Westlaw translator should include comprehensive test cases from the start, following CourtListener's pattern.
6. **The Chrome connector context:** Since this is investigatory, the actual Westlaw connector would likely need to work with the Zotero browser connector's page detection logic, which uses `detectWeb()` patterns similar to these translators.

---

*Sources: All file paths relative to `M:/Coding_Projects/_zotero-research`. Line references are to the files listed above. Claims marked VERIFIED are based on direct file reading; INFERRED from patterns; UNKNOWN where not confirmed.*

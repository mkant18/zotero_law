# M1 source contract (orchestrator-owned; workers read-only)

Plan: `reports/20-ASTRA-ARCHITECTURE.md` §§2–5, 7, 9, 12. Status: **at-risk pre-gate work** — M0-L (live connector
origin test) is still pending user authorization. These modules are needed under either M0 outcome
(service-enriched or DOM-only degraded capture).

## Module conventions
- Each module is ONE plain-script file `westlaw-us/src/<name>.js` that will later be **concatenated** into the single
  Zotero translator file. Therefore:
  - No `import`/`require`/`export` statements, no top-level `await`, no classes-with-private-fields, no Node APIs,
    no DOM globals at load time. ES2020 syntax only (Zotero 7 / Firefox 115 ESR engine).
  - Only top-level `function` declarations and `var` constants. Prefix every top-level name with the module's
    prefix (see table) to avoid collisions after concatenation.
  - End each file with exactly:
    ```js
    if (typeof module !== "undefined" && module.exports) { module.exports = { /* public names */ }; }
    ```
  - Pure functions: no network, no `Zotero.*` calls, no logging of values. Return structured results; never throw
    for expected bad input (return `{ ok:false, reason:"<code>" }` or push review reasons).
- Tests: `westlaw-us/src/test/<name>.test.mjs` (node:test, Node 22 built-ins only). Load the module with
  `createRequire(import.meta.url)` or `vm`. Run: `node --test "westlaw-us/src/test/*.test.mjs"`.
- Test helpers shared across modules live in `westlaw-us/src/test/helpers/` and are owned by the task that creates
  them (see brief).

| Module file | Prefix | Owner task |
|---|---|---|
| `text.js` (cleanBibliographicText, watermark scrub, NFC, dash/space normalize) | `wlText` | M1-A |
| `reporters.js` (reporter registry + alias normalization) | `wlRep` | M1-A |
| `cite-parse.js` (parseStandardForm, parseTexasForm, parseWestlawInventory, parseReporterCitation, parseShortName) | `wlCite` | M1-A |
| `dom.js` (inspectCaseReadiness, readPageContext, readDOMFacts) | `wlDom` | M1-C |
| `map.js` (mapCaseToZotero, validateOutgoingItem) | `wlMap` | M1-D |
| `service.js` (buildCitationRequests, fetchCitationForms, wlSvcReadEnvelope) | `wlSvc` | M1-E |
| `profile.js` (classifyCourt, selectCitationProfile, court-omission policy) | `wlProf` | M1-G |
| `reconcile.js` (reconcileCaseRecord: DomFacts + parsed service forms \u2192 CaseRecord) | `wlRec` | M1-H |
| `translator.js` (header, detectWeb, doWeb shell, testCases) + build script | `wl` (entry points unprefixed as Zotero requires) | M1-I |

## Shared value shapes (plain objects)

`Citation` (one reporter/WL/neutral citation):
```
{ kind: "reporter"|"wl"|"neutral"|"unparsed",
  volume: "187", reporter: "F.3d", page: "486",   // strings; for WL: volume "2024", reporter "WL", page "1234567"
  raw: "187 F.3d 486" }                          // normalized source text of just this citation
```

`ParsedLongForm` (result of parseStandardForm / parseTexasForm):
```
{ ok: true, dialect: "standard"|"texas",
  name: "Sanchez v. Liggett & Myers, Inc.",
  citations: [Citation, ...],          // main-decision citation run, in order (parallels included)
  dockets: ["No. 98-40679"],           // raw docket tokens from original text; e.g., "Nos. 1-2, 3-4" → ["Nos. 1-2", "3-4"]
  pin: "490" | null,                   // only if the input contained a pinpoint
  pinAt: true,                         // true if pin written as "at 490"; false if "… 490 (…)"
  pinAfter: 0 | null,                  // index into citations array of the citation the pin follows; null if no pin
  court: "5th Cir." | "" ,             // authority inside the main parenthetical ("" if year-only)
  year: "1999",
  date: null | "1999-08-25",           // only when the parenthetical carries a full date (WL/enhanced forms)
  dateText: null | "Aug. 25, 1999",    // full parenthetical date token as printed; null for year-only dates
  parentheticalSuffix: "" | "writ denied",   // Texas writ/petition status etc. (after the year, inside parens)
  history: "" | "aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)",  // tail after main ')' minus leading ", "
  unparsedTail: "" ,                   // anything not accounted for
  reviewReasons: [] }
or { ok:false, reason: "no-citation-anchor"|"unbalanced-parens"|"no-parenthetical"|"empty-input"|... }
```

`WestlawInventory` (parseWestlawInventory on the `westlaw` style / enhanced forms):
```
{ ok:true, dockets: ["No. 98-40679"], citations: [Citation...], wl: Citation|null, date: "1999-08-25"|null,
  rawCourt: "C.A.5 (Tex.)" , reviewReasons: [] }
```

`DomFacts` (readDOMFacts):
```
{ ok:true, guid: "I…"|null, contentType: "Cases"|null, headerName: "…", rawCourt: "United States Court of Appeals, Fifth Circuit.",
  author: "BROOKSHIRE"|null, dateText: "August 25, 1999", date: "1999-08-25"|null, citations: [Citation...], dockets: ["No. 98-40679"],
  pageCountText: "(Approx. 12 pages)"|null, reviewReasons: [] }
```

`CaseRecord` (reconcileCaseRecord output → mapCaseToZotero input):
```
{ guid, url, caseName, author|null, shortName|null, court (Bluebook authority or ""), rawCourt, date (ISO, full or "YYYY"),
  dockets: [], primary: Citation, alternates: [Citation...], history: "", parentheticalSuffix: "",
  wlPrimary: boolean, profile: "standard"|"texas"|"dom-only", status: "validated-profile"|"unverified-profile"|"metadata-only",
  reviewReasons: [], provenance: { field: "service"|"dom"|"both" } }
```

## Service request envelope parsing (wlSvcReadEnvelope)

**Function signature:**
```js
wlSvcReadEnvelope(json, wantedStyleIds, expect?)
```

**Parameters:**
- `json` (object): parsed response body from `/RelatedInfo/v2/citestyles` endpoint.
- `wantedStyleIds` (array of strings): expected style IDs, e.g., `["standard", "texas"]`; used to validate echo and detect missing styles.
- `expect` (object, optional): one flat format-option map for the whole request, the object `wlSvcBuildRequests` attaches as `expect`. Example: `{ history: "true", parallelCiteRule: "westReporterOnly", subStyle: "LegalBriefs", underline: "false", bold: "false", italicize: "false" }`. It is not keyed by style.

**Validation logic:**
1. Verify envelope structure (presence of `responses` array).
2. For each style in `wantedStyleIds`, check that exactly one response echoes that style ID (no duplicates).
3. If `expect` is supplied, compare only echoed keys that are present and non-null. A present value that differs omits that style from output and adds `echo-mismatch:<styleId>:<key>`. A missing echo key is not a mismatch.
4. A style with neither a `long` nor an `enhanced` form is kept (`long: null`) and flagged `missing-form:<styleId>:long`. `short` and `Id.` are not required.

**Review reasons (returned in `reviewReasons` array):**
- `malformed-envelope`: top-level structure invalid (no `responses` array or wrong type).
- `missing-style:<id>`: a requested style ID is not present in responses.
- `duplicate-style:<id>`: a style ID appears more than once in responses.
- `missing-form:<id>:long`: requested style `<id>` has neither a `long` nor an `enhanced` form.
- `echo-mismatch:<id>:<key>`: a present echoed option `<key>` for style `<id>` does not match `expect`; that style's response is omitted from output (not treated as a fatal error).

**Key points:**
- Absent echo keys (the response omits an option the service does not echo) are not failures; only a present key whose value differs is flagged.
- Echo-mismatched styles are omitted from the returned `styles` object; their review reasons are preserved for visibility.
- Malformed envelopes, missing styles, and missing forms generate review reasons but do not throw exceptions.

## Hard invariants (tested everywhere)
- Never first-comma split case names (`Liggett & Myers, Inc.` contains a comma).
- Never take the last `(year)` in a string; the main parenthetical is the first valid one after the main citation run.
- Later-case citations inside history never become parallels of the main case.
- Strip zero-width watermark chars `[\u200B-\u200F\u2060-\u2064\uFEFF]` from every output string; preserve em dash
  U+2014, apostrophes, accents.
- `shortTitle` is name-only (never `Id.` or a citation).
- No tokens, raw HTML, or opinion text in any output.

## Field accuracy (0.2.0)

The user requested author capture on 2026-10-11; this supersedes the original plan's empty-creators policy.
Only `.x_leadAuthorLine` supplies an author. Strip recognized judicial titles; preserve the source name as
a Zotero single-field author (`fieldMode: 1`) rather than guessing first/last names or expanding surnames.
Per curiam is a literal author. Panel, counsel, and dissent lines never supply authors. Duplicate identical
lines are harmless; conflicting or unparsed lead lines leave authors empty and add review reasons.
Absent lead lines leave authors empty; absence is not evidence of a named author.
Version 0.2.1 also accepts lead names without a comma before the judicial title, an explicit
"Opinion by/of" prefix, and Jr./Sr./roman-numeral name suffixes. It rejects panel-like text.
Header title attributes supply full case names; documented legacy `#courtline`, `#filedate`,
and `#cite0`–`#cite2` elements fill missing court/date/citation facts. Court fallback requires
court-like text; dates and citations still pass their parsers. Header facts retain precedence.

Compare full decision dates even within one year, normalize and compare docket sets, and flag disagreement
between header and service names and between standard citation names. Abbreviation differences may
require review. Use full service dates/dockets when header facts are absent. Court
disagreement retains the classified header authority and requires review, including regional reporters.
Official-reporter omission requires the matching state high court.

Validate calendar dates, numeric reporter volumes/pages, scalar types, and author safety before saving.
Remove unsafe optional fields and Extra lines, mark the item for review, then validate again. Unsafe
required name/type or remaining validation errors abort completion. Review codes contain no source values.

Offline tests prove these rules against synthetic inputs. Live Westlaw markup and installed Zotero still
need verification; unsupported markup or ambiguous facts require human review. No parser guarantees
every source field is present or correct.

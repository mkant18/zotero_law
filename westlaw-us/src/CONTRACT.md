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
| `service.js` (buildCitationRequests, fetchCitationForms, readResponseEnvelope) | `wlSvc` | M1-E |
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
  pin: "490" | null,                   // only if the input contained a pinpoint
  court: "5th Cir." | "" ,             // authority inside the main parenthetical ("" if year-only)
  year: "1999",
  date: null | "1999-08-25",           // only when the parenthetical carries a full date (WL/enhanced forms)
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
  dateText: "August 25, 1999", date: "1999-08-25"|null, citations: [Citation...], dockets: ["No. 98-40679"],
  pageCountText: "(Approx. 12 pages)"|null, reviewReasons: [] }
```

`CaseRecord` (reconcileCaseRecord output → mapCaseToZotero input):
```
{ guid, url, caseName, shortName|null, court (Bluebook authority or ""), rawCourt, date (ISO, full or "YYYY"),
  dockets: [], primary: Citation, alternates: [Citation...], history: "", parentheticalSuffix: "",
  wlPrimary: boolean, profile: "standard"|"texas"|"dom-only", status: "validated-profile"|"unverified-profile"|"metadata-only",
  reviewReasons: [], provenance: { field: "service"|"dom"|"both" } }
```

## Hard invariants (tested everywhere)
- Never first-comma split case names (`Liggett & Myers, Inc.` contains a comma).
- Never take the last `(year)` in a string; the main parenthetical is the first valid one after the main citation run.
- Later-case citations inside history never become parallels of the main case.
- Strip zero-width watermark chars `[\u200B-\u200F\u2060-\u2064\uFEFF]` from every output string; preserve em dash
  U+2014, apostrophes, accents.
- `shortTitle` is name-only (never `Id.` or a citation).
- No tokens, raw HTML, or opinion text in any output.

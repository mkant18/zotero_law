# M1-H — reconcileCaseRecord (offline, pure)

Read `westlaw-us/tasks/COMMON.md`, `westlaw-us/src/CONTRACT.md` (CaseRecord shape). Plan §3 "Recommendation and order" + failure table, §4 steps 7–9 + history policy, §5 (all), §2 CaseRecord.

## Allowed files
`westlaw-us/src/reconcile.js`, `westlaw-us/src/test/reconcile.test.mjs`, `westlaw-us/src/PROGRESS-H.md`.

## Read-only inputs (use as globals; load with `loadModules(['text.js','reporters.js','cite-parse.js','profile.js','service.js','dom.js','map.js','reconcile.js'])`)
`src/text.js`, `src/reporters.js`, `src/cite-parse.js`, `src/profile.js`, `src/service.js` (`wlSvcReadEnvelope` output shape), `src/dom.js` (`DomFacts`), `src/map.js`.

## Deliverable — `reconcile.js` (prefix `wlRec`)
`wlRecReconcile(input)` where `input = { context: {guid, url}, dom: DomFacts, svcA: {category, envelope|null}, svcB: {category, envelope|null}, profile: "standard"|"texas" }` (`envelope` = `wlSvcReadEnvelope` result) → `CaseRecord` (CONTRACT). Rules (plan §3 field precedence — service is NOT allowed to silently overwrite DOM):
1. **Parse**: A-standard long via `wlCiteParseStandardForm`; if profile texas, A-texas long via `wlCiteParseTexasForm` (texas is primary for court/suffix; standard corroborates). B-standard long (allReporter) for alternates; B-westlaw enhanced/long via `wlCiteParseWestlawInventory` for dockets/WL/date only.
2. **caseName**: service long `name` (abbreviated). Fallback: `dom.headerName` + review `name-from-dom`.
3. **primary**: first reporter citation of the service main run, only if it matches (compare volume + `wlTextCompareKey(reporter)` + page) some DOM citation, or DOM has none; else DOM first citation + review `primary-conflict`. If DOM has a `U.S.` citation and the court is SCOTUS, prefer the U.S. cite. No reporter citation anywhere but a WL cite exists → primary = WL, `wlPrimary = true`. Nothing → primary null + review `no-citation` (status metadata-only).
4. **alternates**: every other citation from service main runs (A and B-standard), inventory citations, and DOM citations, deduped by compare key, excluding primary; kinds preserved (reporter/wl/unparsed). Citations found in history are NEVER alternates.
5. **date**: `dom.date` primary (full ISO). Inventory `date` fills if DOM missing. Conflict → keep DOM + review `date-conflict`. Main-parenthetical `year` must equal the date's year, else review `year-conflict`. If only a year is known, date = "YYYY".
6. **dockets**: DOM dockets primary; inventory dockets fill if DOM empty; WL-primary requires at least one docket, else review `wl-missing-docket`.
7. **court**: `wlProfCourtForCitation(wlProfClassifyCourt(dom.rawCourt), primary, parsedServiceCourt)` (texas parse's court when profile texas). Merge its review reasons. WL-primary additionally requires a full date (review `wl-missing-date` if year-only).
8. **parentheticalSuffix**: texas parse suffix (e.g. `writ denied`); standard profile → "".
9. **history**: A long `history`. Texas: if the history begins with the same writ/petition phrase as the suffix (compare keys), keep it but add review `history-duplicates-suffix` (plan: flag, don't delete).
10. **shortName**: `wlCiteSelectShortName(A-standard shorts, primary)`; null if none.
11. **service failures**: A category ≠ ok → review `service-<category>`, profile `dom-only`, status `metadata-only`, and the record is built from DOM only (name from DOM header, primary from DOM citations, court from the court table only — if unresolved, "" + review). B failure with A ok → review `inventory-<category>` only.
12. **round trip**: run `wlCiteRoundTrip` on each parsed long form; mismatch → review `round-trip-mismatch`.
13. **status**: `validated-profile` iff A ok, B ok, court classification confidence `table`, and zero review reasons; `unverified-profile` if A ok but any review reason; `metadata-only` if A failed or no primary.
14. `provenance`: per field `service` / `dom` / `both` (both = service value matched DOM).
Never throw: wrap in try/catch returning a metadata-only record with review `reconcile-error`.

## Tests (synthetic envelopes built from the golden strings; use a helper that builds a `wlSvcReadEnvelope`-shaped object directly)
- G1 Sanchez full success → validated-profile; caseName, primary 187 F.3d 486, court `5th Cir.`, date `1999-08-25`, docket, shortName `Sanchez`, WL `1999 WL 652310` in alternates, history "".
- G4 Miele (A standard/westReporterOnly long `Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)`; DOM cites 2 A.D.3d 799 + 770 N.Y.S.2d 386) → primary N.Y.S.2d, alternates include A.D.3d and WL; court `App. Div.`.
- G5 Rogers texas (texas long with `writ denied`, history `disapproved of by Triplex …`) → suffix `writ denied`, court `Tex. App.—Beaumont`, Triplex cite NOT in alternates.
- G2 with history containing `566 F.3d 1095` → not an alternate.
- G7 WL-only synthetic → wlPrimary, docket required, full date.
- A auth failure → metadata-only record from DOM, review `service-auth`; B server failure → `inventory-server` only.
- DOM/service primary conflict; date conflict; year conflict; missing everything → no throw.

## Acceptance
`node --test "westlaw-us/src/test/reconcile.test.mjs"` passes; `wlMapToZoteroFields(wlRecReconcile(...))` output passes `wlMapValidateOutgoing` for every success fixture (add that assertion).

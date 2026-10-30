# M1-H Progress

<step>1 → 44/44</step>

## R1/R2/R3 Fixes (M1-H reconcile)

- **R1 (BLOCKER)**: `reconcile.js` now uses `texas.long` from svcA envelope styles for profile "texas" (falling back to `standard.long` if missing/unparseable). History for Texas profile now comes from the Texas long form, eliminating the "writ denied" duplication that occurred when using the standard long form.
- **R2 (MAJOR)**: Fixed `wlCiteRoundTrip` in `cite-parse.js` to apply `.normalize("NFC")` on the recomposed string before comparison, matching `wlTextClean` behavior on the original input. This fixes em-dash round-trip mismatches. The Texas long form now round-trips cleanly.
- **R3 (MAJOR)**: When the service primary conflicts with DOM, the conflicting service citation is now kind `"unparsed"` (not `"reporter"`) in alternates. True parallels from B allReporter or matching DOM citations remain kind `"reporter"`.
- Added regression tests for R1/R2 (Texas profile with texas.long, validated-profile, empty reviewReasons) and R3 (service primary conflict → unparsed alternate) in `reconcile.test.mjs`.

## W9 — forward DOM review reasons
- `reconcile.js`: `wlRecAddDomReasons` forwards `dom.reviewReasons` (strings matching `[a-z0-9:-]+`, deduped) into `rec.reviewReasons` on both the service path and the metadata-only path. `conflicting-header` therefore demotes to `unverified-profile`.
- `header-fallback` is listed in `wlRecNonDemotingReasons`: it only records that the DOM court/citations came from fallback selectors while the service forms still validated the citation, so it does not by itself block `validated-profile` (any other reason still demotes). It is still stored in `reviewReasons`.
- reconcile.test.mjs: `makeDom` now passes `reviewReasons` through; +7 tests. translator.test.mjs: `runDoWeb` routes by `styleIDs=westlaw|standard` (B registered first), `runDoWebRouted` merged into it; +4 doWeb tests. golden-inputs.mjs GUIDs for G2/G3/G5/G7 replaced with `I` + 32 repeated digits; item-fields substitution and 3 todos removed. Full suite 685/685, 0 todo.

## Review-final lane B (reconcile.js)
- **P1-2**: an `unparsed` DOM citation is never primary (service path and DOM-only path). No parsed primary -> demoting `no-citation`, status `metadata-only`. Unparsed DOM lines stay in `alternates` as `{kind:"unparsed", raw}` (raw copied from DOM `text`; match key uses the raw text so distinct lines are not collapsed).
- **P1-3**: `wlRecAddCodeReasons` is the shared `/^[a-z0-9:-]+$/` filter. Envelope reasons that fail it become one `envelope-reason-dropped`; DOM reasons that fail it are still dropped silently (unchanged). Note: camelCase echo-mismatch keys (`echo-mismatch:standard:parallelCiteRule`) would also be replaced, but echo-mismatched envelopes are never forwarded through reconcile (translator treats them as unusable).
- **P2-9**: service full date (`parsedA.date`, else inventory date) vs DOM full date -> demoting `date-conflict` (DOM kept). A DOM date that is absent/year-only yields to a full service date (no reason; removes the `wl-missing-date` side effect); a year-only DOM date whose year differs from the service date -> `date-conflict`, DOM kept. DOM dockets vs `parsedA.dockets` (No./Nos., whitespace, case ignored; comma/and lists compared as sets) -> demoting `docket-conflict`, DOM dockets kept.
- **P1-6**: `wlProfClassifyCourt(rawCourt, date)` gets the decision date; `eraUncertain: true` -> demoting `court-era-uncertain` (service and DOM-only paths).
- reconcile.test.mjs +19 tests. Full suite 812/812.

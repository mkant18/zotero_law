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

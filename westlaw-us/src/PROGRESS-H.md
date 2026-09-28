# M1-H Progress

<step>1 → 44/44</step>

## R1/R2/R3 Fixes (M1-H reconcile)

- **R1 (BLOCKER)**: `reconcile.js` now uses `texas.long` from svcA envelope styles for profile "texas" (falling back to `standard.long` if missing/unparseable). History for Texas profile now comes from the Texas long form, eliminating the "writ denied" duplication that occurred when using the standard long form.
- **R2 (MAJOR)**: Fixed `wlCiteRoundTrip` in `cite-parse.js` to apply `.normalize("NFC")` on the recomposed string before comparison, matching `wlTextClean` behavior on the original input. This fixes em-dash round-trip mismatches. The Texas long form now round-trips cleanly.
- **R3 (MAJOR)**: When the service primary conflicts with DOM, the conflicting service citation is now kind `"unparsed"` (not `"reporter"`) in alternates. True parallels from B allReporter or matching DOM citations remain kind `"reporter"`.
- Added regression tests for R1/R2 (Texas profile with texas.long, validated-profile, empty reviewReasons) and R3 (service primary conflict → unparsed alternate) in `reconcile.test.mjs`.

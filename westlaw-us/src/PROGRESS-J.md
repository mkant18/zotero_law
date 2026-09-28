# M1-J Progress (golden pipeline)

## Step W1: finalize `test/golden-pipeline.test.mjs` after the R4 fix
- G7 before R4 fix: `unverified-profile`, reviewReasons `["round-trip-mismatch","round-trip-mismatch"]` (docket + full date dropped by `wlCiteRoundTrip`).
- G7 after R4 fix: `validated-profile`, reviewReasons `[]`. Asserted (status + empty reason list).
- G3: console.log "status printed" test replaced by the same real assertion (observed `validated-profile`, `[]`).
- G4: already asserts `validated-profile`; no todo or expectation mismatch remains.
- G7 added: `Id. at *5` after a `*4` cite and after a no-locator first cite (E11 first-cite form confirmed: no dangling `, at`).
- golden-pipeline: 44/44.
- Status: complete

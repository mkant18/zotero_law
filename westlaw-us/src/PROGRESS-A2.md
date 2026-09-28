# M1-A2 Progress

## Step 1: Created cite-parse.js
- Implemented `wlCiteParseStandardForm`, `wlCiteParseTexasForm`, `wlCiteParseWestlawInventory`
- Implemented `wlCiteParseShortName`, `wlCiteSelectShortName`, `wlCiteRoundTrip`
- Helper functions: `wlCiteFindMatchingParen`, `wlCiteParseParentheticalStandard`, `wlCiteParseParentheticalTexas`, `wlCiteBuildCitation`, `wlCiteFindAnchorsInText`
- Status: complete

## Step 2: Created fixtures/cite-strings.json
- G1, G1b, G2, G4, G4pin, G5, G7 golden cases
- Synthetic adversarial cases: Illinois, Alabama, 3M, reporter-internal paren, history with later year, parallel run, unbalanced, empty input, no anchor
- Westlaw inventory cases: Sanchez and Miele
- Status: complete

## Step 3: Created test/cite-parse.test.mjs
- 36 tests across 5 suites
- All passing
- Status: complete

## Step 5: Defect fixes (D1 + D2)
- D1: Fixed pin detection regex in wlCiteParseStandardForm to require pin digits be followed by `, ` + next citation, ` (` , or end — not by more words. Added unparsed segment detection: non-anchor text between last main-run citation and parenthetical becomes Citation {kind:"unparsed", raw} + review reason "unknown-reporter".
- D2: Added docket region stripping from name in wlCiteParseStandardForm and wlCiteParseTexasForm. Comma-segment(s) before first anchor matching /^Nos?\. [0-9A-Za-z][\w\-\/:. ]*$/ are removed from name and returned as parsed.dockets (optional field). Added comment documenting the field.
- Added synthetic fixtures: d1UnparsedBetweenCitationAndParen, d2NoDocketInPartyName
- Updated G7 fixture: name corrected to "Example v. Sample", added dockets: ["No. 24-123"]
- Added 3 regression tests: D1 unparsed segment, D2 party-name No. not treated as docket, D2 docket stripped from name
- Status: 39/39 pass
- Combined with text + reporters: 105/105 pass

## Step 6: R4 round-trip fix (task W1)
- Defect: `wlCiteRoundTrip` dropped dockets and the full parenthetical date for WL forms (false `round-trip-mismatch` on G7); pin was always recomposed as `, at <pin>` even for bare pins (`486, 490`) and mid-run pins.
- `wlCiteParseParentheticalStandard`: `dateText` is now the full date token (`Mar. 1, 2024`) instead of the month only.
- `wlCiteParseStandardForm` / `wlCiteParseTexasForm`: new ParsedLongForm fields `dateText` (string|null; full date token when the parenthetical carries one), `pinAfter` (index of the citation the pinpoint follows, null if no pin), `pinAt` (true when the pin was written `at <pin>`). `date`, `year`, `pin`, `dockets` unchanged.
- New helper `wlCitePeelDockets` (shared by standard + texas): `Nos. 1-2, 3-4` -> `["Nos. 1-2", "3-4"]`; bare numbers only count as dockets after a `No./Nos.` segment.
- `wlCiteRoundTrip` recomposes: name + dockets + citations (pin at its original position) + `(court dateText|year[, suffix])` + `, history`; still exact equality against `wlTextClean(original)`.
- Tests: 10 new in `test/cite-parse.test.mjs` (R4-1..R4-4c, multi-docket, party-name bare numbers, 2 negatives). cite-parse 49/49.
- Status: complete

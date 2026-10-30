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

## Step 7: Independent-review defects (task W8)
- P1-1: `wlCiteParseParentheticalDate` (shared by the standard and Texas parenthetical parsers) parses `[court ]<Mon.> <D>, <YYYY>[, suffix]`; court no longer swallows the month/day (`Tex. App.—Houston [1st Dist.] Sept. 5, 2023, no pet.` -> court `Tex. App.—Houston [1st Dist.]`, dateText `Sept. 5, 2023`, suffix `no pet.`). `dateText` is the printed date token. The Texas parenthetical parser now falls back to the standard one for `court year` (no status). Court-less `(Sept. 5, 2023)` -> court `''`. G5 `(Tex. App.—Beaumont 1988, writ denied)` unchanged.
- P1-2: docket segments may carry short parentheticals (`No. 1:21-cv-123 (JPO)`, `No. 21-1 (L)`) and `&` / `and` joins. Tokenization (split on `, `, original text kept): `Nos. 22-1 & 22-2` -> [`Nos. 22-1 & 22-2`]; `Nos. 22-1, 22-2 and 22-3` -> [`Nos. 22-1`, `22-2 and 22-3`]; `No. 21-1 (L), 21-2` -> [`No. 21-1 (L)`, `21-2`]. When the peeled name still contains `, No. ` / `, Nos. ` both parsers add review reason `docket-in-name` (name is left intact). Name-safety cases (`Local 1199`, `Doe No. 2 v. Roe`, `In re Grand Jury Subpoena No. 7`, `$124,700 in U.S. Currency`, `No. 5 Corp.`, `Co., No. 5, Inc.`) have regression tests.
- P2: `wlCiteFindTrailingPin` (extracted from the standard parser) is shared, so the Texas parser gets the pin after the last citation; it also picks up an unparsed segment before the parenthetical (`unknown-reporter`), as the standard parser does. `history` now excludes its leading separator (`, ` or ` `); new `historySep` field stores it and `wlCiteRoundTrip` recomposes with it (default `, ` when absent), so `) (unpublished table decision)` round-trips. Round trip remains exact equality.
- P2 guard: cleaned input longer than 2000 chars -> `{ ok:false, reason:"input-too-long" }` in Standard/Texas/Inventory parsers (short-name parser returns null; `wlCiteFindAnchorsInText` skips the broad scan).
- Not changed (report only): multi-pin forms; `No. 1 Shoe Co.` over-peel ambiguity (`X, No. 1 Shoe Co., 1 F.3d 2` still peels the segment as a docket).
- Tests: 32 new in `test/cite-parse.test.mjs` (suite `W8`); cite-parse 81/81; full suite 723/723.

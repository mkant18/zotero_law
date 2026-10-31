# M1-A2 — citation dialect parsers (offline, pure)

Read `westlaw-us/tasks/COMMON.md`, `westlaw-us/src/CONTRACT.md` first. Plan §4 "Parsing algorithm" steps 1–9 (read carefully), §5 WL-only mapping.

## Allowed files
`westlaw-us/src/cite-parse.js`, `westlaw-us/src/test/cite-parse.test.mjs`, `westlaw-us/src/test/fixtures/cite-strings.json`, `westlaw-us/src/PROGRESS-A2.md`.

## Read-only inputs
- `westlaw-us/src/text.js`, `westlaw-us/src/reporters.js` (use `wlTextClean`, `wlTextParseUSDate`, `wlRepFindCitations`, `wlRepCanonical`, `wlRepLookup` as GLOBALS — do not copy them).
- `westlaw-us/src/test/helpers/load.mjs` — load with `loadModules(['text.js','reporters.js','cite-parse.js'])`.
Use synthetic service/citation fixtures under `westlaw-us/src/test/fixtures/`; real sample JSON is private and not required.

## Deliverables — `cite-parse.js` (prefix `wlCite`)
1. `wlCiteParseStandardForm(text)` and `wlCiteParseTexasForm(text)` → `ParsedLongForm` (CONTRACT). Algorithm per plan §4:
   - clean with `wlTextClean`; find citation anchors with `wlRepFindCitations` (plus WL cites).
   - The **main citation run** = the first anchor and every anchor that follows it separated only by `, ` or `, <pin>, ` (pin = digits or `*digits`, possibly a range). Pin after the FIRST citation of the run → `pin`.
   - `name` = text before the first anchor minus the trailing `, ` — NEVER split at the first comma.
   - Main parenthetical = the first balanced `( … )` immediately after the main run (allow a space). Skip reporter-internal parens like `(CCH)` that appear INSIDE the run. Parse it: standard → `<court> <year>` or `<year>` or WL-form `<court> <Mon.> <D>, <YYYY>` (→ `date` ISO + `year`); texas → `<court> <year>, <status>` where court may contain U+2014 (`Tex. App.—Beaumont`) and status → `parentheticalSuffix`.
   - `history` = everything after the main `)` with leading `, ` removed (may be ""). Anchors inside history are NOT added to `citations`.
   - Unrecognized reporter in the main run → `{kind:"unparsed", raw}` + review reason `unknown-reporter`; do not fail the whole parse if a known anchor exists.
   - Never fail silently: `ok:false` with a reason code for empty input, no anchor, no parenthetical, unbalanced parens.
2. `wlCiteParseShortName(shortText, primary)` — given a service short form like `Sanchez, 187 F.3d 486` / `Philip Morris USA Inc., 566 F.3d at 1105` / `187 F.3d 486` / `Id.` and the primary Citation, return the name-only short name (`Sanchez`, `Philip Morris USA Inc.`) or null (for `Id.`, citation-only forms, or when the citation part is incompatible with `primary`). `wlCiteSelectShortName(forms, primary)` picks from an array of short strings regardless of order.
3. `wlCiteParseWestlawInventory(text)` → `WestlawInventory` (CONTRACT) for the `westlaw` style / enhanced forms, e.g.
   `Sanchez v. Liggett & Myers, Inc., No. 98-40679, 187 F.3d 486 (5th Cir.(Tex.) Aug. 25, 1999)` and the Miele westlaw long form with many dockets, a Slip Op., and a WL cite `(N.Y.A.D. 2 Dept., Dec. 29, 2003)`. Dockets = the region between the name and the first citation anchor, starting with `No.`/`Nos.`; split on `, ` into separate dockets, keep the `No. ` prefix only on the first as written (store each raw). `date` from the parenthetical (`Dec. 29, 2003` → `2003-12-29`; `Oct. 06, 1988` ok). Do NOT return Bluebook court/name from this dialect (only `rawCourt`).
4. `wlCiteRoundTrip(parsed)` → recomposes `name, <citations joined ", "> (<court> <year>[, suffix])[, history]` and returns `{ ok, residual }` comparing to the original cleaned input (normalize whitespace only). Mismatch → review reason `round-trip-mismatch`.

## Fixtures and tests
`fixtures/cite-strings.json`: every distinct `long.text`, `short1`, `short2`, `enhancedDiffers` string for styles `standard`, `texas`, `westlaw` from the five cite-matrix files (all matrix variants + pin + allStyles), each with the expected parse you verified by hand. Plus these synthetic adversarial cases (write them yourself):
- `In re Estate of Smith, 100 N.E.2d 5 (Ill. App. Ct. 1950)`; `Ex parte Jones, 9 So. 2d 1 (Ala. 1942)`
- name with numerals + comma: `3M Co. v. Johnson, Inc., 10 F.4th 20 (Fed. Cir. 2021)`
- reporter-internal paren: `Doe v. Roe, 2020 Fed. Sec. L. Rep. (CCH) ¶ 100 (S.D.N.Y. 2020)` → unparsed kind + review reason, not a crash
- history containing a later year: `Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App. 1988), writ denied (July 12, 1989), and disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)` → year 1988, court `Tex. App.`, history starts `writ denied (July 12, 1989)`, citations has ONLY 761 S.W.2d 788.
- parallel run: `Miele v. Am. Tobacco Co., 2 A.D.3d 799, 770 N.Y.S.2d 386 (2003)` → two citations, court "", year 2003; with pin `2 A.D.3d 799, 802, 770 N.Y.S.2d 386 (2003)` → pin 802 attached to the first.
- WL-only: `Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)` via standard parser → name `Example v. Sample`, citations [WL 2024/1234567], pin `*4`, court `D. Kan.`, date `2024-03-01`, and the docket region reported as review reason `docket-in-long-form` or captured — document which.
- unbalanced: `Foo v. Bar, 1 F.3d 2 (5th Cir. 1999` → ok:false.
Tests assert full parsed objects for the golden G1, G2(D.D.C.), G1b(D.C. Cir.), G4, G5 (texas), and G7 strings, round-trip ok for all standard/texas long forms, and short-name selection for every case's short1/short2 pair.

## Acceptance
`node --test "westlaw-us/src/test/cite-parse.test.mjs"` passes; no `guid`/`title`/`html` values from the matrix appear in any file you write (the orchestrator will grep).

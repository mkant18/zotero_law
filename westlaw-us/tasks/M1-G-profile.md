# M1-G — court classification + citation profile policy (offline, pure, data tables)

Read `westlaw-us/tasks/COMMON.md`, `westlaw-us/src/CONTRACT.md`. Plan §4 "Chosen dialects and jurisdiction routing" table + "Discovering other state-specific exceptions", §5 "Court-parenthetical rules", §12.

## Allowed files
`westlaw-us/src/profile.js`, `westlaw-us/src/test/profile.test.mjs`, `westlaw-us/src/PROGRESS-G.md`.

## Read-only inputs
`westlaw-us/src/reporters.js`, `westlaw-us/src/text.js` (globals), `westlaw-us/src/test/helpers/load.mjs` (`loadModules(['text.js','reporters.js','profile.js'])`), `reports/10-WESTLAW-LIVE-FINDINGS.md` §2 (raw court line examples).

## Deliverables — `profile.js` (prefix `wlProf`)
1. `wlProfClassifyCourt(rawCourt)` → `{ system:"federal"|"state"|"unknown", level:"supreme"|"appellate"|"district"|"bankruptcy"|"intermediate"|"trial"|"unknown", state: "TX"|null, circuit:"5"|"DC"|"Fed"|null, district:null|"D.D.C."…, bluebook: "5th Cir."|null, confidence:"table"|"none" }` from the Westlaw raw court line. Data-table driven (`wlProfCourtTable`), matching after `wlTextClean` + case-insensitive + trailing "." removal. Must cover at least:
   - `Supreme Court of the United States` → federal/supreme, bluebook "" (omitted with U.S.; see rule below).
   - `United States Court of Appeals, <Nth> Circuit.` for First–Eleventh, `District of Columbia Circuit`, `Federal Circuit` → `1st Cir.` … `11th Cir.`, `D.C. Cir.`, `Fed. Cir.`.
   - `United States District Court, District of Columbia.` → `D.D.C.`; `United States District Court, D. Kansas.` / `District of Kansas` → `D. Kan.`; `S.D. New York` / `Southern District of New York` → `S.D.N.Y.`; plus N.D. Cal., C.D. Cal., E.D. Pa., N.D. Ill., S.D. Tex., N.D. Tex. (a table of Bluebook state abbreviations T10 for districts: include all 50 states + D.C. + P.R.).
   - `Supreme Court, Appellate Division, Second Department, New York.` → state NY intermediate, bluebook `App. Div.` (Bluebook requires the department only in some contexts — store `App. Div.` exactly as the golden G4).
   - `Court of Appeals of Texas, Beaumont.` → state TX intermediate, bluebook `Tex. App.—Beaumont` (U+2014); include all 14 Texas courts of appeals cities (Houston [1st Dist.], Houston [14th Dist.], Fort Worth, Austin, San Antonio, Dallas, Texarkana, Amarillo, El Paso, Beaumont, Waco, Eastland, Tyler, Corpus Christi–Edinburg).
   - `Supreme Court of California.` → state CA supreme, bluebook `Cal.`; generic `Supreme Court of <State>.` → `<T10 abbr>` for all 50 states (e.g., `Supreme Court of Texas.` → `Tex.`).
   - Unknown lines → system unknown, bluebook null, confidence none (NEVER guess).
2. `wlProfSelectProfile(classification)` → `"texas"` only for Texas state intermediate appellate courts (NOT Texas federal courts: `United States Court of Appeals, Fifth Circuit.` with a Texas title facet is `standard`); else `"standard"`.
3. `wlProfCourtForCitation(classification, primary, serviceCourt)` → `{ court, reviewReasons }` applying plan §5 omission rules: SCOTUS + `U.S.` reporter → "" (no authority); regional reporter (`P.2d`, `S.W.2d`, `N.E.2d`, …) never implies the state → keep state authority; state official reporter implies state high court only per a small explicit table (`Cal.`/`Cal. 2d`… ⇒ Supreme Court of California; `N.Y.`/`N.Y.2d`/`N.Y.3d` ⇒ N.Y. Court of Appeals) → "" ; otherwise use the service court (if given) when it is consistent with the classification's bluebook value (compare with `wlTextCompareKey`), else table value; conflict → keep service value + review reason `court-conflict`; neither → "" + review reason `court-unresolved`.

## Tests
Every table category above with representative lines; Texas 14 cities incl. `Houston (1st Dist.)` / `Houston [14th Dist.]` variants; negative: Fifth Circuit (federal, not texas profile), unknown court line; omission rules: Brown `347 U.S. 483` SCOTUS → ""; Sindell `607 P.2d 924` Cal. Supreme → `Cal.`; `26 Cal. 3d 588` → ""; Miele `770 N.Y.S.2d 386` App. Div. → `App. Div.`; Sanchez service court `5th Cir.` consistent → `5th Cir.`; conflict case → review reason.

## Acceptance
`node --test "westlaw-us/src/test/profile.test.mjs"` passes; all 50 states + D.C. present in the T10 table (test counts them).

# Golden citation targets (registry)

Source: `reports/20-ASTRA-ARCHITECTURE.md` §11 "Golden citation examples". Law-review CSL may add a terminal
period; first full law-review case names remain roman, short names italicized. Strings below are citation bodies (plain text). G1/G4 received bounded independent review in [citation audit](../../reports/zotero-citation-audit-2026-10-11.md); direct Bluebook edition/table access remains unresolved.

Status labels: **[V]** observed in a recorded service matrix (`westlaw-samples/cite-matrix/*.json`, private);
**[P]** proposed/illustrative, not a Westlaw fixture; **[U]** unverified recipe; **[S]** synthetic/fictional.
"Reviewed" = independently checked against Bluebook conventions by a reviewer who did not author it. Westlaw
output alone is NOT correctness evidence.

| ID | Class | Target first cite | Evidence | Live fixture? | Golden reviewed? |
|---|---|---|---|---|---|
| G1 | Federal appellate | `Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)`; pin `…486, 490 (5th Cir. 1999)`; short `Sanchez, 187 F.3d at 490`; stored date `1999-08-25` | [V] recorded (standard, all 4 parallel rules, history=false; pin via pubPages) | recorded matrix only; connector path **not yet tested** | pending (M0 review) |
| G1b | Federal appellate (D.C. Cir.) | `United States v. Philip Morris USA Inc., 566 F.3d 1095 (D.C. Cir. 2009)` | [V] recorded | recorded matrix only | pending |
| G2 | Federal district + history | `United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009), …` | [V] base recorded; history tail recorded under CAFormat only; [U] westReporterOnly+history | recorded matrix only | pending |
| G3 | SCOTUS | `Brown v. Bd. of Educ., 347 U.S. 483 (1954)`; pin 495; no `(U.S. 1954)` | [P] illustrative | **missing** — needs user-authorized real sample | not reviewable until real |
| G4 | NY App. Div. | `Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)`; alternates `2 A.D.3d 799`, `2003 WL 23099090` retained, not printed | [V] recorded standard/westReporterOnly | recorded matrix only | pending |
| G5 | Texas App. | `Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)` (U+2014) | [V] texas/CAFormat/history=false; [U] texas/westReporterOnly/history=true | recorded matrix only | pending |
| G6 | State high court | `Sindell v. Abbott Labs., 607 P.2d 924 (Cal. 1980)`; paired official `Sindell v. Abbott Labs., 26 Cal. 3d 588 (1980)` | [P] illustrative | **missing** | not reviewable until real |
| G7 | WL-only (fictional) | `Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)`; short `Example, 2024 WL 1234567, at *4`; `Id. at *5`; no-locator form omits `, at *4` | [S] synthetic format fixture | **missing** — real unpublished opinion required before M1 sign-off | [V] offline golden pipeline validated-profile (format only; real fixture still required) |

M0 does not declare G3, G6, or real-WL-only coverage. A published case's alternate WL number is not a WL-only test.


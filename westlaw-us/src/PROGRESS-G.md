1 → 71/71 → 228/228

## Review findings fixes

### P1 (MAJOR): SCOTUS court omission for any reporter
- Fixed `wlProfCourtForCitation`: when classification is federal/supreme, ANY reporter (not just U.S.) now returns court "" with no review reason.
- Added tests for S. Ct., L. Ed., L. Ed. 2d reporters with SCOTUS.

### P2 (MAJOR): Data-driven table rules for raw court lines
- Added division suffix stripping in `wlProfProcessCourt`: strips ", <Name> Division" suffix before matching.
- Added bankruptcy court entries: "United States Bankruptcy Court, <district>" → "Bankr. <district>" (e.g. Bankr. S.D.N.Y., Bankr. S.D. Tex.).
- Added Court of Criminal Appeals of Texas (Tex. Crim. App.) and Oklahoma (Okla. Crim. App.).
- Added Court of Appeals of New York → N.Y. (high court), Court of Appeals of Maryland → Md., Supreme Court of Maryland → Md., Appellate Court of Maryland → Md. App. Ct.
- Added Supreme Judicial Court of Massachusetts (with optional county) → Mass., Supreme Judicial Court of Maine → Me., Appeals Court of Massachusetts (with optional county) → Mass. App. Ct.
- Added Court of Appeal, <N> District[, Division <M>], California → Cal. Ct. App.
- Added Appellate Court of Illinois, <N> District[, <M> Division] → Ill. App. Ct.
- Added generic "Court of Appeals of <State>" for explicit list of 20 states (GA, MI, OH, AZ, CO, IA, KS, KY, MN, NC, NM, OR, SC, TN, UT, WA, WI, MO, IN, NE) → "<abbr> Ct. App." (NY and Maryland excluded as high courts).
- Added general "united states district court, <district>" regex entry to handle division-suffix-stripped names via wlProfDistrictMap lookup.
- Added 20+ entries to wlProfDistrictMap for full-state-name variants (e.g. "s.d. texas" → "S.D. Tex.").

### P3 (MINOR): court-unclassified review reason
- Fixed `wlProfCourtForCitation`: when classification is unknown (confidence none) and a service court is supplied, keeps the service court but adds review reason "court-unclassified".

### P4 (MAJOR): Fix generic Supreme Court of <State> matching Appellate Division/Appellate Term/County
- Fixed `wlProfProcessCourt`: division suffix stripping now only applies to district/bankruptcy court names (not NY appellate courts).
- Fixed generic `^supreme court of (.+)$` regex → `^supreme court of ([a-z]+(?:\s+[a-z]+)?)(?:,\s*[a-z ]+ county)?$` so it only matches the state name, not trailing content like "Appellate Division" or county names.
- Added explicit NY rules: Appellate Division[, Department] → "App. Div.", Appellate Term[, Department][, New York] → "N.Y. App. Term", County courts → "N.Y. Sup. Ct.".
- Added regression tests: no line containing "Appellate Division", "Appellate Term", or "County" is classified as state supreme.

### P5: Support "for the" phrasing in federal court names
- Added regex entries for "United States District Court for the <district>", "United States Court of Appeals for the <circuit>", "United States Bankruptcy Court for the <district>".
- Added `wlProfCircuitForTheMap` to map word-form circuit names (e.g. "fifth circuit", "district of columbia circuit") to circuit keys.
- Added 7 new tests covering D.D.C., D. Kan., S.D.N.Y., 5th Cir., D.C. Cir., Bankr. D.D.C., Bankr. S.D.N.Y.

### P6: Fix word-form ordinals for Illinois Appellate Court
- Updated Illinois regex from `\d+(?:st|nd|rd|th)?` to also match word-form ordinals (`first`, `second`, `third`, `fourth`, etc.) for both district and division numbers.
- Added 2 new tests: "First District, Fourth Division" and "First District" (without division).

### Test results
- 71/71 → 101/101 → 114/114 (13 new tests added for P4/P5/P6)

## W3 — state court-table backlog (ledger §5 item 2)
- Added full-match rows to `wlProfCourtTable` (confidence `table`; qualifier text is never carried into the abbreviation, matching Ill. App. Ct./Cal. Ct. App.):
  - PA: Supreme Court (optional Eastern/Middle/Western District) → Pa.; Superior Court → Pa. Super. Ct.; Commonwealth Court → Pa. Commw. Ct.
  - OH: Court of Appeals, optional `<1st–12th|first–twelfth> District[, <X> County]` → Ohio Ct. App.
  - FL: District Court of Appeal of Florida, optional 1st–6th District → Fla. Dist. Ct. App.
  - NJ: Superior Court, Appellate Division → N.J. Super. Ct. App. Div.
  - LA: Court of Appeal of Louisiana, optional 1st–5th Circuit → La. Ct. App.
  - VA Va. Ct. App.; MD Court of Special Appeals → Md. Ct. Spec. App.; CT Appellate Court → Conn. App. Ct.
  - TN: Court of Appeals → Tenn. Ct. App.; Court of Criminal Appeals → Tenn. Crim. App. (optional `at Nashville|Knoxville|Jackson`).
  - MO Eastern/Western/Southern District; WA Division 1–3; AZ Division 1–2 (word or digit).
- Fixed `wlProfIntermediateAppellateMap.colorado`: `Colo. Ct. App.` → `Colo. App.` (Bluebook T1).
- Left unknown (not confident of abbreviation/Westlaw line format): Colorado division qualifiers, Wisconsin district qualifiers, Virginia city qualifiers, NJ Law/Chancery Division, Ohio/PA trial courts, Supreme Court of Appeals of West Virginia.
- Open: district/division/circuit numbers are dropped from the abbreviation (Bluebook 10.4(b) relevance rule not modelled); `Ore.` (table) vs Bluebook `Or.` not changed; existing `Court of Appeals of Maryland` is level `intermediate` (existing test) though it is the pre-2022 high court.
- Tests: 114 → 182 in `profile.test.mjs` (positives, near-miss unknowns, Texas/profile unchanged, omission policy).

## W4 — profile.js correctness fixes
- Oregon: `wlProfT10.oregon` `Ore.` → `Or.`; `wlProfIntermediateAppellateMap.oregon` `Ore. Ct. App.` → `Or. Ct. App.` (Bluebook T1/T10). No test had asserted `Ore.`.
- Maryland: `Court of Appeals of Maryland` (pre-Dec-2022 high court) level `intermediate` → `supreme`, `Md.`; the existing test expecting `intermediate` was corrected (authorized wrong-data fix). Special Appeals / Appellate Court / Supreme Court of Maryland unchanged.
- Added rows: `Supreme Court of Appeals of West Virginia` → supreme WV `W. Va.`; `District of Columbia Court of Appeals` → supreme, state code `DC`, `D.C.` (exact full-match; qualifiers stay unknown). NY / MA / ME / TX / OK high-court rows already existed and now have positive tests in the `W4` suite.
- Generic `court of appeals of (<state list>)` row does not include New York or Maryland (asserted by a test).
- Kentucky `Court of Appeals of Kentucky` (highest court pre-1976) left as intermediate `Ky. Ct. App.` with a code comment; no date logic. Open question.
- Tests: 182 → 215 in `profile.test.mjs` (positives, near-miss unknowns, Texas profile unchanged, N.Y. omission policy with N.Y.2d/N.Y.3d vs N.E.2d/N.E.3d).

## W10 — New York trial-level Supreme Court classification fix
- Bug: bare `Supreme Court of New York.` and `Supreme Court, New York.` (no county/department qualifier) were matching generic `^supreme court of (<state>)...` row and incorrectly classified as state supreme (high court), when NY Supreme Court is actually the trial court; high court is Court of Appeals.
- Fix: added two new full-match rows (anchored `^...$`) for NY trial court BEFORE the generic row:
  - `^supreme court of new york$` → trial level, state `NY`, bluebook `N.Y. Sup. Ct.`, confidence `table`
  - `^supreme court, new york$` → trial level, state `NY`, bluebook `N.Y. Sup. Ct.`, confidence `table`
- Also tightened existing county-pattern rows to use 1-3 word county names instead of unlimited: `[a-z]+(?:\s+[a-z]+){0,2}` instead of `[a-z ]+` (matches 1-3 words, stops at 4+ word names).
- Table order preserved: App. Div./App. Term rows still precede the new plain-text rows; generic row remains last and unreachable for NY.
- Omission policy verified: `wlProfCourtForCitation` does NOT blank `N.Y. Sup. Ct.` for trial-level reporters (Misc., Misc. 2d, Misc. 3d, N.Y.S.2d, N.Y.S.3d) because the bluebook abbreviation `N.Y. Sup. Ct.` does not match the high-court reporter list `{N.Y., N.Y.2d, N.Y.3d}` keyed by reporter, so the classification bluebook is returned as-is (Bluebook rule: trial courts keep their abbreviation in trial reporters).
- Tests added: 2 positive (bare forms), 5 omission policy tests (trial court + Misc./N.Y.S. reporters), 4 near-miss negatives (App. Div. stays intermediate, county-without-state stays unknown, New Yorkshire stays unknown), 3 spot-checks (CA/FL/TX Supreme Courts unaffected and stay high court).
- Tests: 215 → 228 in `profile.test.mjs` (13 new tests added for W10).

1 → 71/71

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

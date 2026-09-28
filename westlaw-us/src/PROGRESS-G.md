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

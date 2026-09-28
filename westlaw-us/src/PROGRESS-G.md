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

### Test results
- 71/71 → 101/101 (30 new tests added)

Westlaw native repair progress — 2026-10-30

Current source: plugin 0.1.0beta4, translator 0.3.5. The plugin was installed
through Zotero's native add-on manager and its bundled resources matched the
registered translator and citation style. The published beta1 release and update
feed have not been replaced.

Repairs retain a verified U.S. Reports primary citation and its short name,
deduplicate equivalent docket dash variants, strip structured star-page markers
from majority bylines, and resolve linked judges through Westlaw's observed
native profile requests. This replaces clicking copied DOM buttons, which cannot
invoke live page handlers in the Chrome MV3 offscreen translator document.
Profile identity, surname and case must agree; requests use a fixed origin,
at most two profile GETs, no retries, and the original 20-second save deadline.

A surname-only majority byline is accepted when unambiguous. Missing first names
are not a citation defect and no longer cause a review flag or validation penalty.
The installed CSL case-citation path does not print the judge's name. Explicit
first names are retained when available; ambiguous bylines and conflicting
profiles still generate review reasons.

Native verification on Zotero 10.0.6 and Chrome Connector: five fresh saves on
translator 0.3.4 covered Brown, Sindell, Rogers, Philip Morris and Hulsey. Stored
fields and full/short/pinpoint/Id. output passed 51 checks. Brown used 347 U.S. 483
and short title Brown; Rogers had one No. 09-87-120 CV; Philip Morris and Hulsey
resolved the explicit names Gladys Kessler and Janis Graham Jack. All five saved
metadata without attachments. Word inserted two live Hulsey fields using the local
style, displayed the full citation then italic Id., and preserved both fields
after save, close, reopen and refresh. Five document-file checks passed.

The final 0.3.5 surname policy was then checked with another normal Connector
save of Brown: WARREN retained, firstName empty, no author-name-incomplete flag,
and unchanged full, short and Id. citations. Other source conflict flags remain.
A public-entry-point regression also proves that a clean surname-only case can
reach validated-profile without a citation-review tag or extra profile requests.

Verification command: `python scripts/test.py` — 873 JavaScript tests and
11 Python build/runner tests pass. The surname-policy regression failed before
the fix. Build command: `python scripts/build-plugin.py`.

Limits: this verifies the tested native journeys, not every Westlaw document or
edition-specific Bluebook rule. LibreOffice and live authentication/rate-limit/
outage fallback are unverified; failure paths have offline coverage. Existing
saved items are not migrated. Re-save affected cases and reconcile old duplicates.
Private browser captures, session identifiers, raw library exports, local paths
and the Word document are excluded from this progress commit.

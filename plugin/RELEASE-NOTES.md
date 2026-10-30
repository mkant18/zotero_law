# Beta v.1 — Westlaw Advantage US

Package version: **0.1.1beta1**. Bundles translator **0.3.5** with a source-derived build identifier and the local Bluebook Law Review CSL style. This version advances beyond all earlier 0.1.0 beta builds; no existing tag or versioned release is replaced.

Merged main, release, and offline-prototype histories before packaging. Includes the reviewed required-metadata, Texas full-date, HTTP-status, staged-packaging/rollback, and browser-helper repairs. The main-branch parser, court-table, review-code, and fallback changes are integrated with the current repair behavior.

Merge decisions: header authority wins ordinary court conflicts; Texas district completion and New York reporter-specific omissions remain supported. Conflicting docket sets are retained and flagged. Current required-metadata rejection and explicit majority-byline/profile evidence take precedence over older permissive validation and signature scanning. Unknown jurisdictions cannot inherit a court solely from an unrelated official reporter.

Install the XPI through Zotero → Tools → Plugins → gear → Install Plugin From File. Refresh Westlaw and save with Zotero Connector while Zotero desktop runs. Choose **Bluebook Law Review (Westlaw US local)** for citations. Repository access is required for private downloads; manual updates may be necessary.

Fresh verification is limited to bounded offline merge, metadata, built-translator, and packaging checks, plus inspection of the actual XPI/checksum/feed. The full suite was not rerun. Earlier native Zotero/Chrome/Word acceptance below is historical; the merged package has not been installed or freshly accepted through those apps. LibreOffice remains unverified. See [verification evidence](../reports/beta-v1/VERIFICATION.md).

The translator saves metadata without opinion text or attachments. Previously saved items are not migrated. Review uncertainty flags and citation output. Compatibility is declared for Zotero 7–10; no claim of complete Bluebook compliance is made.

---

## Earlier repair build (historical evidence)

Westlaw Advantage US 0.1.0beta4 (repair build)

Local metadata-repair beta. Bundles the current Westlaw US translator
(0.3.5) and local Bluebook Law Review CSL derivative. Installs into the active
Zotero data directory, reloads both resources, and backs up replaced files in
westlaw-us-plugin-backups. Disabling/removing restores the files present at
startup when the installed copies have not subsequently been edited. Application
exit keeps the resources on disk. Saved library items are never migrated.

Install: download the XPI, open Zotero → Tools → Plugins → gear → Install Plugin
From File. Select the XPI. Refresh the Westlaw tab and save with Zotero Connector
while Zotero desktop is running. Choose “Bluebook Law Review (Westlaw US local)”
when citing. Requires a Westlaw subscription; no login credentials are bundled.

Compatibility declared for Zotero 7–10. Native verification targets Zotero 10.0.6;
earlier versions are not individually tested. Zotero Connector is a separate
browser extension. This beta is in a private GitHub repository: downloads and
update checks require repository access. Zotero's background updater may not
authenticate to private GitHub; install subsequent beta XPIs manually if needed.

Repairs: Supreme Court cases prefer a verified U.S. Reports citation and retain
short names from a verified parallel citation. Equivalent docket dash variants
are deduplicated. Structured star-page markers no longer obscure majority
bylines. Linked judges are resolved through Westlaw's native profile requests;
the profile GUID and explicit name must agree with the majority link and case.
An unambiguous surname-only majority byline is accepted without a missing-first-name
warning or citation-validation penalty. Judge names are retained as metadata;
the local case-citation style does not print them. Ambiguous bylines and conflicting
linked profiles remain flagged rather than guessed. Requests
are bounded by the existing 20-second save deadline, with at most two additional
profile GETs and no automatic retries. No credentials are persisted or logged.

Review saved metadata and citation output. Source/profile uncertainty flags are retained.
Live acceptance: five fresh Chrome Connector saves on Zotero 10.0.6, with stored
fields and full/short/pinpoint/Id. output read back from the installed CSL engine.
Word inserted two live Hulsey fields (full citation and Id.), saved, reopened,
and refreshed them. LibreOffice and live failure/fallback paths remain unverified.
Brown, Sindell and Rogers expose surname-only majority bylines with no linked
judge profile in these documents; their supplied surnames are sufficient metadata.
The translator targets US case documents at https://1.next.westlaw.com/ and saves
metadata rather than opinion text or attachments. No claim of complete Bluebook
compliance. Previously saved items require manual review.

Historical note: the 0.1.0beta4 repair build preceded Beta v.1. Earlier releases remain available.

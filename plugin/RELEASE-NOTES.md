Westlaw Advantage US 0.1.0beta1

First installable Zotero plugin beta. Bundles the current Westlaw US translator
(0.3.2) and local Bluebook Law Review CSL derivative. Installs into the active
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

Known limitations: official U.S. Reports preference, equivalent docket dash
normalization, and complete opinion-author resolution remain unresolved. Review
saved metadata and citation output. Source/profile uncertainty flags are retained.
Word/LibreOffice integration and live failure/fallback paths remain unverified.
The translator targets US case documents at https://1.next.westlaw.com/ and saves
metadata rather than opinion text or attachments. No claim of complete Bluebook
compliance. Previously saved items require manual review.

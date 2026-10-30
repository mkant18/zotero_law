# zotero_law

Research and planning for a personal Zotero web translator that saves **Westlaw Advantage (US)** case
documents as Zotero `case` items that cite cleanly in **Bluebook**.

Installable beta: [GitHub releases](https://github.com/mkant18/zotero_law/releases).
Download the `.xpi`, then in Zotero open **Tools → Plugins → gear → Install Plugin From File**.
Refresh the Westlaw tab and use Zotero Connector with Zotero desktop running.
Choose **Bluebook Law Review (Westlaw US local)** for citations.

The beta bundles the translator and CSL style. See [release notes and limitations](plugin/RELEASE-NOTES.md)
and [installation details](westlaw-us/INSTALL.md). Repository visibility is private;
downloads require access and automatic update authentication may be unavailable.

Build with `python scripts/build-plugin.py` (Python 3 and Node.js required).
Artifacts: `dist/*.xpi`, `dist/updates.json`, `dist/SHA256SUMS.txt`.

Run all checks with `python scripts/test.py` (also works from another directory using
the script's full path). This runs translator, citation/schema, privacy, probe,
plugin lifecycle, and isolated XPI build tests; any failed suite returns a nonzero exit.
The citation tests require the existing upstream `zotero/` and `utilities/` clones
(see `scripts/clone-upstream.sh`) and Python `lxml`. Build tests use temporary
directories and never install, publish, or replace release artifacts in `dist/`.
The translator suite rebuilds `westlaw-us/dist/Westlaw Advantage US.js`.

## Layout
- `reports/00-SYNTHESIS.md` — consolidated findings: Zotero, the Chrome connector (MV3), translators, `case` → CSL → Bluebook.
- `reports/10-WESTLAW-LIVE-FINDINGS.md` — live Westlaw page anatomy + the Copy-with-Reference citation service and its full option map.
- `reports/A–F*.md` — individual scout and cross-audit reports (DeepSeek V4 Flash / Ling 3.0 Flash).
- `westlaw-samples/cite-matrix/*.json` — citation-service test matrix results; `citations-settings.json` — Westlaw citation option catalogue.
- `tools/` — Chrome DevTools Protocol helpers used for read-only inspection of logged-in Westlaw tabs.
- `ASTRA-PROMPT.md` — prompt for the architecture session.
- `scripts/clone-upstream.sh` — re-creates the upstream source clones (zotero, zotero-connectors, translate, utilities, translators, styles) the reports cite.

Not committed (see `.gitignore`): upstream clones, saved Westlaw HTML (full opinion text, account identifiers), captured Westlaw JavaScript.

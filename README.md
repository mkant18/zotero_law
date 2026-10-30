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
(see `scripts/clone-upstream.sh`), Python `lxml`, and the pinned locale file
`westlaw-us/.cache/csl-locales/locales-en-US.xml` (CSL locales commit `a89adece`,
recorded in `westlaw-us/LEDGER.md`). Build tests use temporary
directories and never install, publish, or replace release artifacts in `dist/`.
The translator suite rebuilds `westlaw-us/dist/Westlaw Advantage US.js`.

[GitHub Actions](https://github.com/mkant18/zotero_law/actions/workflows/tests.yml)
runs the full `python scripts/test.py` suite on every push and pull request, on
Windows and Linux. The workflow checks out pinned upstream sources and locales,
installs the XML validator, and also supports manual runs from the Actions tab.

These checks run offline after dependencies are installed: no computer use, browser,
running Zotero, Westlaw login, API keys, or external API requests are needed.
The built-translator journey tests run `detectWeb` and `doWeb` against synthetic DOM
fixtures and local response stubs, then pass the completed items through Zotero's
real item-to-CSL conversion and citeproc engine. Six cases cover federal, Supreme
Court, New York, Texas/history, and WL-only citations, including first, pinpoint,
short, and Id. forms. Failure scenarios cover missing credentials, expired login,
rate limiting, network failure, and malformed responses; they must retain usable
DOM metadata and a citation-review flag. Existing suites cover parsing, field
validation, author resolution, request deadlines/identity checks, privacy, plugin
installation/rollback, and release packaging.

Run just the offline journey checks with:
`node --test --test-name-pattern="offline journey" westlaw-us/src/test/translator.test.mjs`.
Failures identify the case/scenario and mismatched assertion; both commands return
a nonzero exit on failure. The DOM and Zotero host calls are simulated, so these
checks cannot establish compatibility with a changed live Westlaw page, native
Connector installation, or Word/LibreOffice integration.

## Layout
- `reports/00-SYNTHESIS.md` — consolidated findings: Zotero, the Chrome connector (MV3), translators, `case` → CSL → Bluebook.
- `reports/10-WESTLAW-LIVE-FINDINGS.md` — live Westlaw page anatomy + the Copy-with-Reference citation service and its full option map.
- `reports/A–F*.md` — individual scout and cross-audit reports (DeepSeek V4 Flash / Ling 3.0 Flash).
- `westlaw-samples/cite-matrix/*.json` — citation-service test matrix results; `citations-settings.json` — Westlaw citation option catalogue.
- `tools/` — Chrome DevTools Protocol helpers used for read-only inspection of logged-in Westlaw tabs.
- `ASTRA-PROMPT.md` — prompt for the architecture session.
- `scripts/clone-upstream.sh` — re-creates the upstream source clones (zotero, zotero-connectors, translate, utilities, translators, styles) the reports cite.

Not committed (see `.gitignore`): upstream clones, saved Westlaw HTML (full opinion text, account identifiers), captured Westlaw JavaScript.

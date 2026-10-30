<div align="center">

# Westlaw → Zotero

### From the case page to your next citation.

Save **Westlaw Advantage US** cases in Zotero, with structured metadata and a bundled Bluebook Law Review citation style.

[![Beta v.1](https://img.shields.io/badge/release-Beta_v.1-6D5EF5?style=for-the-badge)](https://github.com/mkant18/zotero_law/releases/tag/v0.1.1beta1)
[![Zotero](https://img.shields.io/badge/Zotero-7–10-CC2936?style=for-the-badge)](https://github.com/mkant18/zotero_law/blob/main/westlaw-us/INSTALL.md)
[![Metadata only](https://img.shields.io/badge/metadata-only-167D7F?style=for-the-badge)](#privacy)

**[Download Beta v.1](https://github.com/mkant18/zotero_law/releases/download/v0.1.1beta1/westlaw-advantage-us-0.1.1beta1.xpi)** · **[Installation guide](westlaw-us/INSTALL.md)** · **[Release notes](plugin/RELEASE-NOTES.md)** · **[Report an issue](https://github.com/mkant18/zotero_law/issues)**

</div>

---

## A better starting point for case citations

One Zotero plugin bundles the Westlaw translator and a local Bluebook CSL style. Save from a US case page using Zotero Connector, then cite from your library.

| Capture | Cite | Review |
| :--- | :--- | :--- |
| Case name, court, decision date, dockets, reporter citations, and identifiable majority author. | Full, pinpoint, short, and *Id.* forms through **Bluebook Law Review (Westlaw US local)**. | Visible review flags when source metadata is missing, conflicting, or uncertain. |

The translator handles federal and supported state case formats, including Texas and Westlaw-only citations. It preserves useful DOM metadata when citation-service requests fail.

## Install in a minute

You need **Zotero desktop**, **Zotero Connector** in your browser, and an active **Westlaw subscription**.

1. **[Download the Beta v.1 XPI](https://github.com/mkant18/zotero_law/releases/download/v0.1.1beta1/westlaw-advantage-us-0.1.1beta1.xpi)**.
2. In Zotero, open **Tools → Plugins → gear → Install Plugin From File** and select the `.xpi`.
3. Keep Zotero desktop running. Refresh your Westlaw case page and save with **Zotero Connector**.
4. Select **Bluebook Law Review (Westlaw US local)** when citing.
5. Review the saved fields and any **Westlaw: needs citation review** tag before using a citation.

> **Private beta:** this repository and its downloads require access. If Zotero cannot authenticate for automatic updates, download and install the next XPI manually.

The plugin backs up replaced translator/style files. Disabling or removing it restores those backups when the installed copies have not been edited. Existing library items are never migrated. See the [installation and rollback guide](westlaw-us/INSTALL.md).

## What is in Beta v.1?

- Merged main, release, and offline-prototype histories, including the latest reviewed repairs.
- Structured majority-author metadata, verified linked-profile enrichment, and acceptance of unambiguous surname-only bylines.
- Improved official-reporter selection, docket retention, court conflict checks, and full decision dates for Texas WL citations.
- Required-metadata validation and useful fallback metadata on failed citation-service requests.
- Staged packaging with checksums and rollback of partial output replacement.

**Package version:** `0.1.1beta1`; **translator:** `0.3.5` with a source-derived build identifier. The package version advances beyond the earlier `0.1.0beta4` repair build. Earlier published releases remain available.

## Beta boundaries

The plugin declares Zotero **7–10** compatibility. Earlier native acceptance used **Zotero 10.0.6**, Chrome Connector, and a Word save/reopen/refresh journey. That evidence predates this merged package. This release has bounded offline merge, built-translator, metadata, and packaging checks; it has **not** had a fresh native Westlaw/Connector/Word acceptance run. LibreOffice remains unverified.

Coverage is incomplete, and no claim of complete Bluebook compliance is made. Changed Westlaw pages may require updates. Judge names are stored as metadata; the bundled case-citation style does not print them. Previously saved items need manual review or re-saving after fixes.

## Privacy

The translator saves **case metadata**, without opinion text, PDFs, snapshots, or attachments. User-triggered requests use the current Westlaw session to retrieve citation metadata and, when needed, a bounded number of linked judge profiles. Credentials are not bundled, persisted, or logged by the translator. Review and redact diagnostic logs before sharing them.

Private page captures, upstream clones, and generated release archives stay outside tracked source. The plugin is independent of Zotero, Thomson Reuters, Westlaw, and The Bluebook.

## Build and contribute

Requires Python 3 and Node.js; no package installation is needed for the XPI build.

```bash
python scripts/build-plugin.py
```

Outputs: `dist/westlaw-advantage-us-0.1.1beta1.xpi`, `dist/updates.json`, and `dist/SHA256SUMS.txt`.

The complete offline verification entry point is:

```bash
python scripts/test.py
```

It runs translator, citation/schema, privacy, probe, plugin lifecycle, packaging, and runner checks. Citation tests need the upstream `zotero/` and `utilities/` clones from [clone-upstream.sh](scripts/clone-upstream.sh), Python `lxml`, and the pinned CSL locale described in the [ledger](westlaw-us/LEDGER.md). Tests use synthetic DOM fixtures and local response stubs; they do not establish native browser or word-processor compatibility. GitHub Actions is configured for Windows and Linux. A configured workflow does not establish a passing run.

For this release, the previously recorded restriction against rerunning the full suite remains in force. See [release verification](reports/beta-v1/VERIFICATION.md) for the bounded checks actually performed.

<details>
<summary><strong>Find your way around the repository</strong></summary>

- [`plugin/`](plugin/) — Zotero bootstrap, manifest, licensing, and release notes.
- [`westlaw-us/src/`](westlaw-us/src/) — translator modules and tests.
- [`westlaw-us/m0/csl/`](westlaw-us/m0/csl/) — citation style and rendering harness.
- [`scripts/`](scripts/) — build and verification entry points.
- [`reports/00-SYNTHESIS.md`](reports/00-SYNTHESIS.md) — research background.
- [`tools/`](tools/) — developer inspection helpers.

</details>

## License

Translator and plugin code: **AGPL-3.0-or-later**. Bundled CSL derivative: **CC BY-SA 3.0**, with upstream attribution retained in the style. See [license notices](plugin/LICENSE.txt).

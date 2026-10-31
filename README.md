<div align="center">

# Westlaw → Zotero

**From the case page to your next citation.**

Save Westlaw Advantage US cases to Zotero with structured metadata.<br>
Cite with the bundled Bluebook Law Review style.

By **[Michael Kanter](https://www.linkedin.com/in/michael-kanter) at Harvard Law School**.

[![Release: v1.1](https://img.shields.io/badge/release-v1.1-6D5EF5?style=flat-square)](https://github.com/mkant18/zotero_law/releases/tag/v1.1.0)
[![Declared compatibility: Zotero 7–10](https://img.shields.io/badge/Zotero-7%E2%80%9310-CC2936?style=flat-square)](#compatibility-and-beta-limits)
[![Capture: metadata only](https://img.shields.io/badge/capture-metadata_only-167D7F?style=flat-square)](#privacy)

**[Download v1.1](https://github.com/mkant18/zotero_law/releases/download/v1.1.0/westlaw-advantage-us-1.1.0.xpi)** · **[Installation guide](westlaw-us/INSTALL.md)** · **[Report an issue](https://github.com/mkant18/zotero_law/issues)**

[Features](#features) · [Quick start](#quick-start) · [What’s new](#whats-new) · [Compatibility](#compatibility-and-beta-limits) · [Development](#development)

</div>

---

One Zotero plugin bundles a Westlaw case translator and a local Bluebook CSL style. Save a case through Zotero Connector, review its metadata, and cite from your library.

> **Westlaw case page → Zotero Connector → Zotero library → Citation**

## Features

| Feature | What you get |
| :--- | :--- |
| **Structured case metadata** | Case name, court, decision date, dockets, reporter citations, and identifiable majority author. |
| **Citation forms** | Full, pinpoint, short, and *Id.* forms through **Bluebook Law Review (Westlaw US local)**. |
| **Review flags** | Visible flags when source metadata is missing, conflicting, or uncertain. |
| **Fallback capture** | Useful DOM metadata is preserved when citation-service requests fail. |
| **US case support** | Federal and supported state case formats, including Texas and Westlaw-only citations. |

## Quick start

**You’ll need:** Zotero desktop, Zotero Connector in your browser, and an active Westlaw subscription.

1. **[Download the v1.1 plugin](https://github.com/mkant18/zotero_law/releases/download/v1.1.0/westlaw-advantage-us-1.1.0.xpi)** (`.xpi`).
2. In Zotero, open **Tools → Plugins → gear → Install Plugin From File** and select the downloaded file.
3. Keep Zotero desktop running, refresh a Westlaw US case page, and save it with **Zotero Connector**.
4. Select **Bluebook Law Review (Westlaw US local)** when citing.
5. Review the saved fields, citation output, and any **Westlaw: needs citation review** tag.

> **Beta software:** review saved metadata and citation output before use. If automatic updates fail, download and install the next XPI manually.

The plugin backs up replaced translator/style files. Disabling or removing it restores those backups when the installed copies have not been edited. Existing library items are never migrated. See the [installation and rollback guide](westlaw-us/INSTALL.md).

## What’s new

**v1.1** · Package `1.1.0` · Translator `0.3.6`

- **Credential persistence guard:** every outgoing item string is checked against captured ResourceToken and PageEventIdentifier values, including Extra, creators and tags. A contaminated import stops before an item is created.
- **Patched CI runtime:** Node.js is pinned to supported security release `22.23.4`; action SHA pins and read-only permissions remain.
- **Private samples removed:** six real sample/preference files are no longer tracked. Privacy checks reject every sample path.

Earlier versioned releases remain available. Removing samples from current source does not erase Git history, old tags or external copies. See the [historical privacy assessment](reports/v1.1/HISTORY-PRIVACY.md). Previously saved metadata is not repaired automatically.

[Read the release notes →](plugin/RELEASE-NOTES.md)

## Compatibility and beta limits

**Zotero 7–10 compatibility is declared. This package has not had a fresh native Westlaw → Connector → Zotero → Word acceptance run.**

Earlier native acceptance used Zotero **10.0.6**, Chrome Connector, and a Word save/reopen/refresh journey. That evidence predates this package. Fresh checks cover focused synthetic credential-persistence and privacy regressions, the generated translator, and the actual XPI. **LibreOffice remains unverified.** See the [release verification record](reports/v1.1/VERIFICATION.md).

- Coverage is incomplete; complete Bluebook compliance is not claimed.
- Changes to Westlaw pages may require translator updates.
- Judge names are stored as metadata; the bundled case-citation style does not print them.
- Previously saved items need manual review or re-saving after fixes.

## Privacy

The translator saves **case metadata**, without opinion text, PDFs, snapshots, or attachments. User-triggered requests use the current Westlaw session to retrieve citation metadata and, when needed, a bounded number of linked judge profiles. Captured credential values are blocked at the persistence boundary; diagnostics use bounded codes. This does not audit previously saved items or protect against credential forms that were not captured from the page. Review and redact diagnostic logs before sharing them.

Private page captures, sample originals, upstream clones, and generated release archives stay outside current tracked source. Historical sample exposure remains; see the assessment above.

## Development

Build requirements: **Python 3** and **Node.js**. No package installation is needed for the XPI build. Run from the repository root:

```bash
python scripts/build-plugin.py
```

Build outputs in `dist/`: `westlaw-advantage-us-1.1.0.xpi`, `updates.json`, and `SHA256SUMS.txt`.

<details>
<summary><strong>Offline verification and prerequisites</strong></summary>

The complete offline verification entry point is:

```bash
python scripts/test.py
```

It runs translator, citation/schema, privacy, probe, plugin lifecycle, packaging, and runner checks. Citation tests need the upstream `zotero/` and `utilities/` clones from [clone-upstream.sh](scripts/clone-upstream.sh), Python `lxml`, and the pinned CSL locale described in the [ledger](westlaw-us/LEDGER.md). Tests use synthetic DOM fixtures and local response stubs; they do not establish native browser or word-processor compatibility. GitHub Actions is configured for Windows and Linux. A configured workflow does not establish a passing run.

For this release, the previously recorded restriction against rerunning the full suite remains in force. See [release verification](reports/v1.1/VERIFICATION.md) for the bounded checks actually performed.

</details>

<details>
<summary><strong>Repository guide</strong></summary>

| Path | Contents |
| :--- | :--- |
| [`plugin/`](plugin/) | Zotero bootstrap, manifest, licensing, and release notes. |
| [`westlaw-us/src/`](westlaw-us/src/) | Translator modules and tests. |
| [`westlaw-us/m0/csl/`](westlaw-us/m0/csl/) | Citation style and rendering harness. |
| [`scripts/`](scripts/) | Build and verification entry points. |
| [`reports/00-SYNTHESIS.md`](reports/00-SYNTHESIS.md) | Research background. |
| [`tools/`](tools/) | Developer inspection helpers. |

</details>

## License

Translator and plugin code: **AGPL-3.0-or-later**. Bundled CSL derivative: **CC BY-SA 3.0**, with upstream attribution retained in the style. See [license notices](plugin/LICENSE.txt).

**Required attribution: [Michael Kanter](https://www.linkedin.com/in/michael-kanter) at Harvard Law School.** Preserve this author attribution when redistributing covered original code under the section 7(b) term in [License and attribution](LICENSE.md). For the local CSL modifications, provide attribution under CC BY-SA 3.0 and retain upstream credits. Copying and modification remain permitted under the applicable licenses.

The affiliation identifies the author and does not imply Harvard Law School sponsorship or endorsement.

Independent of Zotero, Thomson Reuters, Westlaw, and The Bluebook.

# Installation and Updates — Westlaw Advantage US Translator

## Quick Start

### Install the plugin beta (recommended)

Download the `.xpi` from https://github.com/mkant18/zotero_law/releases.
In Zotero: Tools → Plugins → gear → Install Plugin From File. Select the XPI.
The plugin installs the translator and citation style, backing up replaced files
in `<datadir>/westlaw-us-plugin-backups/`. Refresh the Westlaw browser tab.
Use Zotero Connector while Zotero desktop runs. Select **Bluebook Law Review
(Westlaw US local)** in citation preferences. See `plugin/RELEASE-NOTES.md` for
compatibility, private-repository update limits, and known metadata defects.

Build the plugin with `python scripts/build-plugin.py`. The manual translator
installation below remains available without the plugin.

### 1. Build the translator

From the workspace root:
```bash
node westlaw-us/tools/build-translator.mjs
```

Output: `westlaw-us/dist/Westlaw Advantage US.js` (single translator file, stable ID `9abca805-707d-4064-958f-e08ac37f0862`, metadata version `0.2.1`).

### 2. Locate Zotero data directory

**Do not hardcode paths.** Open Zotero desktop:
- **Zotero 7:** Settings → Advanced → Files and Folders → **Show Data Directory**
- Copy the path shown. Your translators are in `<datadir>/translators/` and styles in `<datadir>/styles/`.

### 3. Copy the translator

1. Back up any existing `<datadir>/translators/Westlaw Advantage US.js` (see rollback below).
2. Copy `westlaw-us/dist/Westlaw Advantage US.js` to `<datadir>/translators/`.
3. Restart Zotero desktop, or use Tools → Developer → Translator Editor (Scaffold) to refresh the list.

### 4. Install the local CSL

The translator works best with a small local Bluebook CSL variant:

1. Open `westlaw-us/m0/csl/bluebook-law-review-westlaw-us.csl` in your file manager.
2. Double-click to open in Zotero, or: Zotero Settings → Cite → **+** (Install Style) → browse to the file.

Back up any existing `<datadir>/styles/bluebook-law-review-westlaw-us.csl` first.

### 5. Refresh the Chrome connector (if using)

The Chrome connector reloads translators from the desktop app automatically. If the Westlaw tab was already open:
- **Restart Zotero desktop**, or
- Zotero Connector → **Advanced** → **Reset Translators** (unverified: extension UI may vary by version).
- Refresh the Westlaw tab in Chrome.

### 6. Confirm the installed version

Check the translator's build timestamp in its header:

1. Zotero → Tools → Developer → Translator Editor (Scaffold) → search **Westlaw Advantage US (local)**.
2. Look for `"lastUpdated": "YYYY-MM-DD HH:MM:SS"` in the JSON header or code comments.
3. Compare against the dist file's timestamp to confirm the right build was loaded.

## Offline prototype

From the workspace root:

```bash
node westlaw-us/tools/prototype.mjs
```

It renders synthetic golden cases and does not contact Westlaw.

## Updates

1. Edit translator source in `westlaw-us/src/`.
2. Run `node westlaw-us/tools/build-translator.mjs`.
3. Back up `<datadir>/translators/Westlaw Advantage US.js` (keep a dated copy).
4. Copy the new dist file to `<datadir>/translators/`.
5. Restart Zotero or reset translators in the connector; refresh the case page.
6. Save one test case and verify the version in Zotero's developer output or Scaffold.

## Rollback

**Do not reset the Zotero database.** Rollback = restore the previous translator/CSL files:

1. Restore `<datadir>/translators/Westlaw Advantage US.js` from your backup.
2. Restore `<datadir>/styles/bluebook-law-review-westlaw-us.csl` if you updated it.
3. Restart Zotero and refresh the connector.

**Note:** Previously saved items are *not* automatically repaired. If a known parse bug was fixed, re-save affected items into a temporary collection and reconcile manually (see LEDGER.md for known issues).

## Testing in a Disposable Profile

**Recommended before any production use:**

1. Close the main Zotero window.
2. Start Zotero with a new profile: `zotero.exe -P` (Windows) / `zotero -P` (Linux/Mac) → create `westlaw-test`.
3. In that profile: Settings → Advanced → Files and Folders → Data Directory → Custom → e.g., `D:\zotero-test-data` (do not use your main library).
4. Confirm *Settings → Sync* shows no account enabled (unsynced, local only).
5. Install translator and CSL in that profile; save and inspect one case.
6. When done, delete the test profile and data directory.

## Privacy and Logging

- **Metadata only:** the translator captures case metadata (name, lead opinion author when identifiable, court, date, dockets, citations). It does *not* save opinion text, PDFs, snapshots, attachments, or Westlaw session tokens (unverified: connector-level fallback may capture page HTML on some errors; see LEDGER.md).
- **Logs:** Zotero translators use `Zotero.debug()` for diagnostic output. Debug logs may temporarily contain URLs. Before sharing a debug log, inspect and redact Westlaw session URLs or authorization parameters.
- **No telemetry or background requests:** the translator makes explicit, user-triggered citation-service requests only during save (unverified: M0 spike pending).

## Known Limitations

- (unverified) Chrome connector reloads translators from Zotero desktop; immediate refresh of an already-open tab is not guaranteed.
- (unverified) The connector's fallback-snapshot behavior on parse errors cannot be fully controlled by the translator alone; test in your intended use case.
- Previously saved cases with parse errors or incomplete data require manual review and re-saving; automatic library migration is not supported.

## See Also

- Architecture and versioning policy: `reports/20-ASTRA-ARCHITECTURE.md` §§10, 12–13.
- M0 spike (live connector test): `westlaw-us/m0/MANUAL-SPIKE.md`.
- CSL changes: `westlaw-us/m0/csl/README.md`.
- Translator module contract: `westlaw-us/src/CONTRACT.md`.

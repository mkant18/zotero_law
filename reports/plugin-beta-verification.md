# Westlaw Advantage US plugin beta verification

2026-10-30. Version 0.1.0beta1. Release branch: release/westlaw-plugin-0.1.0beta1.
Existing GitHub main has independent work; this release does not replace it.

The XPI bundles bootstrap.js, manifest.json, license notices, the current 0.3.2
translator, and local Bluebook CSL. No captures, credentials, library databases,
upstream source clones, or runtime reports are included in the XPI.

SHA256: b1ab44c4869059293c1dfbedd7fa4c7d120c0ed974dea56d7fea78aa04c57d1d

Validation:

- 845 tests pass, zero failed/skipped/todo, including four plugin lifecycle tests.
- Staged-source private-data checker: 43 files, zero failures or warnings.
- Installed the actual XPI through Zotero 10.0.6 AddonManager.
- Waited for bootstrap registration to finish; resource bytes match the bundle.
- Native disable restores previous files; enable restores bundled files and
  registers the translator and style. The plugin remains installed and active.
- Installed XPI SHA256 equals the release artifact SHA256 above.
- Mock lifecycle checks additionally cover application restart, subsequent user
  edits, and rollback after a failed style write.

Native installation initially exposed a jar-resource loading failure; switched
to Zotero.File.getResource for local XPI resources. Native acceptance also waits
for startup completion before changing add-on state, avoiding overlapping reloads.

Local full evidence: plugin-beta-tests.txt, plugin-lifecycle-tests.txt,
plugin-privacy-check.txt, plugin-native-install.json in this directory.
Acceptance script: scripts/plugin-acceptance.js. Local evidence files are not
part of the distributed XPI.

This packaging run verifies installation and lifecycle, not a new browser save or
Word/LibreOffice integration. Prior live-save evidence is retained separately in
reports/native-audit-2026-10-30. Known metadata defects are disclosed in
plugin/RELEASE-NOTES.md. Earlier Zotero versions are not individually tested.
The repository remains private; authenticated downloads and manual beta updates
may be necessary.

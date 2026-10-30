# Beta v.1 verification

Package: `0.1.1beta1`. Merge commit: `5e19164`. All local and fetched origin branch tips are ancestors of main, including the offline prototype and release branch. Backup refs preserve pre-release main/release tips. Ko-fi omitted at the owner's request.

## Checks actually performed

- Merged parser/DOM/map/profile/reconcile checks: 600 tests; 599 passed in the last combined run. The remaining assertion expected an unrelated California reporter to establish an unclassified Guam court. The test was aligned with the existing required court-evidence policy, then that exact test passed. Evidence: `merge-tests.txt`, `unknown-court-test.txt`.
- Metadata/required-field checks: 30 passed. Includes disposable compiled detectWeb/doWeb, Texas full-date storage, real Zotero item-to-CSL conversion and citeproc rendering. Evidence: `metadata-tests.txt`.
- Selected built-translator journeys: 41 passed, including six citation journeys and service fallback scenarios, explicit majority-author handling, outgoing validation, DOM/page review flags, and informational header fallback. Evidence: `merged-journey-tests.txt`.
- Three isolated real build CLI tests passed: exact resource bytes, matching checksum/update metadata, repeated-build byte identity. Evidence: `packaging-tests.txt`.
- Actual `python scripts/build-plugin.py` succeeded after the merge. The resulting XPI contains exactly five expected resources, each matching the current source/generated file. ZIP integrity, manifest version, source-derived translator build identifier, SHA-256 and update download/hash metadata independently read back. Evidence: `artifact-verification.json`.
- Staged private-data checks passed for merge and release files. Historical research files retain their original provenance. Whitespace corrected before final release commit.

## Merge policy decisions

Current required-metadata rejection supersedes older permissive validation tests. Invalid case names abort before item completion. Explicit majority bylines, attached evidence and verified profile responses take precedence over historical signature scanning. Header authority wins ordinary court conflicts; Texas district completion and New York reporter-specific omission rules remain. Conflicting docket sets are retained, deduplicated and flagged. Parser publisher-parenthetical handling, full-date commas and main-branch date/status parsing coexist.

## Limits

No full suite, equivalent aggregate, manual CI dispatch, native plugin install/reload, authenticated Westlaw request, library edit, or Word/LibreOffice run. The subset checks above address merge and packaging risks; they are not a fresh complete-suite or native acceptance result. Push commits carry `[skip ci]` to preserve the recorded full-suite restriction. Earlier native acceptance is historical. Existing versioned releases/tags are preserved; the moving beta update-feed assets are refreshed to this package.

SHA-256: `2bd664c6487dfb542728edfbab1ed2a0a65c0c516b1717f9331a1276f9fadd48`.

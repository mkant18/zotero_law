# M1-C DOM Adapter — Progress

## Completed
- Fixed fakedom.mjs: `isElement` now requires `_children` (not just `tagName`), removed `_textContent` getter/setter infinite recursion, removed unused `textContent` setter, added `(node.children || [])` guard in `selectAll` BFS, added comma-list selector support in `selectAll`
- Fixed dom.test.mjs: removed all 3 hand-made `makeScript()` functions, replaced with `el("script", {}, text)` everywhere; fixed test fixtures to use `li` as direct children of `#co_docHeaderCitation` (matching brief's `#co_docHeaderCitation > li` selector); fixed syntax errors from earlier edits
- Fixed dom.js: added ambiguous GUID detection (duplicate DocumentGuid values), added identity-mismatch check in `wlDomInspectCaseReadiness`, fixed docket normalization (`No.` not `Nos.`), added unparsed items to citations array in `wlDomReadFacts`
- Fixed F1 docket parsing: rewrote .co_docketBlock handling to properly split "Nos." lists on /,\s*|;\s*|\s+and\s+/, handle "No." single entries, support multiple .co_docketBlock elements, and dedupe by wlTextCompareKey
- Fixed F2 secrets: added PageEventIdentifier/ResourceToken collection from script config, validate with token regex, return secrets object only when both valid and unambiguous, added missing-config/ambiguous-config review reasons, fixed wlDomInspectCaseReadiness capability to report "service" only when guid+contentType Cases+relatedInfoHost+secrets all present
- Fixed F3 placeholders: replaced SECRET-PCID/SECRET-RTID with TEST-PE-0001/TEST-RT-0001 in dom.test.mjs, added 6 new tests for secrets behavior and docket parsing
- Test pass status is not proven by tool output; verify after completing the fix
- Privacy checker: fail=0

## W7 — plan §12 selector-fallback coverage + field snapshot
- dom.test.mjs: new block "wlDomReadFacts — plan §12 selector fallbacks" (courtline/filedate/cite0/cite1, chapter0/chapter1, un-numbered chapter, misleading ids, id-less semantic li, court-after-date, page-count li, conflicting headers, sticky duplicate headers, subset header, no-header .co_courtBlock/.co_cites fallback, .co_docketBlock, headerName suffix). One `todo`: no review reason when the header list is absent.
- dom.js fixes exposed by the new tests: (1) `#co_docHeaderCitation` is now read per list (duplicate IDs) and two lists whose citation sets disagree (neither a subset of the other) add `conflicting-header`; (2) a court-like li (`Court|Circuit|Tribunal`) is accepted as the court line even after the date li.
- item-fields.test.mjs + fixtures/item-fields-expected.json: hand-built full-field snapshot for G1, G2, G4, G5, G7 with per-key added/removed/changed diff output. golden-inputs.mjs GUIDs for G2/G5/G7 are malformed (reported via todo tests; snapshot substitutes valid placeholders).

## W9 — DOM review reasons
- `dom.js` `wlDomReadFacts`: (1) `header-fallback` review reason when no `#co_docHeaderCitation` exists and court/citations came from `.co_courtBlock`/`.co_cites`; (2) duplicate headers naming different court lines (compared per list, case-insensitive) now add `conflicting-header` (previously only citations/dates); identical sticky copies and a truncated copy with no court line do not flag.
- Reasons `wlDomReadFacts` can emit: `conflicting-header`, `header-fallback`. (`missing-config`/`ambiguous-config` come from `wlDomReadPageContext`, not DomFacts, and are not forwarded by reconcile.)
- dom.test.mjs: the fallback todo is now a passing test; +5 tests (court conflicts, sticky/truncated no-flag, no-fallback-content no-flag). 0 todo.

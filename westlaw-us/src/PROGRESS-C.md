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

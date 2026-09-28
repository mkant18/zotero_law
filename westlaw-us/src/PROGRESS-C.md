# M1-C DOM Adapter — Progress

## Completed
- Fixed fakedom.mjs: `isElement` now requires `_children` (not just `tagName`), removed `_textContent` getter/setter infinite recursion, removed unused `textContent` setter, added `(node.children || [])` guard in `selectAll` BFS, added comma-list selector support in `selectAll`
- Fixed dom.test.mjs: removed all 3 hand-made `makeScript()` functions, replaced with `el("script", {}, text)` everywhere; fixed test fixtures to use `li` as direct children of `#co_docHeaderCitation` (matching brief's `#co_docHeaderCitation > li` selector); fixed syntax errors from earlier edits
- Fixed dom.js: added ambiguous GUID detection (duplicate DocumentGuid values), added identity-mismatch check in `wlDomInspectCaseReadiness`, fixed docket normalization (`No.` not `Nos.`), added unparsed items to citations array in `wlDomReadFacts`
- Test pass status is not proven by tool output; verify after completing the fix

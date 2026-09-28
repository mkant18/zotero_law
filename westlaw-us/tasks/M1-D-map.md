# M1-D — CaseRecord → Zotero item mapping + outgoing validation (offline, pure)

Read `westlaw-us/tasks/COMMON.md` and `westlaw-us/src/CONTRACT.md` first. Plan §5 (entire field contract, Extra bridge, WL-only mapping, rejected mappings), §3 (failure flags / tags), §8 (no attachments), §12 logging.

## Allowed files
`westlaw-us/src/map.js`, `westlaw-us/src/test/map.test.mjs`, `westlaw-us/src/PROGRESS-D.md`.

## Deliverables — `map.js` (prefix `wlMap`)
1. `wlMapToZoteroFields(rec)` → plain object (NOT a Zotero.Item; the translator shell will copy it onto `new Zotero.Item("case")`):
   `{ itemType:"case", caseName, court, dateDecided, docketNumber, reporter, reporterVolume, firstPage, history, shortTitle, url, extra, tags:[{tag}], creators:[], attachments:[], notes:[] }`
   - `caseName` = rec.caseName; `court` = rec.court ("" allowed); `dateDecided` = rec.date.
   - `docketNumber`: join rec.dockets. If one docket: ensure exactly one leading `No. ` (don't double it). If several: `Nos. a, b` with individual `No.` prefixes stripped. Strip trailing period. Normalize en/em dash inside docket numbers to "-" ONLY when the docket is otherwise ASCII digits/letters (e.g. `No. 98–40679.` → `No. 98-40679`).
   - `reporter/reporterVolume/firstPage` from rec.primary (for WL primary: `WL`, year, id).
   - `history` = rec.history (no leading ", "). `shortTitle` = rec.shortName or omit key if null.
   - `url` = `https://1.next.westlaw.com/Document/<guid>/View/FullText.html` only if guid matches `^I[0-9a-f]{32}$`; else omit and add review reason `bad-guid`.
   - `extra` lines, in this order, only when applicable: `Medium: Westlaw` (only if rec.wlPrimary); `Genre: <parentheticalSuffix>` (only if non-empty); `Westlaw parallel citation: <raw>` for each reporter alternate; `Westlaw alternate WL citation: <raw>` for each WL alternate when not wlPrimary; `Westlaw unparsed citation: <raw>` for kind unparsed; `Westlaw court (raw): <rawCourt>`; `Westlaw profile: <profile>`; `Westlaw status: <status>`; `Westlaw review: <reason>` one per review reason; `Westlaw translator: <version>` (version passed as 2nd arg `opts.version`, default `0.0.0-dev`).
   - tags: `Westlaw: needs citation review` iff reviewReasons non-empty or status is not `validated-profile`.
2. `wlMapValidateOutgoing(fields)` → `{ ok, problems:[] }`: fails if any string value contains a zero-width watermark char, `<` followed by a letter (HTML), a substring matching `ResourceToken|PageEventIdentifier|x-cobalt|Bearer `, any string > 2000 chars, non-empty creators/attachments/notes, a `firstPage` containing `*` or `-` range or comma, `reporter`/`caseName`/`court` containing `(`…year`)` patterns, `shortTitle` equal to `Id.` or containing a reporter citation pattern `\d+ [A-Z].* \d+`, or a `url` with `?` or `#`. Return all problems (codes), never throw.
3. `wlMapApply(fields, item)` helper: copies fields onto an object `item` (sets scalar fields, pushes tags; ignores empty strings except `court` which may be ""), for use with a real `Zotero.Item`. Test with a plain object.

## Tests
Build CaseRecords for: G1 Sanchez (reported, alternates include WL 1999 WL 652310, docket `No. 98–40679.` with en dash + trailing period), G2 Philip Morris with history, G4 Miele (parallel `2 A.D.3d 799` + WL alternate), G5 Rogers texas (`parentheticalSuffix: "writ denied"`, court `Tex. App.—Beaumont`), G7 WL-only synthetic (wlPrimary, primary WL 2024/1234567, court `D. Kan.`, date `2024-03-01`, docket `No. 24-123`), multi-docket (`["No. 019125/97", "2001-07484"]` → `Nos. 019125/97, 2001-07484`), metadata-only DOM record (no shortName, status metadata-only, reason `service-unavailable`) → tag present.
Assert full expected field objects (deepStrictEqual) for G1, G5, G7, and that: G1/G4 extra has no `Medium:` line; G7 has it; G5 has `Genre: writ denied`; no `References:` line anywhere; creators/attachments/notes empty; validator passes all of these and fails on: watermark char, `Id.` shortTitle, `firstPage:"486-490"`, url with `?`, `extra` containing `ResourceToken`, HTML in history.

## Acceptance
`node --test "westlaw-us/src/test/*.test.mjs"` passes (map tests); CONTRACT module conventions hold.

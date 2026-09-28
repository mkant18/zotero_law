# Westlaw Offline Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the offline Westlaw US → Zotero → Bluebook pipeline a prototype you can run with one Node command, with valid fixture identities and an honest header-fallback flag.

**Architecture:** Keep the existing concatenated translator modules. Fix synthetic document GUIDs so the mapper keeps a canonical URL. When the opinion header list is missing, record `header-fallback` and still allow a service-validated citation. Add `westlaw-us/tools/prototype.mjs`, which runs the five recorded golden classes through reconcile → map → the local CSL and exits nonzero if a rendered citation drifts.

**Tech Stack:** Node 22 built-ins, `node:test`, existing `westlaw-us/src/*.js` (ES2020, no imports), citeproc via `westlaw-us/m0/csl/harness/render.mjs`. No new npm dependencies. No live Westlaw, Chrome, or Zotero profile.

**Spec:** `reports/20-ASTRA-ARCHITECTURE.md` §§3–7 and §11 golden examples; `westlaw-us/golden/GOLDEN-TARGETS.md`; `westlaw-us/src/CONTRACT.md`.

## Global Constraints

- Work only in this worktree: `M:/Coding_Projects/_zotero-research/.worktrees/westlaw-prototype`. Do not edit the main checkout at `M:/Coding_Projects/_zotero-research`.
- Translator modules stay one plain script each: top-level `function` and `var` only, prefixed public names, CommonJS `module.exports` footer. ES2020. No `import` / `class` / Node APIs inside `westlaw-us/src/*.js`.
- Do not read or quote `westlaw-samples/*.html`, `westlaw-samples/*.txt`, or `westlaw-us/.private/`.
- No network, no new dependencies, no contact with Westlaw, Chrome, or the user's Zotero data directory.
- Do not weaken expected citation strings. Placeholder GUIDs match `/^I[0-9a-f]{32}$/`.
- One `case` item. No attachments, creators, notes, tokens, or opinion text in outputs.
- Strip watermark code points `[\u200B-\u200F\u2060-\u2064\uFEFF]` from outgoing strings.
- `header-fallback` means the header list was absent and a fallback selector supplied court or citations. It is recorded, and by itself it does not demote `validated-profile`. Every other review reason still demotes.

## Review Focus

- A GUID that is not `I` plus 32 lowercase hex digits must still omit `url` and add `bad-guid` (mapper tests already cover a deliberately bad GUID; do not relax that).
- A present `#co_docHeaderCitation` must not gain `header-fallback`, including when `.co_courtBlock` also exists.
- Reported-case renders (G1, G2, G4, G5) must not contain `WL` or `No. `. The WL-only G7 first cite must contain the docket, `2024 WL 1234567`, and `Mar. 1, 2024`, and must not contain the word `Westlaw`.
- Prototype stdout must not contain `ResourceToken`, `TEST-RT`, or `http://`.
- `header-fallback` together with any other reason still yields `unverified-profile` or `metadata-only`, never `validated-profile`.

---

### Task 1: Valid placeholder GUIDs

**Files:**
- Modify: `westlaw-us/src/test/fixtures/golden-inputs.mjs`
- Modify: `westlaw-us/src/test/item-fields.test.mjs`
- Test: `westlaw-us/src/test/item-fields.test.mjs`

**Interfaces:**
- Consumes: `wlMapToZoteroFields` URL rule — guid must match `/^I[0-9a-f]{32}$/` or the url is omitted and `bad-guid` is added.
- Produces: these exact fixture identities (context.guid, context.url, and `makeDom({ guid })` all use the same value):
  - G2 `I22222222222222222222222222222222`
  - G3 `I33333333333333333333333333333333`
  - G5 `I55555555555555555555555555555555`
  - G7 `I77777777777777777777777777777777`
  - G1 and G4 stay as they are (already valid).

- [ ] **Step 1: Write the failing test**

In `item-fields.test.mjs`, delete `VALID_GUID`, `withValidGuid`, and the comment that says golden-inputs GUIDs are malformed. Call `assertFieldsMatch('G2', G2)`, `assertFieldsMatch('G5', G5)`, and `assertFieldsMatch('G7', G7)` with the raw fixtures. In the GUID describe block, drop the `bad ? { todo: ... } : {}` option so every case is a real test:

```js
it(`${label} input GUID is I + 32 hex`, () => {
  assert.match(input.context.guid, GUID_RE);
  assert.match(input.dom.guid, GUID_RE);
  assert.equal(input.context.url, `https://1.next.westlaw.com/Document/${input.context.guid}/View/FullText.html`);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "westlaw-us/src/test/item-fields.test.mjs"`

Expected: FAIL. G2, G3, G5, and G7 GUIDs do not match `/^I[0-9a-f]{32}$/`. Snapshot tests for G2/G5/G7 fail on `url` / `bad-guid` until the fixtures change.

- [ ] **Step 3: Replace the four malformed GUIDs**

In `golden-inputs.mjs`, replace each malformed guid and the matching URL path segment:

- G2 `I2historyGuid1234567890abcdef1234` → `I22222222222222222222222222222222`
- G3 `IbrownGuid1234567890abcdef123456` → `I33333333333333333333333333333333`
- G5 `IRogersTxGoldenGuid1234567890abcdef` → `I55555555555555555555555555555555`
- G7 `IwlOnlyGuid1234567890abcdef123456` → `I77777777777777777777777777777777`

Change both `context.guid` and the `guid` passed to `makeDom`. `context.url` must be `https://1.next.westlaw.com/Document/<that guid>/View/FullText.html`. Do not change citation text, dates, or courts. Do not edit `item-fields-expected.json` (it already uses these four GUIDs).

- [ ] **Step 4: Run tests**

Run:

```text
node --test "westlaw-us/src/test/item-fields.test.mjs"
node --test "westlaw-us/src/test/golden-pipeline.test.mjs"
node --test "westlaw-us/src/test/map.test.mjs"
```

Expected: all pass, and the item-fields file reports zero todo tests.

- [ ] **Step 5: Commit**

```text
git add westlaw-us/src/test/fixtures/golden-inputs.mjs westlaw-us/src/test/item-fields.test.mjs
git commit -m "Fix golden fixture GUIDs so mapped items keep a canonical URL."
```

### Task 2: Header fallback is visible and non-demoting

**Files:**
- Modify: `westlaw-us/src/dom.js`
- Modify: `westlaw-us/src/reconcile.js`
- Modify: `westlaw-us/src/test/dom.test.mjs`
- Modify: `westlaw-us/src/test/reconcile.test.mjs`
- Test: those two test files

**Interfaces:**
- Consumes: `wlDomReadFacts(doc)` returns `reviewReasons: string[]`. `wlRecReconcile(input)` reads `input.dom.reviewReasons`.
- Produces:
  - Reason code `header-fallback` on `DomFacts` when `querySelectorAll("#co_docHeaderCitation")` is empty and either `.co_courtBlock` yielded a court or `.co_cites` yielded at least one citation.
  - `wlRecAddDomReasons(reviewReasons, dom)` copies each string reason matching `/^[a-z0-9:-]+$/` once. Called on the metadata-only early return and on the service-ok path, before status is chosen.
  - `wlRecHasDemotingReason(reviewReasons)` is false when every reason is `header-fallback` (or the list is empty). Status uses that instead of `reviewReasons.length === 0`.

- [ ] **Step 1: Write the failing tests**

In `dom.test.mjs`, remove the `{ todo: "..." }` option from the test named `with no header list, marks the result as fallback-sourced via a review reason` so it is a real test. Add this test beside it:

```js
it("does not mark header-fallback when the header list exists", function() {
  var list = el("div", { id: "co_docHeaderCitation" },
    el("li", {}, "Placeholder Court of Appeals"), el("li", {}, "100 F.3d 200"));
  var courtBlock = el("div", { class: "co_courtBlock" }, "Other Court");
  var result = wlDomReadFacts(fallbackDoc([list, courtBlock]));
  assert.equal(result.reviewReasons.indexOf("header-fallback"), -1);
});

it("flags conflicting-header when two header lists name different courts", function() {
  var first = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "United States Court of Appeals, Fifth Circuit."));
  var second = el("div", { id: "co_docHeaderCitation" }, el("li", {}, "United States District Court, District of Kansas."));
  var result = wlDomReadFacts(fallbackDoc([first, second]));
  assert.equal(result.reviewReasons.indexOf("conflicting-header") !== -1, true);
});
```

In `reconcile.test.mjs`, add a describe block `wlRecReconcile - DOM review reasons` that builds a minimal ok service input (copy the shape used by the existing "clean envelopes" test in that file) and asserts:

1. `dom.reviewReasons: ["conflicting-header"]` → record includes `conflicting-header` and `status !== "validated-profile"`.
2. `dom.reviewReasons: ["header-fallback"]` on an otherwise clean table-confidence record → reason is present and `status === "validated-profile"`.
3. `dom.reviewReasons: ["header-fallback", "conflicting-header"]` → status is not `validated-profile`.
4. `dom.reviewReasons: ["header-fallback", "header-fallback", "NOT A CODE", 3]` → record reasons are exactly the one string `header-fallback`.
5. Service-A category `auth` plus `dom.reviewReasons: ["header-fallback"]` → metadata-only record still includes `header-fallback`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "westlaw-us/src/test/dom.test.mjs" "westlaw-us/src/test/reconcile.test.mjs"`

Expected: FAIL on the new header-fallback and DOM-reason assertions.

- [ ] **Step 3: Implement**

In `wlDomReadFacts`, after citation-set comparison and after the `.co_courtBlock` / `.co_cites` fallbacks:

```js
var usedHeaderFallback = false;
```

Set it true only inside those fallbacks when `headerLists.length === 0` and the fallback actually contributed a court string or at least one citation. Then:

```js
if (usedHeaderFallback && reviewReasons.indexOf("header-fallback") === -1) {
  reviewReasons.push("header-fallback");
}
```

Track a per-list court string (first unparsed line that the existing court rule would accept, lowercased). If two lists both have a court string and they differ, push `conflicting-header` once. Do not change date or citation conflict behavior.

In `reconcile.js`, add `wlRecAddDomReasons` and `wlRecNonDemotingReasons = ["header-fallback"]` and `wlRecHasDemotingReason` as specified. Call `wlRecAddDomReasons` before the metadata-only return and again at the start of the service-ok path. Replace the `reviewReasons.length === 0` status check with `!wlRecHasDemotingReason(reviewReasons)`.

- [ ] **Step 4: Run tests**

Run:

```text
node --test "westlaw-us/src/test/dom.test.mjs" "westlaw-us/src/test/reconcile.test.mjs" "westlaw-us/src/test/golden-pipeline.test.mjs"
```

Expected: pass, zero todo in the dom file.

- [ ] **Step 5: Commit**

```text
git add westlaw-us/src/dom.js westlaw-us/src/reconcile.js westlaw-us/src/test/dom.test.mjs westlaw-us/src/test/reconcile.test.mjs
git commit -m "Flag header-list fallback without demoting a validated citation."
```

### Task 3: Runnable offline prototype

**Files:**
- Create: `westlaw-us/tools/prototype.mjs`
- Create: `westlaw-us/tools/test/prototype.test.mjs`
- Modify: `westlaw-us/INSTALL.md` (add a short "Offline prototype" section after Quick Start)
- Test: `westlaw-us/tools/test/prototype.test.mjs`

**Interfaces:**
- Consumes: `loadModules` from `westlaw-us/src/test/helpers/load.mjs`; `G1, G2, G4, G5, G7` from `westlaw-us/src/test/fixtures/golden-inputs.mjs`; `render` from `westlaw-us/m0/csl/harness/render.mjs`; `wlRecReconcile`, `wlMapToZoteroFields`.
- Produces: `node westlaw-us/tools/prototype.mjs` prints one block per id and exits 0. Exit 1 if any rendered line fails the expected body. Comparison strips one trailing `.` and maps U+2019 to `'`.

- [ ] **Step 1: Write the failing test**

`westlaw-us/tools/test/prototype.test.mjs` spawns the script with `node:child_process` `spawnSync` and `node:path` resolved from `import.meta.url` (do not hardcode `M:`). Assert exit code 0, stdout includes each of these substrings, and stdout does not include `ResourceToken` or `Westlaw review`:

- `G1 Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)`
- `G1-pin Sanchez v. Liggett & Myers, Inc., 187 F.3d 486, 490 (5th Cir. 1999)`
- `G1-short Sanchez, 187 F.3d at 490`
- `G2 United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)`
- `G4 Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)`
- `G5 Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)`
- `G7 Example v. Sample, No. 24-123, 2024 WL 1234567 (D. Kan. Mar. 1, 2024)`
- `G7-pin Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)`
- `G7-id Id. at *5`
- `G1 status=validated-profile`

Also assert the G1, G2, G4, and G5 cite lines in stdout do not contain ` WL ` and do not contain `No. `.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "westlaw-us/tools/test/prototype.test.mjs"`

Expected: FAIL because the script does not exist (nonzero spawn status).

- [ ] **Step 3: Implement the script**

`prototype.mjs` loads the modules `text.js`, `reporters.js`, `cite-parse.js`, `profile.js`, `service.js`, `dom.js`, `map.js`, `reconcile.js`. For each golden input, reconcile, map with `{ version: "0.1.0-prototype" }`, and render with `render`. Print exactly these labels (citation text may have one trailing period, which the checker strips):

| Label | Cluster |
|---|---|
| G1 | `[{id:'G1'}]` |
| G1-pin | `[{id:'G1', locator:'490'}]` |
| G1-short | first render G4, then G1 with locator 490; print the second text |
| G2 | `[{id:'G2'}]` |
| G4 | `[{id:'G4'}]` |
| G5 | `[{id:'G5'}]` |
| G7 | `[{id:'G7'}]` |
| G7-pin | `[{id:'G7', locator:'*4'}]` |
| G7-id | first cluster locator `*4`, second cluster locator `*5`; print the second text |

Each line: `<label> <text>` plus a status line `<id> status=<rec.status>` for G1, G2, G4, G5, G7. Give each item `uri` equal to its id so citeproc can tell them apart. If a rendered body does not match the expected string under the apostrophe/period normalization, print `MISMATCH <label>` to stderr and exit 1 after all rows. Exit 0 when every row matches.

Expected bodies (no trailing period required in the constant; accept one trailing period in output):

```js
var EXPECTED = {
  "G1": "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
  "G1-pin": "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486, 490 (5th Cir. 1999)",
  "G1-short": "Sanchez, 187 F.3d at 490",
  "G2": "United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)",
  "G4": "Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)",
  "G5": "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.\u2014Beaumont 1988, writ denied), disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)",
  "G7": "Example v. Sample, No. 24-123, 2024 WL 1234567 (D. Kan. Mar. 1, 2024)",
  "G7-pin": "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)",
  "G7-id": "Id. at *5"
};
```

The G5 test substring does not include the history tail; the script still checks the full expected body. Add an "Offline prototype" section to `INSTALL.md` with the command `node westlaw-us/tools/prototype.mjs` and one sentence: it renders synthetic golden cases and does not contact Westlaw.

- [ ] **Step 4: Run tests**

Run:

```text
node --test "westlaw-us/tools/test/prototype.test.mjs"
node westlaw-us/tools/prototype.mjs
node --test "westlaw-us/src/test/*.test.mjs"
```

Expected: prototype test passes, the script exits 0, and the src suite passes.

- [ ] **Step 5: Commit**

```text
git add westlaw-us/tools/prototype.mjs westlaw-us/tools/test/prototype.test.mjs westlaw-us/INSTALL.md
git commit -m "Add an offline prototype that renders the golden Bluebook cases."
```

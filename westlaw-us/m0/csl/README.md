# M0-A CSL Bridge Spike — Bluebook Law Review (Westlaw US local)

## Change list vs upstream (`styles/bluebook-law-review.csl` @ 2e93558)

1. **Identity**: `<id>`, `<title>`, and self-`<link>` changed to `http://local.invalid/styles/bluebook-law-review-westlaw-us`; `<title>` set to `Bluebook Law Review (Westlaw US local)`.
2. **Locale**: Month short terms pinned to Bluebook T12 (Jan. Feb. Mar. Apr. May June July Aug. Sept. Oct. Nov. Dec.) so output does not depend on the host locale version.
3. **legal_case source macro**:
   - Removed `text-case="title"` on case title (names are pre-normalized; must print verbatim).
   - Added WL-primary branch (`<if variable="medium">`) that prints `number` (docket), uses full date (`Mon. D, YYYY`), and prints `at locator` only when a locator is present.
   - Non-medium branch: locator printed after `page-first` with comma (no `at`).
   - `genre` appended after year inside parentheses with `, `.
   - `references` (Zotero `history`) appended after closing parenthesis with `, ` on first cites only.
4. **legal_case subsequent**:
   - Regular: `short-title, volume reporter at locator` or `short-title, volume reporter page-first` (no dangling `at`).
   - WL-primary: `short-title, volume WL id, at locator` or `short-title, volume WL id`.
   - No genre, history, court, or date in short forms.
5. **ibid / ibid-with-locator**: unchanged (`Id.` / `Id. at <locator>`).
6. **`annote`**: not implemented in this spike.
7. **`<updated>`**: set to `2026-09-28T00:00:00+00:00`.

## Extra contract as implemented

`Zotero.Utilities.Item.extraToCSL` (called by `itemToCSLJSON`) converts `Key: value` lines in the Zotero Extra field into CSL variables via citeproc-js's field-hack parsing of the `note` variable.

Implemented Extra keys:
- `Medium: <value>` → CSL `medium` variable (triggers WL-primary citation format)
- `Genre: <value>` → CSL `genre` variable (appended after year in parentheses)

Non-Extra keys (diagnostic only, do not create CSL variables):
- `Westlaw alternate WL citation: <value>`
- `Westlaw court (raw): <value>`
- `Westlaw jurisdiction: <value>`
- `Westlaw parallel citation: <value>`
- `Westlaw translator: <value>`

These diagnostic lines remain in the `note` CSL variable as plain text and do not affect citation rendering.

## How to run tests

```bash
python westlaw-us/m0/csl/harness/validate.py westlaw-us/m0/csl/bluebook-law-review-westlaw-us.csl
node --test "westlaw-us/m0/csl/test/*.test.mjs"
```

Run from the workspace root (`C:/Users/micha/Documents/ChatGPT/Zotero_Law`). Python with `lxml` is required. The rendering harness validates the style before loading citeproc; malformed XML, official schema errors, and macro errors stop rendering. Set `CSL_PYTHON` to a Python executable when `python` on PATH is unavailable. The workspace's system Python has lxml 6.1.2; Codex's bundled Python has lxml 6.1.1.

## Validation source and repair

The two missing `</if>` tags and misplaced `</group>` tags in the general first/subsequent citation branches were repaired. Month overrides now use `month-01` through `month-12`, as defined by the [official CSL specification](https://docs.citationstyles.org/en/stable/specification.html#terms).

`schema/` vendors the [official CSL schema](https://github.com/citation-style-language/schema/tree/506040022f6c37846343edd36658b23e85b5b8ff), tag `v1.0.2`, commit `506040022f6c37846343edd36658b23e85b5b8ff`. `csl.rng` is generated from the official compact RELAX NG source using rnc2rng 2.7.0. `provenance.json` records source URLs and SHA-256 hashes. The official `csl.sch` supplies the additional undefined/duplicate macro checks; these are required alongside RELAX NG according to the [schema repository documentation](https://github.com/citation-style-language/schema#csl-schema).

Validation runs locally without contacting a remote validator. XML entity expansion, DTD loading, and network resolution are disabled; styles declaring a DOCTYPE are rejected. Runtime validation requires only Python and lxml. To regenerate `csl.rng`, install rnc2rng 2.7.0 into an isolated build directory, expose that directory through `PYTHONPATH`, and run:

```python
import rnc2rng
from pathlib import Path
source = rnc2rng.load('westlaw-us/m0/csl/schema/csl.rnc')
Path('westlaw-us/m0/csl/schema/csl.rng').write_text(rnc2rng.dumps(source), encoding='utf-8')
```

October 11, 2026: strict XML, official RELAX NG, and official Schematron passed; all 36 offline tests passed. Regression checks cover the old malformed XML, invalid month identifiers, missing/duplicate macros, DOCTYPE rejection, all twelve month terms, and structured author metadata not altering ordinary case citations. Existing Extra/CSL bridge and golden strings remain unchanged.

## CSL-JSON key findings

- `medium` is present only when Extra contains `Medium: <value>`.
- `genre` is present only when Extra contains `Genre: <value>`.
- `references` is present only when the Zotero `history` field is populated.
- `number` is present when `docketNumber` is set (regardless of medium).
- `issued` contains full date parts `[year, month, day]` even when only the year is printed (non-medium cases print only the year).
- Diagnostic Extra lines (`Westlaw …`) do not create CSL variables; they remain in the `note` variable.
- `container-title` is set from the `reporter` field for case items.
- `page-first` is set from the `firstPage` field.

## H2 observations

G2i's `history` field contains `<i>aff'd in part, vacated in part</i>` (HTML typography). citeproc-js passes the `<i>` tags through from the history field into the HTML rendering, so the HTML contains `<i>` tags (`hasIInHtml === true`). The plain text (obtained by stripping HTML tags) equals E17's text without the `<i>` tags.

## Limitations

- Offline citeproc 1.4.61 from the clone (`zotero/chrome/content/zotero/xpcom/citeproc.js`), NOT the installed Zotero 7.0.32.
- CSL schema validation: **passed** using pinned CSL 1.0.2 RELAX NG plus official macro Schematron. This validates CSL structure, not Bluebook legal correctness or installed Zotero behavior.
- The `annote` feature is not implemented in this spike.
- The `vm.runInThisContext` approach loads citeproc-js and utilities_item.js into the global V8 context; this is a workaround for the lack of a proper module system in citeproc-js 1.4.61.

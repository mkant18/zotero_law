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
node --test "westlaw-us/m0/csl/test/*.test.mjs"
```

Run from the workspace root (`M:/Coding_Projects/_zotero-research`).

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
- CSL schema validation: **not run** (no validator is installed).
- The `annote` feature is not implemented in this spike.
- The `vm.runInThisContext` approach loads citeproc-js and utilities_item.js into the global V8 context; this is a workaround for the lack of a proper module system in citeproc-js 1.4.61.

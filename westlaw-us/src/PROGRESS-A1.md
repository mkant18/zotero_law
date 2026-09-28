# M1-A1 Progress

## text.js (wlText prefix)
- wlTextClean: null/undefined → "", watermark removal (U+200B-U+200F, U+2060-U+2064, U+FEFF), NBSP (U+00A0, U+202F) → space, whitespace collapse, trim, NFC. Preserves em dash, en dash, apostrophes, accents, &.
- wlTextNormalizeDashes: U+2010-U+2015 and U+2212 → "-" for comparison keys only.
- wlTextCompareKey: clean + normalize dashes + U+2019→' + lowercase + remove spaces around periods.
- wlTextParseUSDate: full month names + abbreviations (incl. "Sept.") with optional periods, validates day ranges (no Feb 30), year-only → "YYYY", else null.

## reporters.js (wlRep prefix)
- wlRepRegistry: 51 entries covering all required reporters with aliases (unspaced Westlaw forms, Fed.Appx., etc.) and seriesIds from reports/10 §2.
- wlRepLookup: whitespace-insensitive around periods via normalized key map.
- wlRepCanonical: returns Bluebook-spaced abbreviation or null.
- wlRepFindCitations: longest-alias-first reporter matching with flexible whitespace, volume/page lookup with boundary checks, separate WL citation scan (YYYY WL NNNNNNN), results sorted by index.

## Tests
- text.test.mjs: 41 tests, all passing
- reporters.test.mjs: 25 tests, all passing

## Commands run
- node --test "westlaw-us/src/test/text.test.mjs" → 41/41 pass
- node --test "westlaw-us/src/test/reporters.test.mjs" → 25/25 pass

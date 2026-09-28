# M1-A1 — text cleaning + reporter registry (offline, pure)

Read `westlaw-us/tasks/COMMON.md` and `westlaw-us/src/CONTRACT.md` first. Plan §4 (parsing algorithm steps 2–3, reporter registry), §12.

## Allowed files
`westlaw-us/src/text.js`, `westlaw-us/src/reporters.js`, `westlaw-us/src/test/text.test.mjs`, `westlaw-us/src/test/reporters.test.mjs`, `westlaw-us/src/PROGRESS-A1.md`.

## Read-only inputs
`westlaw-us/m0/probe/Westlaw US M0 Probe.js` (has a `cleanText` you may adapt), `reports/10-WESTLAW-LIVE-FINDINGS.md` §2 (star-page series IDs).

## Deliverables
1. `text.js` (prefix `wlText`):
   - `wlTextClean(s)`: returns "" for null/undefined; removes `[\u200B-\u200F\u2060-\u2064\uFEFF]`; NBSP (U+00A0, U+202F) → space; collapse runs of whitespace to one space; trim; `normalize("NFC")`. Preserves U+2014 em dash, U+2013 en dash, apostrophes (both ' and ’), accents, `&`.
   - `wlTextNormalizeDashes(s)`: returns a copy with U+2010–U+2015 and U+2212 → "-" (for COMPARISON keys only, never for stored output).
   - `wlTextCompareKey(s)`: clean + normalize dashes + U+2019→' + lowercase + remove spaces around periods (so `F.Supp.2d` and `F. Supp. 2d` compare equal). For comparisons only.
   - `wlTextParseUSDate(s)`: "August 25, 1999" / "Aug. 25, 1999" / "Sept. 5, 2024" / "Dec. 29, 2003" / "Oct. 06, 1988" → "1999-08-25" etc.; year-only "1988" → "1988"; anything else → null. Validate day ranges (no Feb 30).
2. `reporters.js` (prefix `wlRep`): a data table `wlRepRegistry` (array of entries `{ abbr, aliases:[...], family, kind:"reporter"|"wl"|"neutral", seriesIds:[...], impliesCourt: null|"U.S." }`) covering at least: `U.S.`, `S. Ct.`, `L. Ed.`, `L. Ed. 2d`, `F.`, `F.2d`, `F.3d`, `F.4th`, `F. Supp.`, `F. Supp. 2d`, `F. Supp. 3d`, `F. App'x`, `U.S. App. D.C.`, `A.`, `A.2d`, `A.3d`, `P.`, `P.2d`, `P.3d`, `N.E.`, `N.E.2d`, `N.E.3d`, `N.W.`, `N.W.2d`, `S.E.`, `S.E.2d`, `S.W.`, `S.W.2d`, `S.W.3d`, `So.`, `So. 2d`, `So. 3d`, `N.Y.S.`, `N.Y.S.2d`, `N.Y.S.3d`, `A.D.`, `A.D.2d`, `A.D.3d`, `N.Y.`, `N.Y.2d`, `N.Y.3d`, `Cal.`, `Cal. 2d`, `Cal. 3d`, `Cal. 4th`, `Cal. 5th`, `Cal. Rptr.`, `Cal. Rptr. 2d`, `Cal. Rptr. 3d`, `B.R.`, `WL` (kind wl). Aliases must include Westlaw's unspaced forms (`F.Supp.2d`, `S.W.2d` is already unspaced, `N.Y.S.2d`, `L.Ed.2d`, `S.Ct.`, `F.App'x`/`Fed.Appx.`). Series IDs from reports/10 §2 (506=F.3d, 4637=F. Supp. 2d, 713=S.W.2d, 7049=A.D.3d, 4603=N.Y.S.2d, 781=U.S. App. D.C.).
   - `wlRepLookup(text)`: returns the registry entry for an exact abbreviation or alias (whitespace-insensitive around periods), else null.
   - `wlRepCanonical(text)`: canonical Bluebook spacing (`F.Supp.2d` → `F. Supp. 2d`), or null if unknown.
   - `wlRepFindCitations(text)`: scan a string and return every `Citation` (CONTRACT shape) `<volume> <reporter> <page>` whose reporter is in the registry, plus WL citations `<year> WL <digits>`, in order of appearance, each with `index` (char offset) and `length`. Longest-alias-first matching so `F. Supp. 2d` is not read as `F.`. Page may be digits or a hyphenated range start; do not include pin cites (`, 490`). Unknown reporters are NOT returned (the parser will treat them as unparsed).

## Tests (node:test)
- text: watermark removal (all ranges incl. U+2060–U+2064, U+FEFF), NBSP, em dash preserved, NFC (e.g. "e" + U+0301 → "é"), compare keys equal for `F.Supp.2d` vs `F. Supp. 2d` and `Tex. App.—Beaumont` vs `Tex. App.-Beaumont`, all date forms above + invalid ones.
- reporters: lookup/canonical for every alias pair; `wlRepFindCitations` on: `"Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)"` → one F.3d 187/486; `"Miele v. Am. Tobacco Co., 2 A.D.3d 799, 770 N.Y.S.2d 386 (2003)"` → two in order; `"…, 770 N.Y.S.2d 386, 2003 N.Y. Slip Op. 19972, 2003 WL 23099090 (…)"` → N.Y.S.2d and WL (Slip Op. is not in the registry; must not crash); `"449 F.Supp.2d 1"` → canonical `F. Supp. 2d`; `"566 F.3d 1095, 1105"` → page 1095 not 1105; history string `"aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)"` → finds it (the parser, not the registry, decides it is history).

## Acceptance
Both test files pass with `node --test "westlaw-us/src/test/*.test.mjs"`; module conventions from CONTRACT.md hold (no import/export/require in src/*.js except the final module.exports guard).

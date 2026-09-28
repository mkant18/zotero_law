# Progress: M0-C Private Data Checker

<step>1 → pass/5</step>
<step>2 → pass/5</step>
<step>3 → pass/5</step>
<step>4 → pass/5</step>
<step>5 → pass/5</step>

## STEP 1 (R3 literal rule)
Added `isLiteralSecret()` helper: value must match `/^[A-Za-z0-9._~+\/=-]{6,}$/` and not be a placeholder. Applied to all R3 captured values (JSON DQ, JS SQ, JS unquoted, cookie headers, JSON cookie/set-cookie). Bearer tokens require `/^[A-Za-z0-9._~+\/=-]{16,}$/`.

## STEP 2 (R4 scope)
R4 large-text heuristic (`<script` + `co_document`) now restricted to files with .html/.htm/.mhtml/.txt extensions or content starting with `<!DOCTYPE`/`<html` (case-insensitive after BOM/whitespace). Never applies to .md/.js/.mjs/.json.

## STEP 3 (--paths honours ignores)
`--paths` mode now uses `git ls-files --cached --others --exclude-standard -- <paths>` instead of manual `readdirSync` walk, so ignored files (e.g. `.cache/`) are skipped.

## STEP 4 tests
Added 6 new tests: regex-pattern PASS, template-literal PASS, `<literal>` PASS, 24-char token FAIL, .md with script+co_document PASS, --paths skips ignored file. Updated Bearer test to use 20+ char token.

## STEP 5
Ran checker on real repo: `summary: files=62 fail=0 warn=6` (6 legacy WARNs ok).

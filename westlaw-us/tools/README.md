# westlaw-us/tools — Private Data Checker

## Usage

```bash
node westlaw-us/tools/check-private-data.mjs [--root <dir>] [--staged] [--paths <p>...]
```

### Flags

| Flag | Description |
|---|---|
| `--root <dir>` | Git repo root to scan (default: `git rev-parse --show-toplevel` of cwd) |
| `--staged` | Only scan files staged in the index (via `git diff --cached`) |
| `--paths <p>...` | Only scan the given files/dirs (recursive), regardless of git state |

### Exit Codes

| Code | Meaning |
|---|---|
| 0 | No FAILs (WARNs allowed) |
| 1 | At least one FAIL |
| 2 | Usage or internal error |

### Output Format

- `FAIL <rule> <path>[:<line>] <short reason>`
- `WARN <rule> <path> <short reason>`
- Final line: `summary: files=<n> fail=<n> warn=<n>`

For secrets, only `value-length=<n>` is printed — never the secret value itself. For zero-width characters, the code point is printed (e.g., `U+200B`).

## Rules

### R1 — Path-based exclusions

FAIL for any candidate under:
- `westlaw-us/.private/`
- `westlaw-us/.cache/`
- Any `/out/` directory under `westlaw-us/`
- `*.har` and `*.har.json` files
- `westlaw-samples/*.html`, `westlaw-samples/*.txt`, and any other `westlaw-samples/**` path

WARN (legacy, pre-ignore-rule) for the six tracked files:
- `westlaw-samples/citations-settings.json`
- `westlaw-samples/cite-matrix/5th-cir.json`
- `westlaw-samples/cite-matrix/dc-cir.json`
- `westlaw-samples/cite-matrix/ddc.json`
- `westlaw-samples/cite-matrix/ny-appdiv.json`
- `westlaw-samples/cite-matrix/tex-app.json`

### R2 — Zero-width watermark characters

FAIL for U+200B–U+200F, U+2060–U+2064, or U+FEFF (including UTF-8 BOM at byte 0) in any text file. Reports the line number and code point. Binary files (NUL byte in first 8 KB) are skipped.

### R3 — Secret-like values

FAIL for:
- JSON `"ResourceToken"`, `"PageEventIdentifier"`, `"x-cobalt-rtid"`, `"x-cobalt-pcid"` with a non-placeholder string literal value
- JS `'x-cobalt-rtid': PLACEHOLDER` and `x-cobalt-pcid: "PLACEHOLDER"` forms
- HTTP `Cookie:` / `Set-Cookie:` header lines with a non-empty value
- JSON `"cookie"` / `"set-cookie"` keys with a non-empty string value
- HTTP `Authorization` header with a Bearer token value → FAIL

Placeholder values matching `^(PLACEHOLDER|TEST|FAKE|REDACTED|EXAMPLE)[A-Za-z0-9._-]*$` (case-insensitive) or empty strings are allowed. Variable/expression assignments (not string literals) are also allowed.

### R4 — Raw capture heuristics

FAIL for:
- Any `*.html`/`*.htm` under `westlaw-us/` unless it is under `westlaw-us/fixtures/synthetic/` AND its first 200 bytes contain `<!-- SYNTHETIC FIXTURE -->`
- Any text file > 20 000 bytes containing both `<script` and `co_document` (case-sensitive)

### R5 — Size limit

FAIL for any candidate under `westlaw-us/` exceeding 1 000 000 bytes.

## Limitations

This checker is a heuristic tool, not a DLP guarantee. It does not inspect Git history (only working-tree and index content). It may produce false positives or miss subtle data exfiltration patterns. The `westlaw-samples/` legacy WARN files are tracked before the ignore rule and will remain flagged as WARN until they are untracked or removed.

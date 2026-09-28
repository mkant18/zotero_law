# M0-C — Private-data checker (offline)

Read `westlaw-us/tasks/COMMON.md` first; its rules override anything here.
Plan: `reports/20-ASTRA-ARCHITECTURE.md` §10 (fixture strategy, `check-private-data`), §13 (private fixtures risk).
Current ignore rules: `.gitignore` (read-only for you).

## Objective
A dependency-free Node 22 script that fails if private Westlaw material would be committed or is sitting in
commit-eligible (tracked or untracked-not-ignored) files. It must never print the secret or private content it finds.

## Allowed files
`westlaw-us/tools/check-private-data.mjs`, `westlaw-us/tools/test/check-private-data.test.mjs`, `westlaw-us/tools/README.md`

## CLI
`node westlaw-us/tools/check-private-data.mjs [--root <dir>] [--staged] [--paths <p>...]`
- Default root: `git rev-parse --show-toplevel` of cwd. Use `child_process.execFileSync("git", [...])` read-only commands only (`ls-files`, `diff --cached --name-only`, `rev-parse`, `check-ignore`). Never run a mutating git command.
- Default candidate set: `git ls-files -z --cached --others --exclude-standard` (tracked + untracked-not-ignored), excluding deleted-from-worktree paths. `--staged`: only `git diff --cached --name-only -z` (read staged content via `git show :<path>`). `--paths`: only the given files/dirs (recursive), regardless of git state.
- Exit 0 = no FAIL (WARNs allowed); exit 1 = at least one FAIL; exit 2 = usage/internal error.
- Output lines: `FAIL <rule> <path>[:<line>] <short reason>` / `WARN ...` / final `summary: files=<n> fail=<n> warn=<n>`. NEVER print matched values or surrounding text; for secrets print only `value-length=<n>`; for zero-width print the code point (`U+2061`).

## Rules
- R1 paths:
  - FAIL: any candidate under `westlaw-us/.private/`, `westlaw-us/.cache/`, any `/out/` directory under `westlaw-us/`, `*.har`, `*.har.json`, `westlaw-samples/*.html`, `westlaw-samples/*.txt`, and any other `westlaw-samples/**` path EXCEPT the six legacy tracked files below.
  - WARN (legacy, already tracked before the ignore rule): `westlaw-samples/citations-settings.json`, `westlaw-samples/cite-matrix/{5th-cir,dc-cir,ddc,ny-appdiv,tex-app}.json`.
- R2 zero-width watermark characters U+200B–U+200F, U+2060–U+2064, U+FEFF (literal characters, not `\u` escape text) in any text file → FAIL with line + code point. (A UTF-8 BOM at byte 0 of a file counts too.)
- R3 secret-like values (text files):
  - JSON-ish `"ResourceToken"`/`"PageEventIdentifier"`/`"x-cobalt-rtid"`/`"x-cobalt-pcid"` followed by `:` and a quoted string literal value, or JS object literal `'x-cobalt-rtid': '<literal>'` / `x-cobalt-pcid: "<literal>"` forms → FAIL unless the value matches `^(PLACEHOLDER|TEST|FAKE|REDACTED|EXAMPLE)[A-Za-z0-9._-]*$` (case-insensitive) or is empty. Code that assigns a variable/expression (not a string literal) is fine.
  - HTTP header lines `^\s*(set-)?cookie\s*:` (case-insensitive) and JSON keys `"cookie"` / `"set-cookie"` with a non-empty string value → FAIL.
  - `Authorization: Bearer <literal>` → FAIL.
- R4 raw capture heuristics:
  - Any `*.html`/`*.htm` under `westlaw-us/` → FAIL unless it is under `westlaw-us/fixtures/synthetic/` AND its first 200 bytes contain `<!-- SYNTHETIC FIXTURE -->`.
  - Any text file containing BOTH `<script` and `co_document` (case-sensitive) that is > 20 000 bytes → FAIL (likely a saved Westlaw page).
- R5 size: any candidate under `westlaw-us/` > 1 000 000 bytes → FAIL.
Binary detection: treat files with a NUL byte in the first 8 KB as binary (skip R2–R4, still apply R1/R5).
The checker's own source and test must not trip it (build test fixtures at runtime, e.g. with `String.fromCodePoint`, and compose trigger strings from pieces).

## Tests: `westlaw-us/tools/test/check-private-data.test.mjs` (node:test)
Create a temporary git repo under `os.tmpdir()` (`fs.mkdtempSync`), `git init` it (temp dir only — never the workspace), write synthetic files, `git add` in the TEMP repo only, run the checker with `--root <tmp>` via `execFileSync(process.execPath, [...])`, assert exit codes and output. Cover: each R1 FAIL path + the six legacy WARN paths; R2 each code-point range + BOM; R2 does not fire on `\u2060` escape text; R3 literal secret FAIL, placeholder PASS, variable-assignment PASS, cookie header FAIL, bearer FAIL, and the secret value never appears in stdout/stderr; R4 synthetic-marked html PASS vs unmarked FAIL, large script+co_document FAIL; R5 size FAIL; `--staged` only sees staged files; `--paths` mode; ignored files (per the temp repo's `.gitignore`) are not scanned in default mode; exit code 2 on unknown flag. Clean up temp dirs.
Also add one smoke test that runs the checker against the real workspace root in `--paths westlaw-us/tools` mode and expects exit 0.

## Deliverable: `westlaw-us/tools/README.md` — usage, rules, exit codes, limitations (heuristic, not a DLP guarantee; does not inspect Git history).

## Test command
`node --test westlaw-us/tools/test/` from workspace root — all pass.

## Stop conditions
- Needing to run a mutating git command in the workspace, add dependencies, or read private samples.

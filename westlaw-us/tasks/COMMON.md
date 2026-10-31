# Common rules for every Ling worker / reviewer (read first)

Run from the repository root.
Plan: `reports/20-ASTRA-ARCHITECTURE.md` (read the sections named in your brief).

HARD RULES
1. Write ONLY the files/directories your brief lists as "Allowed files". Every other path is read-only.
   Never edit upstream clones (`zotero/`, `zotero-connectors/`, `translate/`, `utilities/`, `translators/`, `styles/`),
   `reports/`, `.gitignore`, `westlaw-us/LEDGER.md`, `westlaw-us/golden/`, `westlaw-us/tasks/`, or another worker's directory.
2. Do NOT open, read, grep, copy, or quote `westlaw-samples/*.html`, `westlaw-samples/*.txt`, or anything under
   `westlaw-us/.private/`. They contain private opinion text / account identifiers. All real sample JSON remains private; use synthetic fixtures in `westlaw-us/src/test/fixtures/`.
3. No network access (no fetch/curl/npm install/git fetch). No new npm dependencies. Node 22 built-ins only.
4. No `git add`, `git commit`, `git stash`, `git reset`, `git checkout`, `git clean`, or any history/state mutation.
5. Never contact Westlaw, Chrome, the installed Zotero app, or the user's Zotero data directory (`~/Zotero`, AppData).
6. Do not spawn subagents. Do not ask the user; if blocked, stop and report (see stop conditions).
7. No raw HTML, opinion text, tokens, cookies, or account identifiers in any file you write or in your report.
   Use obviously fake placeholder values such as `TEST-RT-0001` in tests.
8. Do not weaken or edit expected/golden strings to make tests pass. If an expectation cannot be met, report it.
9. Keep output concise. Do not repeat long file contents in your final report.

FINAL REPORT FORMAT (your last message)
- Files created/changed (paths).
- Exact commands run and their final result (pass/fail counts).
- Acceptance criteria: each one marked met / not met / partially, with evidence.
- Deviations from the brief and why.
- Known limitations and open questions.

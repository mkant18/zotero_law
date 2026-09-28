# zotero_law

Research and planning for a personal Zotero web translator that saves **Westlaw Advantage (US)** case
documents as Zotero `case` items that cite cleanly in **Bluebook**.

Status: architecture plan in `reports/20-ASTRA-ARCHITECTURE.md`; M0 offline spikes complete; M1 offline translator modules built (`westlaw-us/`) with Sonnet/Haiku builders via pi subagents (3 waves: R4 round-trip fix, envelope echo checks & DOM reason forwarding, court-table expansion & NY trial courts). See `westlaw-us/INSTALL.md`, `westlaw-us/HANDOFF.md`, and `westlaw-us/LEDGER.md`.

## Layout
- `reports/00-SYNTHESIS.md` — consolidated findings: Zotero, the Chrome connector (MV3), translators, `case` → CSL → Bluebook.
- `reports/10-WESTLAW-LIVE-FINDINGS.md` — live Westlaw page anatomy + the Copy-with-Reference citation service and its full option map.
- `reports/A–F*.md` — individual scout and cross-audit reports (DeepSeek V4 Flash / Ling 3.0 Flash).
- `westlaw-samples/cite-matrix/*.json` — citation-service test matrix results; `citations-settings.json` — Westlaw citation option catalogue.
- `tools/` — Chrome DevTools Protocol helpers used for read-only inspection of logged-in Westlaw tabs.
- `ASTRA-PROMPT.md` — prompt for the architecture session.
- `scripts/clone-upstream.sh` — re-creates the upstream source clones (zotero, zotero-connectors, translate, utilities, translators, styles) the reports cite.

Not committed (see `.gitignore`): upstream clones, saved Westlaw HTML (full opinion text, account identifiers), captured Westlaw JavaScript.

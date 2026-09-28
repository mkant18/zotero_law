# M0 live spike — manual procedure (requires explicit user authorization)

Status: **NOT RUN.** Nothing here has been executed. Every step touches the user's browser, Westlaw session, or a Zotero
installation and therefore needs the user's go-ahead (see "Authorizations requested" in the final report / LEDGER §4).

Goal (plan §11 M0): a written go/no-go on (1) whether Westlaw accepts `ZU.request` relayed through the Chrome MV3
connector service worker, (2) which proposed option recipes return usable envelopes, (3) what happens on handled vs fatal
failures (webpage/snapshot fallback), and (4) whether the Extra→CSL bridge renders in the *installed* Zotero.

## Known facts before the spike (from read-only source inspection)
- [V] In MV3 the translator's `ZU.request` is relayed from the page to the extension service worker (`zotero-connectors/src/common/http.js` `_requestFetch`), which calls `fetch` with `credentials: 'include'` and the translator's headers.
- [V] The connector itself adds a `Referer` equal to the full page URL for same-origin targets (`common/inject/http.js` `getDefaultReferrer`, default `strict-origin-when-cross-origin`) and installs it via a declarativeNetRequest header rule. The Westlaw page URL can contain query parameters; this goes only to the same Westlaw origin (as the page's own XHRs do) but should be noted.
- [U] Whether Westlaw accepts a request carrying `Origin: chrome-extension://<id>` (or none) is the core unknown.
- [V] A thrown translator error can lead the connector to `saveAsWebpage({snapshot:true})` (plan §1). The probe never throws except when `forceFatal` is deliberately set.

## Environment (recommended: fully disposable)
1. **Zotero:** a separate Zotero profile + separate data directory, sync disabled, not the real `~/Zotero` library.
   Zotero 7: start with `zotero.exe -P` (Profile Manager) → create profile `westlaw-m0` → in that profile set
   *Settings → Advanced → Files and Folders → Data Directory Location → Custom* to e.g. `D:\zotero-m0-data` → restart.
   Confirm *Settings → Sync* shows no account. (Only one Zotero instance can run at a time: close the main one first.)
2. **Chrome:** a separate Chrome profile is ideal but requires signing in to Westlaw there. If you prefer your normal
   profile, that is your call; the probe only runs when you click Save on a Westlaw case tab.
3. Install the probe: copy `westlaw-us/m0/probe/Westlaw US M0 Probe.js` into `<m0 data dir>\translators\`. In Zotero:
   *Settings → Advanced → Files and Folders → Reset translators* is NOT needed; instead restart Zotero or open
   Tools → Developer → Translator Editor (Scaffold) once so the translator list is refreshed. Refresh the Westlaw tab.
4. Enable connector debug output only for the spike: Zotero *Help → Debug Output Logging → Enable*. Stop and **do not submit** the log afterwards; it may contain URLs.

## Steps (each one user-triggered; ≈2 requests per save; no crawling)
| # | Action | Record (redacted facts only) |
|---|---|---|
| L1 | Open an already-authorized case, e.g. Sanchez (5th Cir.). Confirm the toolbar icon is the *case* icon and the tooltip/label says `Westlaw US (M0 probe)` | icon type, translator label |
| L2 | Open `chrome://extensions` → Zotero Connector → *service worker* → DevTools → Network. Click Save in the Westlaw tab | For each `RelatedInfo/v2/citestyles` request: status, response content-type, whether `Origin` header was sent and its **scheme only** (`chrome-extension` / absent / https), whether a `Cookie` header was present (yes/no — do not copy it), redirects (yes/no). Do **not** export a HAR. |
| L3 | In the new Zotero item, copy the `Extra` lines starting `Westlaw M0` | category/status/styles/forms per request; long-form texts |
| L4 | Repeat L1–L3 on Rogers (Tex. App.) | Texas A recipe (`texas`+`standard`, westReporterOnly, history=true): does the `texas` long form show `(Tex. App.—Beaumont 1988, writ denied)`? What does the history tail look like? |
| L5 | Repeat on Miele (NY App. Div.) and Philip Morris (D.D.C.) | NY: `770 N.Y.S.2d 386 (App. Div. 2003)`? D.D.C.: history tail |
| L6 | Handled-failure check: in the Westlaw tab, log out (or wait for session expiry) in a second tab, then click Save on the still-open case tab | Expect category `auth` (or similar), an item still saved, **no** snapshot/attachment in the item |
| L7 | Desktop-offline check: quit Zotero desktop, click Save | What the connector does (cloud save prompt? snapshot?). Cancel if it offers to save to zotero.org |
| L8 | Fatal-fallback check (disposable profile only): set `forceFatal: true` in the installed probe copy, restart/refresh, click Save | Does the connector fall back to *Web Page* with a snapshot? Is there any UI to cancel? Then delete that item + attachment and restore `forceFatal: false` |
| L9 | CSL bridge in installed Zotero: install `westlaw-us/m0/csl/bluebook-law-review-westlaw-us.csl` via *Settings → Cite → +*; create the synthetic items from `westlaw-us/m0/csl/fixtures/items.json` manually (or via the orchestrator-provided import file if prepared); use *Create Bibliography from Item → Citations* and a Word/LibreOffice or Quick Copy test | Rendered first/short/Id. strings vs `westlaw-us/m0/csl/fixtures/expected.json` |
| L10 | Cleanup | Remove the probe `.js` from the translators dir; keep or delete the disposable profile; disable debug logging |

## Go / no-go criteria
- **GO (service path):** L2 shows 2xx JSON with `responses` for A and B on at least the four sample cases, with no manual header spoofing; L6 yields a flagged metadata-only case without snapshot.
- **NO-GO (service path):** consistent 401/403/HTML/404 from the connector while the same request works in the page → stop service-dependent v1; user chooses between DOM-only capture with manual correction or a separately authorized alternative. No bypass.
- **Snapshot policy:** if L8 shows an unavoidable snapshot fallback and the user requires a strict never-snapshot guarantee → architecture blocked under the single-translator constraint (plan §8).
- **CSL:** L9 matches the offline expectations, or differences are recorded and triaged.

## What to send back to the orchestrator
Only the redacted facts in the "Record" column (plain text). Never paste cookies, tokens, `x-cobalt-*` values, HAR files,
page HTML, or opinion text.

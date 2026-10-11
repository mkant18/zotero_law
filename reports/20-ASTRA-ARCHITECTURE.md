# Architecture plan: Westlaw Advantage (US) → Zotero cases → Bluebook

**Role:** Astra, architecture advisor. **Status:** PLAN ONLY; no translator or CSL implementation, installation, live requests, commits, or pushes performed.

**Workspace:** `M:/Coding_Projects/_zotero-research/`. Nothing in `coach-teacher` is part of this work.

## Executive recommendation

Build a **single local web translator with a DOM-first capture / citation-service enrichment pipeline**, accompanied by a **small, separately installed local derivative of Bluebook Law Review**. Keep ordinary case metadata in native Zotero fields; use a documented, minimal Extra-to-CSL contract for features those fields cannot express.

- Save **one case item per opened opinion**, not one item per reporter.
- Use the DOM for identity, exact decision date, dockets, and corroborating citations. Use Westlaw's citation service for abbreviated names, reporter selection, court parentheticals, short names, and history.
- Default to `standard` + `westReporterOnly`; use a narrowly scoped Texas appellate exception. Request a separate data-rich form for alternate citations and docket/date reconciliation.
- Preserve structured metadata and citation alternatives, **not opinion text, snapshots, PDFs, account identifiers, or request tokens**.
- Test the actual Chrome Connector request path **before implementing the parser**. Same-origin DevTools requests are not proof that the connector will work.
- Treat **all federal courts and every state as the coverage objective, not a claim established by five opinions**. Unknown forms must remain usable as flagged case records, without inventing a clean citation. Maintain an explicit coverage ledger.

**Fundamental limit:** a translator can capture and normalize metadata, but neither Westlaw's “standard” format nor a CSL style independently guarantees every Bluebook judgment, required subsequent history, local court rule, parallel citation, or context-sensitive short form. Broad automatic coverage requires fixtures and legal-format review. A promise of universal, unattended correctness would not be supported by the evidence.

## 1. Evidence and confidence boundaries

Labels used below:

- **[V] Verified:** directly inspected local source or recorded matrix.
- **[R] Reported:** established in the supplied synthesis/live report, not independently exercised in this planning session.
- **[P] Proposed:** architectural decision, not implemented or tested.
- **[U] Unverified:** requires a spike, a new sample, or user confirmation.

All recommendations, interfaces, test commands, and expected implementation behavior are **[P]** unless stated otherwise.

### Sources consulted

1. [00-SYNTHESIS.md](00-SYNTHESIS.md), especially §§1, 3–4, 6.
2. [10-WESTLAW-LIVE-FINDINGS.md](10-WESTLAW-LIVE-FINDINGS.md), especially §§2, 5–6.
3. [A-connector-architecture.md](A-connector-architecture.md), [E-citation-output-and-dev-workflow.md](E-citation-output-and-dev-workflow.md), and [C2-westlaw-deepdive-ling.md](C2-westlaw-deepdive-ling.md), with source checks where material.
4. Local recorded `westlaw-samples/cite-matrix/*.json`; `tools/matrix.js` for how those recordings were produced.
5. `styles/bluebook-law-review.csl`, `styles/bluebook-inline.csl`; `utilities/utilities_item.js` (`extraToCSL` and item conversion); `zotero-connectors/src/common/http.js` (`_requestFetch`); `zotero-connectors/src/common/inject/pageSaving.js` (`translateAndSave`, `_saveAsWebpage`).

### Corrections and cautions that affect the plan

- **[V] Matrix coverage is narrower than “every combination.”** `tools/matrix.js` requests all 39 styles with `CAFormat`, `LegalBriefs`, `history=false`; the four parallel rules × two substyles matrix covers only `standard` and `alwd`, with history off. Its history-on test uses `CAFormat`. Therefore `standard/westReporterOnly/history=true`, and especially `texas/westReporterOnly/history=true`, are **combinations to verify**, not fully proven production recipes.
- **[R] Live report §5–6 supersedes its earlier §2 statement that only two parallel rules work.** Use the four-value option map, but still check response echoes and errors.
- **[V] Stock Law Review ignores dockets and history, emits only the year for cases, and has no special WL branch.** Stock Inline is not a drop-in solution: its citation branch `position="subsequent" type="legal_case" match="any"` also selects the short branch for a first legal-case citation. Its long-form macro would print dockets and full dates indiscriminately. Older scout conclusions about universal sufficiency of stock CSL are not adopted.
- **[V] A thrown translation error can invoke `saveAsWebpage({ snapshot: true })`.** `attachments: []` protects a successfully translated item, not all connector fallback paths. The inspected desktop-save path does not consult the connector's `automaticSnapshots` preference before this explicit snapshot call. Do not promise that merely disabling that preference solves fallback privacy.
- **[V] Extra preprocessing recognizes `medium`, `genre`, `annote`, `references`, and `jurisdiction`.** Their precise end-to-end behavior with the user's installed Zotero/citeproc versions remains a spike acceptance test, not something to assume from a helper alone.
- **[U] No live SCOTUS, state-high-court, or genuinely WL-only fixture is supplied.** Their examples below are target tests, not observed Westlaw results.

## 2. Architecture overview

```text
User opens ONE Westlaw opinion and clicks Zotero Save
                         |
           detectWeb: local inspection only
       host + case type + coherent opinion identity
                         |
          freeze document identity / DOM facts
        allowlisted text extraction + watermark scrub
                         |
        +----------------+-------------------+
        |                                    |
  Native DOM facts                    Ephemeral request config
  date / dockets / cites              GUID / service routing / tokens
        |                                    |
        |                           bounded citation-service GETs
        |                           via Connector MV3 HTTP relay
        |                                    |
        |                         style-specific response adapters
        |                           long / named-short / inventory
        +----------------+-------------------+
                         |
               normalized CaseRecord
       field provenance + conflicts + review reasons
                         |
          reporter/court/date policy + validation
                         |
          one Zotero.Item("case"), no attachments
          native fields + small Extra contract
                         |
          Zotero desktop → citeproc → LOCAL CSL
             first / short / Id. / locator output

Service/config/parser failure → metadata-only case + visible review flag
                              (not a thrown service exception)

Unrelated content → not handled; no search crawl or bulk saving
```

No connector fork, browser extension, background daemon, remote parser, LLM, credential store, or external abbreviation service is required. Development fixtures and a local test runner are separate from the deployed `.js` file.

### Internal CaseRecord, not a new storage format

Maintain a transient record containing:

- document identity and canonical URL;
- display name, abbreviated name, short name;
- raw court line, jurisdiction/court classification, citation-specific court abbreviation;
- exact decision date and date precision;
- ordered docket array;
- primary citation plus typed alternatives: reporter / WL / neutral / specialist / unparsed;
- parenthetical suffix, subsequent-history tail, and sanitized reference form;
- per-field source, validation status, and review reasons.

No credentials belong in this record. Keep request context separate, in memory only, and release it after the save. Persist only the explicitly mapped bibliographic fields and small diagnostic labels.

## 3. Decision 1 — Hybrid sources and failure policy

### Recommendation and order

**Choose hybrid, with field-specific precedence rather than “service overwrites DOM.”**

1. **DOM capture is mandatory and happens first.** Establish that this is a coherent current case and extract enough to save a safe, useful item if enrichment fails.
2. **Citation service is primary for citation semantics:** abbreviated name, selected citation, court parenthetical, named short form, and history.
3. **DOM remains primary for exact decision date and displayed dockets**, corroborated by the data-rich service form. Service data may fill a missing date/docket but cannot silently replace a conflicting DOM value.
4. **DOM citations and court line are corroboration and fallback.** Use a small, versioned court/reporter policy registry when verified. Unrecognized long court names are retained as raw metadata, not guessed abbreviations.
5. **On conflict, downgrade the item to needs-review.** Keep the sanitized raw bibliographic fact in Extra, do not silently concatenate different decisions or select an arbitrary year.

### Request budget and policy

No service calls in `detectWeb`. On explicit save, normally make **two sequential GETs**, at most three for an explicit, fixture-backed compatibility fallback; no automatic retry storm.

**A — citation form**

- Endpoint on the current allowed origin: `/RelatedInfo/v2/citestyles/{DocumentGuid}`.
- Default: `styleIDs=standard`, `parallelCiteRule=westReporterOnly`, `subStyle=LegalBriefs`, `history=true`.
- Texas intermediate appellate cases: request `texas` and `standard` together, same options; choose the Texas response only after validation.
- SCOTUS with a known U.S. Reports cite: prefer U.S. Reports from the DOM; request `officialReporterOnly` if necessary to align the service's parenthetical and short form with that primary citation. **[U] This selection requires a real sample.**
- `underline=false`, `bold=false`, `italicize=false`; no `pubPages` or `paragraphNumber` during save. Save-time scroll position must never become the case's first page.

**B — bibliographic inventory**

- Request `styleIDs=standard` and `styleIDs=westlaw` together with `allReporter`, `LegalBriefs`, `history=false`.
- Use standard for the main-case citation inventory; use westlaw only for additional dockets, WL citation, and exact-date corroboration. Its court/name format is **not** the Bluebook authority/name source.
- **[U] The combined B request is proposed; the records demonstrate its component behaviors but not this exact whole combination.**

Use the required `X-Requested-With` and `x-cobalt-*` headers from current page configuration. Validate GUID syntax and config value types/lengths. Request only the allowed Westlaw path on `https://1.next.westlaw.com`; do not fetch an arbitrary host found in HTML. The RelatedInfo host is a validated routing-header value, not permission to send credentials to another origin. Never set or spoof `Origin` or cookies manually.

Timeout proposal: 8 seconds per request, total save enrichment budget about 20 seconds. A failed A need not trigger B when the cause is authentication, blocking, or rate limiting. If A succeeds and B fails, save the primary citation normally with a specific “alternate-citation inventory incomplete” warning.

### Failure behavior

| Failure | Action |
|---|---|
| Missing tokens/config | No request; save DOM-derived case with service-unavailable flag |
| Network/origin failure, timeout | No automatic retry; DOM fallback, report category only |
| 401/403, login HTML even with 200 | Stop enrichment; user refreshes/re-authenticates manually |
| 404 HTML / bad routing | Treat as configuration/service failure, not “case missing” |
| 400 / unsupported option | Flag incompatibility; use a third request only for a specifically tested fallback recipe, not random option probing |
| 429 | Stop; respect Retry-After for any later session-local attempt; do not schedule background retries |
| 5xx, malformed or oversized JSON | Stop enrichment and preserve DOM item |
| Missing style, unexpected grammar, disagreement | Keep verified fields; mark unparsed/conflicting fields for review |
| Identity changed during request | Never merge old and new documents; use only the previously frozen coherent record and warn, or a spike-verified safe cancellation path |

A partially enriched item gets an automatic tag such as `Westlaw: needs citation review` plus a plain Extra line explaining the category. Do not put a warning into `caseName` or `court`, which would contaminate citations. Distinguish `validated-profile`, `unverified-profile`, and `metadata-only`; “validated” means fixture-backed, not a legal accuracy guarantee.

**Rejected:** DOM-only as the normal path (no systematic T6/court abbreviations, history, or WL cite); service-only (formatted strings lose precision and can be blocked); public search APIs as fallback (new privacy/rate/integration surface); authenticated page-context injection to defeat origin rejection (outside a local translator and potentially contrary to access restrictions).

**Privacy qualification:** catch expected enrichment/parsing failures internally. A translator cannot guarantee the connector will never snapshot a page after an unrelated crash, failed detection, or explicit generic Save. The spike must test this, and the user must accept the remaining host-application limitation before deployment; see §§8 and 11.

## 4. Decision 2 — Small dialect adapters, not a universal citation regex

### Chosen dialects and jurisdiction routing

Support the grammars actually requested: **standard**, **texas**, and the restricted bibliographic-inventory part of **westlaw**. Do not parse all 39 styles in production.

| Court/profile | Primary recipe | Policy |
|---|---|---|
| Federal appellate/district, state cases generally | standard / westReporterOnly | Preserve its selected reporter and parenthetical only after consistency checks |
| NY Appellate Division | standard / westReporterOnly | Observed `770 N.Y.S.2d 386 (App. Div. 2003)`; reject CAFormat's NY-local parallel form as default |
| Texas intermediate appellate | texas + standard / westReporterOnly | Texas supplies district and writ/petition status; standard is corroboration, not a silent substitute |
| SCOTUS with U.S. Reports available | Prefer U.S.; officialReporterOnly if needed | Reporter choice controls authority omission; do not assume westReporterOnly chooses U.S. |
| State high court with regional reporter | standard / westReporterOnly | Keep state abbreviation, e.g. `(Cal. 1980)` for P.2d |
| Official reporter only / historical reporter | Explicit reporter/court profile | Omit authority only if the selected reporter unambiguously implies the relevant court under the applicable rule |
| WL-only | standard plus inventory | Full date/docket required; exact returned grammar needs new fixtures |
| Neutral/slip/specialized forms not recognized | Preserve + needs-review | Add a dedicated profile in hardening, not a permissive catch-all |

Jurisdiction comes from the court metadata, **not** the title's geographic facet: Sanchez is a federal Fifth Circuit case despite a title facet of Texas. A Texas federal court must not trigger the Texas intermediate-appellate adapter.

### Parsing algorithm

1. **Validate the envelope.** Select `responses` by echoed `request.styleId`, not array position. Verify echoed format options where supplied, expected form names, MIME type, lengths, and request identity where available. The recorded matrix is a normalized projection, not the original API envelope; add synthetic envelope tests and a sanitized live envelope capture in the spike.
2. **Normalize safely.** Use `text/plain` as the canonical input. Decode only where needed, normalize whitespace/NBSP and Unicode to NFC, remove the known zero-width watermark characters from every outgoing text value. Preserve meaningful em dashes, apostrophes, accents, reporter punctuation, and case-name capitalization. Do not strip all non-ASCII characters.
3. **Recognize citation anchors, not commas.** Extract DOM candidate reporter tuples first. In service text, locate a supported reporter tuple or WL/neutral citation using those candidates plus a reporter registry. An unknown reporter may be captured syntactically but cannot be confidently classified solely from a broad regex.
4. **Separate the name at the recognized citation boundary.** Names such as `Liggett & Myers, Inc.` contain commas. A first-comma split is forbidden. Handle `In re`, `Ex parte`, corporate suffixes, numerals, and punctuation. The westlaw adapter separately recognizes a docket region before the citation.
5. **Parse a balanced primary citation segment.** Track parentheses/brackets; do not mistake `(CCH)` in a reporter for the deciding-court parenthetical. Locate the first valid main-decision parenthetical after the main citation run, before subsequent-history signals. Never take the last `(year)` in the whole string: it may belong to a later case.
6. **Parse the main parenthetical by dialect.** Standard: court + year, or year alone; WL form may contain court + full date. Texas: court/district + decision year + comma-separated writ/petition status. Preserve a separately typed parenthetical suffix; do not put `1988, writ denied` into `dateDecided` or `court`.
7. **Keep subsequent history separate.** Everything after the main closing parenthesis must be accounted for as recognized history, another supported qualifier, or an unparsed tail. Do not recursively treat the later case's reporter as a parallel citation of this case. The history tail may initially remain a sanitized formatted string; full recursive legal-history interpretation is not a v1 prerequisite.
8. **Parse named short forms by content.** Two `short` forms exist. Select the one with a name plus a compatible citation; strip the citation to obtain only the short name. Do not store `Id.` or `187 F.3d 486` as `shortTitle`. Do not assume short-form order is stable.
9. **Reconcile and round-trip.** Compare normalized volume/reporter/page, main year, and court identity against DOM and other forms. Recompose the supported long-form components and compare to the service form under explicitly permitted whitespace/punctuation normalizations. Any unexplained residual becomes a review reason.

Reporter registry entries include aliases, preferred spacing, citation family, supported page/identifier syntax, court implications, and tested selection preferences. For example, `F.Supp.2d` → `F. Supp. 2d` is an alias rule, not a universal punctuation rewriter. Star-page series IDs corroborate a known reporter; they are not a permanent global reporter database.

**History policy:** retrieve with history on because it carries useful information; do not mistake it for a complete or editorially correct Bluebook history judgment. In Texas, remove a duplicated writ clause from the displayed external history only when an exact fixture-backed rule establishes that it is already represented inside the parenthetical. Retain the original sanitized reference in Extra for audit. If uncertain, flag duplication rather than deleting potentially material history.

### Discovering other state-specific exceptions

Create a coverage ledger with state, court level, reporter family, date era, sample, request profile, expected output, Bluebook edition/table checked, and confidence. Include **all 50 states**, D.C., and requested territories; a missing Westlaw state style does not mean an unsupported state must be ignored.

During development only, compare standard against that state's available style and official/west reporter selections on user-approved samples. Check the results against the user's Bluebook edition and intended national-vs-local citation rules. Promote an exception only with a minimized fixture, a documented rule, and regression tests. Do not request all 39 styles on every save, or equate a state style with national Bluebook compliance.

**Rejected:** one greedy regex; splitting every comma; parsing every state style; shipping a full generic legal-citation NLP package for five known pages; LLM parsing; storing a complete formatted citation as the title or reporter. These obscure errors, enlarge maintenance, or destroy locator/short-form support.

## 5. Decision 3 — Zotero field contract

### Native fields

| Zotero field | Recommendation and rationale |
|---|---|
| `itemType` | Always `case` for a coherently identified opinion, even in metadata-only mode |
| `caseName` | Validated abbreviated service name; fallback sanitized header name without `| Cases | …`. Never the full `.co_title` text or embedded configuration |
| `court` | Citation-specific Bluebook authority only, e.g. `D.C. Cir.`, `D.D.C.`, `App. Div.`, `Tex. App.—Beaumont`. Blank when omission is verified for the chosen reporter. If abbreviation unresolved, leave blank and flag; preserve the full court line in Extra, rather than presenting it as citation-ready |
| `dateDecided` | Full validated ISO date when known, e.g. `1999-08-25`; year only when that is all the evidence supports. Preserve exact data and let CSL decide display precision |
| `docketNumber` | All verified dockets, normalized consistently, including one `No.` or `Nos.` prefix suitable for literal display. Deduplicate Unicode-dash variants without conflating different dockets. Preserve original punctuation when normalization is uncertain |
| `reporter`, `reporterVolume`, `firstPage` | One selected citation; conventional abbreviated reporter and strings for volume/page. No pin cite, range assembled from star pages, or history in these fields |
| `history` | Subsequent procedural history only, mapped to CSL `references`. Keep parallels and WL alternatives out of it. Sanitized service tail; no leading separator if CSL supplies it |
| `shortTitle` | Name-only service short form. If unavailable, leave unset and let CSL fall back to the full name; never guess which party is distinctive |
| `url` | `https://1.next.westlaw.com/Document/<validated-GUID>/View/FullText.html`; no query, fragment, search terms, session or account parameters. GUID identifies the document, not the account |
| `creators` | One opinion author. The byline supplies the surname, and a short signature or the byline link's title supplies the given name. Per Curiam is a single field. Empty when the lead-author line is absent. Not the panel, not counsel, and not the parties. The local Bluebook style does not print this creator |
| `attachments`, `notes` | Empty by default; no opinion text, page image, PDF, or service-response dump |

### Court-parenthetical rules

Treat omission as a relationship between **selected reporter and actual court**, not a global property of a state or court.

- `347 U.S. 483` from SCOTUS → no authority, `(1954)`.
- A regional reporter such as `P.2d` does not establish the state → state authority remains.
- An official reporter may imply the state and court, but official status alone is insufficient. Trial/appellate series, older court names, and reporter transitions need explicit rules. When only the jurisdiction is implied, omit that component and retain the necessary court designation.
- Miele's selected `N.Y.S.2d` profile retains `App. Div.` exactly as observed; do not blindly insert another `N.Y.`.
- A year-only service parenthetical is not proof that omitting the court is nationally correct: NY CAFormat illustrates why the request profile matters.

Keep `Westlaw court (raw): …` and `Westlaw jurisdiction: …` in Extra as informational text. Do not expect stock Zotero to abbreviate courts or stock CSL to interpret a jurisdiction code automatically.

### Parallel citations, WL citations, neutral forms, and Extra

**One item, one primary citation, alternatives retained without pretending they are pages.** Default national Bluebook output selects one preferred reporter; alternate official/regional/WL/specialist citations are stored as separate plain Extra lines, such as `Westlaw parallel citation: …` or `Westlaw alternate WL citation: …`. Unknown forms are retained as `Westlaw unparsed citation: …` with a review flag.

A reported opinion that also has a WL identifier remains a reported case; the mere existence of a WL alternate must **not** trigger the WL-only CSL branch.

Minimal proposed CSL bridge, reserved for this translator's `legal_case` items:

| Extra key / mapped variable | Purpose | Rendering contract |
|---|---|---|
| `Medium: Westlaw` → `medium` | Only on a WL-primary case | Presence selects electronic-case branch; not printed |
| `Genre: writ denied` → `genre` | Citation parenthetical tail, e.g. Texas writ/petition status | After year, inside parentheses; never used as a general case-type label |
| `Annote: …` → `annote` | Optional **reviewed display** string for a required parallel or neutral citation | A deliberately limited local contract; plain Extra alternatives do not automatically populate this |

Native `history` supplies `references`; do not duplicate it via `References:`. Diagnostic keys begin `Westlaw …` and must not accidentally shadow real CSL keys. Include translator version, profile, status, and review reasons, but no resource tokens or raw JSON. A sanitized primary reference string may be retained for comparison; it is not a replacement for structured fields.

**[U] Bridge validation is a release gate.** Test these exact keys through saving, reopening, Zotero's actual citation processor, and export. CSL cannot generally compare a variable's string to an arbitrary literal; the local style must use a documented presence test for the reserved `medium` marker, not an imaginary `medium == "WL"` expression. Never apply this marker convention indiscriminately to unrelated imported legal cases.

### WL-only mapping

For the illustrative citation `Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)`:

- `reporterVolume = 2024`, `reporter = WL`, `firstPage = 1234567` (database identifier, not star page).
- `court = D. Kan.`, `dateDecided = 2024-03-01`, `docketNumber = No. 24-123`, `Medium: Westlaw`.
- The citation-time locator is `*4`; it is never stored in `firstPage`.
- Without a locator, omit `, at *4`; do not invent `*1`.
- Missing exact date, docket, or deciding court remains visible as incomplete metadata. Do not manufacture a day from a year or use a subsequent-history date.

This is a **synthetic format test**, not an asserted real case or observed service output.

### Rejected mappings

- Multiple reporter items linked with `seeAlso`: creates duplicate library entries and ambiguous cite selection.
- Putting all parallels in `history`: confuses citation alternatives with procedural history and makes sensible rendering impossible.
- Putting a complete parenthetical into `court`, or a complete citation into `reporter`: breaks year, locator, and short-form rendering.
- Dropping exact dates just to accommodate a deficient style: loses bibliographic data.
- Parties or counsel as authors. The opinion author from the lead-author line is stored so the Zotero Author field is filled. The local Bluebook style does not print that creator.

## 6. Decision 4 — Use a local CSL derivative

### Recommendation

Use **a separately named local derivative of `bluebook-law-review.csl`** as the supported v1 style. Give it a unique style ID/title/self-link, preserve the original license and attribution, and record the upstream version. Do not overwrite Zotero's stock style or modify the cloned source in place.

This is not merely an optional cosmetic tweak if the acceptance scope includes Texas parenthetical status, WL-only opinions, and displayed history. It is a small set of **case-specific macro changes**, not a new legal citation engine. The translator alone can still produce useful native records, but stock-style use must be labeled reduced functionality.

Required changes:

1. **Reported-case first cite:** name, volume/reporter/first page, optional locator, authority + year. Suppress stored dockets and month/day for reported cases. Avoid recasing an already normalized case name with generic title-case transformation.
2. **WL-primary first cite:** name, docket(s), year + WL + identifier, optional `, at <locator>`, court + full date. Use Bluebook month forms; test September and other locale-sensitive abbreviations, not just March.
3. **Texas parenthetical tail:** append `genre` after the year with a comma, inside the parentheses.
4. **History:** append `references` after the primary parenthetical on the first full cite only. Preserve validated minimal citation typography if the actual processor supports it; permit only a narrow safe inline-markup subset, never service HTML links/styles. If typography cannot be round-tripped reliably, require a reviewed citation suffix for that history instead of claiming automated correctness.
5. **Short/Id. paths:** no history or parenthetical tail repeated. No dangling `at` with no locator. For WL locators, the user enters the literal star locator, e.g. `*4`; the style supplies `at`, not a second star. Test first, subsequent, ibid, ibid-with-locator, and multi-item citation contexts separately.
6. **Optional reviewed `annote`:** support a documented position for required alternate/neutral citation text, if approved in hardening. Do not append every alternate reporter indiscriminately. Complex neutral/paragraph combinations require additional profile-specific tests.

History is captured from a service, **not a citator opinion**. The user must review legal relevance, adverse history, omitted history, and whether a particular citation needs the full captured tail. Editing native `history` provides a simple per-item correction path; the original sanitized service reference remains available for comparison.

**Default presentation:** law-review footnotes, consistent with the chosen base. Legal-brief/in-text typography and court-specific parallel requirements are a user decision. If briefs are primary, create a separately identified, tested in-text variant later; do not advertise stock Inline as equivalent. Selecting `LawReviews` instead of `LegalBriefs` at the service is not a substitute for correct CSL typography; only no-difference results on five samples are reported.

**Rejected:** unmodified Law Review for the complete requirement; unmodified Inline; opaque full citations in CSL `title`/`note`; a switch to Juris-M as a prerequisite. Juris-M remains a possible later architecture change if jurisdiction-driven parallel/neutral requirements exceed a modest local style, not a dependency for v1.

## 7. Decision 5 — Detection, identity, and scope

### Scope

V1 handles **one open U.S. case opinion** on `https://1.next.westlaw.com/…`. Support both `/Document/<GUID>/View/FullText.html` and `/Link/Document/FullText…` navigation. A host-wide target plus strict document checks is preferable to missing SPA/link routes; use normal site-translator priority (100).

- **No `multiple` in v1.** Search results, KeyCite lists, folders, and bulk selection are deferred.
- **No statutes, regulations, secondary sources, or Restatements.** These need different item types and CSL policies. The supplied secondary-source page is a negative fixture.
- No extra Westlaw hosts/proxies until separately sampled. Do not widen host permissions merely because the connector can de-proxy other sites.

### `detectWeb(doc, url)` policy

- Require a loaded opinion container and a plausible case header/identity.
- Prefer current embedded config `ContentType == Cases`, corroborated with an exact `| Cases |` title segment and case DOM.
- If config is unavailable but title and coherent case DOM agree, allow case detection with DOM-only capability.
- If an explicit non-case ContentType conflicts with a stale Cases title, do not classify it as a case; monitor for completion.
- Never classify from URL or title alone. Search result titles and stale SPA titles are not enough.
- Return `case` only for coherent supported content; otherwise falsy.

Use `Zotero.monitorDOMChanges` on the smallest stable relevant container, once per detection attempt, to handle delayed headers. Avoid watching every opinion text mutation. Re-arm as needed if the container is replaced. Connector pushState redetection is reported, but test same-route replacements and back/forward navigation explicitly.

`doWeb` rereads and freezes GUID + header/date/citations + relevant config as one coherent capture. For `/Document/…`, URL and config GUID must agree; for `/Link/…`, current config/header-link identity is essential. Avoid scanning the entire serialized page for the first `DocumentGuid`: scripts can contain related or stale documents. Parse the known configuration block without `eval`; tightly scoped fallback extraction must validate uniqueness and coherence.

**Rejected:** title-only detection; hard-coded `cite0` IDs; treating all `/Document/` pages as cases; scraping result pages to get “all courts” coverage. Broad jurisdiction support does not require bulk access.

## 8. Decision 6 — No automatic attachments

Return no attachment objects and no full-text notes. Do not create a sanitized “snapshot” by deleting only `.co_title`: HTML still includes configuration, account context, scripts, and the full opinion. No automated print/PDF delivery or discovery in v1; a PDF may introduce billing, routing, watermark, and licensing concerns not investigated here.

The user can manually obtain and attach an authorized PDF later, outside the translator. This is deliberately separate from citation metadata extraction.

**Rejected:** default snapshot (privacy and storage); “snapshot with watermark stripped” (incomplete sanitization and unnecessary full-text retention); automatic PDF (unverified delivery interface and scope expansion).

**Host fallback limitation:** a missing or failed translator can still cause the connector to save a webpage with a snapshot. Test service failure without throwing, malformed DOM, and a deliberately induced fatal failure in a disposable library. Determine whether the installed connector offers a supported no-fallback save/cancellation path. Do not rely on internal connector APIs from translator code. If there is no safe path, document that strict zero-snapshot behavior under arbitrary connector failure cannot be delivered by a translator alone. Stop deployment if the user requires that guarantee; do not quietly broaden the project into a connector fork.

## 9. Translator module/function breakdown

All functions ship in one translator `.js`; “module” here means responsibility, not runtime imports.

| Function / group | Contract |
|---|---|
| `detectWeb` / `inspectCaseReadiness` | No network; content/type/identity checks, bounded DOM monitoring |
| `doWeb` | Capture → enrich → reconcile → map → complete once; catches expected enrichment failures |
| `readPageContext` | Allowlisted config parsing; validates current GUID/content type/routing; tokens remain ephemeral |
| `readDOMFacts` | Scoped header lists, deduplication, docket/date/cite extraction, semantic fallback selectors |
| `cleanBibliographicText` | Watermark removal, whitespace/NFC, safe text extraction; applied to every outgoing field |
| `classifyCourt` / `selectCitationProfile` | Actual court classification; fixture-backed reporter choice and jurisdiction exception registry |
| `buildCitationRequests` / `fetchCitationForms` | Explicit option sets, current headers, timeout/request budget, status classification |
| `readResponseEnvelope` | Echo/style/form/MIME validation; no positional response assumptions |
| `parseStandardForm` / `parseTexasForm` | Primary citation/name/parenthetical/history split; structured failures rather than guessed fields |
| `parseWestlawInventory` | Restricted docket/date/WL/parallel extraction; never supplies Bluebook abbreviations blindly |
| `parseReporterCitation` / `parseShortName` | Typed citation recognition and name-only short form extraction |
| `reconcileCaseRecord` | Provenance, conflicts, duplicate history/citation checks, round-trip comparison |
| `mapCaseToZotero` | Native field and Extra contract; one opinion author when the lead-author line is present; no attachments or full-text storage |
| `validateOutgoingItem` | Allowed fields, no watermark/token/config leakage, coherent identity, review status |
| `debugEvent` | Version/profile/status/reason codes only; never raw HTML, headers, tokens, or response payloads |

Use data tables rather than jurisdiction-specific branches scattered through the parser. Keep pure parsing/reconciliation functions independent of Zotero APIs so they can be exercised against local fixtures.

## 10. Decision 7 — Local testing and development workflow

### Fixture strategy, no CI required

Maintain two classes of fixtures:

1. **Private originals:** existing saved HTML and service recordings, read-only and local only. Never commit, upload to an issue, or paste into a remote test service. Saved HTML must be parsed inertly; do not execute its scripts or load embedded external resources in tests.
2. **Minimized synthetic/sanitized fixtures:** header/config shape only, placeholder tokens, no account identifiers, no opinion paragraphs. Use synthetic punctuation/selector/error variations. Review before any eventual commit.

**[V] Current `.gitignore` only excludes `westlaw-samples/*.html` and `*.txt`, not the JSON recordings.** Before future capture or implementation commits, broaden the private-data exclusion to the entire `westlaw-samples/` tree and private test outputs, inspect tracked files, and use `git check-ignore`/`git ls-files` to verify. `.gitignore` does not untrack already tracked content. This plan does not alter those rules or stage any data.

Proposed test layers:

- Pure parser tests over normalized matrix strings and synthetic adversarial strings.
- DOM tests over private inert HTML plus minimized DOM fragments.
- Request-envelope tests with mocked HTTP: echo mismatch, missing forms, duplicate `short`, JSON/HTML errors, timeouts, and response-size limits.
- Mapping tests: entire Zotero item compared with expected fields; explicit absence assertions for tokens, zero-width watermark, opinion text, and snapshots. Creators stay empty unless the fixture has a lead-author line.
- Actual Zotero/citeproc rendering tests with the installed local CSL; verify typography as well as plaintext.
- Manual Chrome/Connector end-to-end checks, because Scaffold cannot establish MV3 origin/cookie behavior.

Proposed future local commands (not existing commands and **not run as part of this plan**):

- `node --test tests/*.test.mjs` — parser, inert DOM adapter, policy, mapping, and mocked failures; pin any DOM/test dependencies locally.
- `node tests/render-citations.mjs` — exact-output regression corpus using a pinned compatible citeproc engine and the candidate CSL.
- `node tests/check-private-data.mjs` — fixture/output allowlist checks plus Git-tracking checks.

Run Zotero translator lint locally using the cloned translator repo's documented lint setup; validate CSL against its schema. Record actual commands, dependency versions, output, and source revisions when implementation starts. A home-grown renderer alone does not replace installed Zotero verification.

### Scaffold and install loop

1. Open Zotero's Translator Editor/Scaffold; create the header with a unique UUID, web type, host target, priority, supported browser declaration, and `lastUpdated`.
2. Run DOM detection/extraction and field previews there; use mocked/local fixtures for service parsing. Scaffold's browser/session can differ from Chrome's authenticated session.
3. Keep the source under a new local project directory in this workspace, not inside an upstream clone. Copy the release candidate to the **actual Zotero data directory**, located through Zotero settings, under `translators/Westlaw Advantage US.js`.
4. Install the separately named local CSL through Zotero's style installation UI.
5. Keep desktop Zotero running; allow translator metadata refresh via desktop hash/ping. If needed, reload through Scaffold/restart desktop and refresh the Westlaw tab. Confirm the translator label/version in debugging; do not assume “immediate” means the already-open tab instantly redetects.
6. Test in a disposable, unsynced library/profile. Do not depend on cloud saving if desktop is unavailable.

### Verification checklist

For every golden case:

- Correct item type and identity; no generic title or query-bearing URL.
- Selected reporter is the intended one, and first page is not a pin/last page.
- T6 name, court abbreviation/omission, and date precision checked against the user's Bluebook edition.
- Reported cases retain exact date/dockets in metadata without printing them unnecessarily.
- WL-only cases print dockets, WL identifier, full date, and star locator correctly.
- Texas district, em dash, year, and writ/petition status are in the correct positions.
- History follows the main parenthetical once; later-case citations never become main parallels.
- Short name is name-only; first/subsequent/Id./new-locator/multi-item sequences pass, including no locator.
- No duplicate sticky-header data; no zero-width fingerprint in any field.
- No attachments, request tokens, account identifiers, raw configuration, or full opinion text in saved/exported items.
- Primary/inventory failure creates an appropriately flagged case, with no webpage fallback in those handled scenarios.
- Rendered output is compared to **independently reviewed expected citations**, not merely a service output that may itself be wrong.

## 11. Phased milestones and acceptance gates

Each phase is bounded. No phase implies authority to push or publish. If code is later committed, use source/tests/docs-only atomic commits; raw Westlaw samples are excluded at every boundary.

### M0 — Compatibility, privacy, and CSL-contract spike

**Scope:** a temporary minimal local translator/request probe and small CSL proof, only after implementation is authorized. No general parser yet.

**Origin-risk experiment first:**

1. With desktop Zotero and the MV3 connector running, open an already authorized sample case in Chrome.
2. Trigger one request through a translator's supported `ZU.request*` path, with current allowlisted config headers. Do **not** substitute a DevTools page-context fetch.
3. Observe the extension service-worker request locally: actual Origin (which might be absent), cookies, routing headers, redirects, status, content type, and readable response. Record only redacted facts; never export an unsanitized HAR.
4. Compare once with the page's normal Copy-with-Reference request if diagnosis is needed. Test the proposed A/B option combinations, including Texas. Make a few deliberate user-triggered requests, not another exhaustive 39-style crawl.
5. Simulate auth rejection and timeout through mocks first; test actual session expiry only with the user's consent. Confirm a metadata-only case is saved instead of an exception-induced webpage.
6. Test fatal fallback behavior and desktop-offline behavior separately in a disposable environment. Confirm what is and is not enforceable without changing the connector.
7. Prove `medium`, `genre`, native `references`, and optional `annote` survive actual item saving and render predictably. Test history italics before choosing automatic history rendering.

**Acceptance:**

- Written go/no-go result for connector-origin/cookie/routing compatibility and exact proposed option recipes.
- One ordinary citation, `Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)`, traverses the actual connector → Zotero → CSL path.
- A small synthetic CSL record produces `(Tex. App.—Beaumont 1988, writ denied)` and the synthetic WL citation in §5, with no field pollution.
- All seven type examples below are registered as golden targets with observed vs unverified status. M0 does **not** falsely declare the missing real fixtures covered.
- No sensitive test output saved or staged. Normal success and handled network failures attach no full text.
- If origin is rejected, stop service-dependent v1 work and report the exact redacted failure; choose with the user between degraded DOM-only capture/manual correction or a separately authorized alternative. Do not bypass the restriction.
- If strict no-snapshot-on-any-failure is required and cannot be enforced, mark the architecture blocked under the single-translator constraint.

**Test gate:** actual MV3 manual spike + mocked failures + installed Zotero CSL proof. **Commit boundary:** spike source and redacted findings only, if requested; otherwise remove the probe from the installed translator directory after documenting results.

### M1 — V1 single-opinion capture and local style

**Scope:** DOM/config adapters, default and Texas profiles, bounded service client, structured case mapping, fallback flags, local CSL, and golden regression tests. No multiple, attachments, or other content types.

**Acceptance:**

- All five supplied case recordings parse without losing identity, dates, dockets, alternate cites, or history; the secondary-source fixture is rejected.
- Add user-authorized **real** SCOTUS, state-high-court, and WL-only fixtures. Synthetic examples alone cannot close their live acceptance gate.
- All seven example classes below render correctly as first citations, and have tested subsequent/Id./locator behavior. Verify both year-only display and exact stored date.
- Miele uses N.Y.S.2d/App. Div.; Rogers uses the Texas district/status profile; federal cases do not accidentally select state styles.
- Primary-service failure, inventory-only failure, missing tokens, malformed JSON, duplicate headers, alternate IDs, and changed SPA identity have explicit passing tests.
- Each save completes once and emits no automatic attachment. No unexpected HTTP requests during detection.
- Manual item edits can correct abbreviations/history without modifying the translator. Known degraded records carry visible review flags.
- The user can install/update/roll back the `.js` and local `.csl` without an upstream release.

**Test gate:** local unit/fixture commands, translator lint, CSL validation/rendering corpus, Scaffold field diff, real Chrome end-to-end checklist. **Commit boundary:** source + safe tests + local CSL + installation instructions; no samples or runtime output. **Release label:** v1, tested profiles only; not “all 50 states certified.”

### M2 — All-jurisdiction hardening and maintenance readiness

**Scope:** expand the coverage ledger, test reporter eras and court levels, add verified exception profiles and neutral/paragraph handling where needed. Remain single-opinion and metadata-only.

**Acceptance:**

- All 50 states have an explicit coverage row; D.C., federal circuits/districts, and relevant specialized federal/territorial courts are separately accounted for. Every untested court/reporter family remains labeled untested instead of inheriting a false pass.
- At least a high-court and, where present, an intermediate-appellate sample per state; sample lower courts and specialized reporters when actually encountered. Include representative historical official series and current regional series. This is a coverage floor, not proof about every published reporter ever used.
- Test U.S., S. Ct./L. Ed. alternatives, Federal Reporter generations, Federal Supplement generations, regional generations, official reporters, specialty reporters, WL-only, neutral/slip citations, paragraph locators, docket-only records, and multiple dockets.
- Any court/reporter pattern needed for the user's real corpus either passes a profile-specific golden test or reliably yields a review-required record. No silent loss of an unrecognized component.
- Where Bluebook/local rules require a neutral or parallel display, the optional bridge and CSL have dedicated first/short/pin tests; if this exceeds the small-style contract, stop for an architecture decision rather than hide data in `firstPage`.
- Regression tests retain all seven baseline examples, including history and punctuation. Repeated SPA navigation/back-forward, missing/stale config, service response changes, and selector mutations pass.
- Document a manual correction path and update drill. Do not claim universal strict compliance until the user's desired courts/reporters/edition are actually validated.

**Test gate:** full local corpus, coverage-ledger audit, user-reviewed Bluebook examples and installed Zotero output. **Commit boundary:** one verified profile/family per source/test/docs slice when practical. **Status:** future; no invented all-state test results.

### Golden citation examples

Text below is the citation body; law-review CSL may add a terminal period and context-dependent italics. These examples specify metadata/format expectations, not current legal validity of the cases.

| ID / case type | Concrete target | Evidence and acceptance notes |
|---|---|---|
| G1 Federal appellate | `Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)` | **[V] Recorded.** Store `1999-08-25`; cite year only. Pin: `…, 490 (5th Cir. 1999)`. Named short: `Sanchez, 187 F.3d at 490`. Also retain D.C. Circuit fixture `United States v. Philip Morris USA Inc., 566 F.3d 1095 (D.C. Cir. 2009)` |
| G2 Federal district | `United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006)` | **[V] Recorded base.** History-on test must retain and place the recorded `aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)` tail and account for the remaining recorded history, not truncate it silently |
| G3 SCOTUS | `Brown v. Bd. of Educ., 347 U.S. 483 (1954)` | **[P] Familiar illustrative target; not a supplied/live-verified fixture.** Pin 495; no `(U.S. 1954)`. Verify the chosen service's exact abbreviated name separately rather than asserting it is recorded |
| G4 NY App. Div. | `Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)` | **[V] Recorded standard/westReporterOnly.** Preserve `2 A.D.3d 799` and `2003 WL 23099090` as alternatives. Never copy a pin from the A.D.3d series into an N.Y.S.2d citation |
| G5 Texas App. | `Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied)` | **[V] Recorded Texas/CAFormat/history-off form. [U] Proposed history-on westReporterOnly recipe.** Test optional history after this base, particularly disapproval by `Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)`, with no duplicated writ disposition |
| G6 State high court | `Sindell v. Abbott Labs., 607 P.2d 924 (Cal. 1980)` | **[P] Illustrative target, not a supplied Westlaw fixture.** Obtain/review the real service name and date before freezing the golden string. Regional reporter requires `Cal.`. Add paired official-reporter test `Sindell v. Abbott Labs., 26 Cal. 3d 588 (1980)` to test omission; it is a deliberate selection-policy test, not the default regional preference |
| G7 WL-only unpublished | `Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)` | **[P] Explicitly fictional format fixture.** Must be supplemented by a real user-provided unpublished opinion before M1 sign-off. Short: `Example, 2024 WL 1234567, at *4`; Id. with new locator: `Id. at *5`. Test no-locator form as well |

M0 proves connectivity and the representation for these classes; M1 requires all seven class gates, including missing live fixtures; M2 preserves them while expanding coverage. Do not substitute a published case's alternate WL number for a genuinely WL-only test.

## 12. Decision 8 — Robustness and maintenance

### Selector and schema fallbacks

Use ordered, scoped fallbacks:

1. Current non-sticky opinion header; query all matching citation lists because duplicate IDs are possible.
2. Direct `li` children, classified as court/date/citation/page-count with semantic checks. Positional interpretation is acceptable only after validating the observed shape.
3. ID variants (`courtline`/`chapter`, `citeN`/`chapterN`) and `.co_courtBlock`, `.co_cites` as corroboration/fallback, not assumptions of universal uniqueness.
4. `.co_docketBlock` separately; sanitized header title before `.co_partyLine` fallback. Never ingest `.co_title` wholesale.

Deduplicate normalized complete citation values and dockets, while retaining meaningful parallel-series differences. Reject approximate page counts as dates/cites. Detect conflicting duplicate headers rather than picking whichever appears first. Ignore judges, panel and counsel blocks for v1 storage.

### Versioning and updates

- Stable translator UUID; unique label; monotonic `lastUpdated` plus a human-readable release version in comments/debug/provenance. Track parser/profile/Extra contract versions together.
- Keep a known-good source copy outside the Zotero installation. Do not use an upstream clone as the working project.
- Update local source, run the corpus, back up the installed `.js`/`.csl`, copy the release, refresh detection, and save one smoke-test case. Confirm the actual served version, not merely the file timestamp.
- Roll back by restoring those files; do not reset the Zotero database or overwrite other translators. A translator upgrade does not automatically repair previously saved items. Re-save into a temporary collection and reconcile manually; automatic library migration is out of scope.
- A unique CSL ID prevents a normal upstream style update from silently replacing the local derivative. Periodically review upstream changes rather than merging blindly.

### Logging

Use `Zotero.debug` with bounded reason codes: translator version, profile, request number, status class, parser stage, and counts. Do not log header values, full request config, HTML, response bodies, full account-bearing URLs, or opinion text. Built-in connector HTTP logging may include URLs independently of translator logging; keep logs local, inspect/redact before sharing, and disable verbose logging after diagnosis.

A saved warning must be understandable without opening a developer console. No telemetry, persistent response cache, or background polling. In-flight request deduplication is acceptable within a save; do not cache session tokens or assume a global translator instance persists across navigations.

**Rejected:** unversioned file replacement, logging everything until it breaks, automatic updates from a personal remote endpoint, broad fuzzy selectors, and silent parser “best guesses.”

## 13. Decision 9 — Safety, policy, and breakage risks

| Risk | Mitigation / boundary |
|---|---|
| Subscription terms prohibit some automation | Personal use is not automatic permission. User reviews current institutional/subscription terms; historical forum concerns are not current legal advice. Stop if prohibited; do not evade authentication or access controls |
| Rate/usage limits or billable behavior | Explicit single-case saves, normally two sequential citation GETs, no background crawl, no result harvesting, no PDF-delivery calls; honor blocking/429 |
| Account identifiers in HTML/config/watermark | Extract allowlisted bibliographic fields only; strip known watermark characters everywhere; tokens stay ephemeral; no snapshots or raw dumps |
| Local data later synced/uploaded | Use an unsynced test library, keep desktop running, and review Zotero sync/cloud-saving settings. A local translator does not by itself make Zotero storage local-only |
| Connector fallback captures full HTML | Handle routine failures internally; test fatal fallback; disclose limitation and block deployment if absolute prevention is required |
| Extension origin/cookie policy changes | M0 go/no-go, repeat smoke test after connector/Chrome changes; no spoofing or page-injection workaround |
| DOM/config drift | Scoped selector families, typed validation, minimized mutation fixtures, review-required fallback |
| Service changes or format changes | Echo checks, dialect adapters, complete-tail accounting, bounded calls; no silent switch to a different citation style |
| Incorrect automatic court omission | Reporter + actual-court profile; preserve raw court and test implied-jurisdiction vs implied-court distinction |
| Wrong dates/history | Primary-decision anchoring, DOM corroboration, field provenance, no last-year-in-string heuristic |
| State-specific local formats mistaken for Bluebook | Evidence-backed exception ledger; no automatic state-style selection for every state |
| User assumes metadata tag means legally validated | Explicit tested-profile/review status; human check of edition, history relevance, local rules, and pins |
| Private fixtures accidentally committed | Ignore full private tree, inspect tracked paths/staged diff, never include raw captures in test reports or upstream contributions |

**Rejected:** treating open-source scrapers or an upstream Lexis translator as permission; storing account-bearing reference URLs for convenience; relying on removal of just the visible watermark for privacy; claiming total legal-format coverage from a small test corpus.

## 14. Open questions for the user

1. **Which Bluebook edition and writing context?** Law-review footnotes are the recommended default. Are legal briefs/in-text citations, court-specific rules, or both required?
2. **May the deliverable include the small local CSL derivative?** Without it, Texas suffixes, WL-only forms, and history cannot meet this plan's full acceptance scope with the inspected stock styles.
3. **What does “ALL courts and reporters” mean for acceptance?** Nationwide best-effort capture with explicit review flags, or only release after a defined corpus is verified? Include territories, tribal/military/bankruptcy/tax courts, historical reporters, and neutral citations?
4. **Which real SCOTUS, state-high-court, and WL-only opinions may be used locally?** These are missing from the supplied live corpus. Additional state samples are needed for hardening.
5. **Should captured subsequent history print automatically?** Recommendation: preserve it in native history and support first-cite rendering, with user review/editing. Would preservation-only plus manual citation suffixes be preferable?
6. **Are parallel citations required in ordinary output, or just retained for lookup?** Recommendation: one national Bluebook primary citation, with optional reviewed display for jurisdictions that require more.
7. **Is the connector's residual generic-snapshot fallback acceptable?** The translator will request no attachments, but cannot promise control over every host fallback. An absolute no-full-text requirement may block the single-file architecture.
8. **Is Zotero sync/cloud saving enabled, and is local-only storage required as well as local installation?** These are separate decisions.
9. **Do the user's Westlaw terms permit these personal, user-triggered metadata requests?** No assertion of permission follows from the technical feasibility.
10. **Preferred degraded-save behavior?** Recommendation: save an honest metadata-only case with a review tag rather than lose the reference or silently claim Bluebook readiness. Safe hard-cancel behavior depends on the M0 connector test.

## Final architecture decision

Proceed only after **M0 establishes the real connector request path, the CSL bridge, and acceptable fallback/privacy behavior**. Then deliver one metadata-only local translator plus a narrowly modified local Bluebook CSL, with structured fields, conservative parsing, explicit uncertainty, and a growing fixture-backed jurisdiction registry. Do not implement a universal citation parser, bulk harvester, or connector fork under this milestone.

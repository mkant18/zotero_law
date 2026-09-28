# LANE E — Citation Output & Translator Dev Workflow

## 1. How a saved 'case' item becomes a formatted citation: CSL pipeline

### Data flow

```
Zotero desktop 'case' item
  → Zotero.Utilities.Item.itemToCSLJSON(zoteroItem)
    → maps Zotero fields → CSL-JSON (citeproc-js JSON)
  → citeproc-js engine + CSL style
    → formatted citation text
```

### Zotero 'case' item type → CSL-JSON field mapping

**Source:** `M:/Coding_Projects/_zotero-research/zotero/resource/schema/global/schema.json` (lines for `itemTypes` → `case`)

| Zotero field (case) | baseField | → CSL-JSON variable | Bluebook purpose |
|---|---|---|---|
| `caseName` | `title` | `title` | Case name, e.g. "Roe v. Wade" |
| `court` | `authority` | `authority` | Court name, e.g. "U.S. Supreme Court" |
| `dateDecided` | `date` | `issued` | Decision year |
| `docketNumber` | `number` | `number` | Docket number (used in medium-neutral citations) |
| `reporter` | (direct) | `container-title` | Reporter abbreviation, e.g. "U.S." or "F.3d" |
| `reporterVolume` | `volume` | `volume` | Reporter volume, e.g. "410" |
| `firstPage` | `pages` | `page` | Starting page, e.g. "113" |
| `history` | (direct) | `references` | History of case (not used in Bluebook styles examined) |
| `shortTitle` | (direct) | `title-short` | Short form for subsequent citations |
| `url` | (direct) | `URL` | Web URL |
| `accessDate` | (direct) | `accessed` | Date accessed |
| `extra` | (direct) | `note` | Extra field (CSL key-values parsed) |
| `DOI` | (direct) | `DOI` | DOI |
| `language` | (direct) | `language` | Language |
| `rights` | (direct) | `license` | Rights/license |

**CSL name mapping:** Zotero `author` (creatorType=author) → CSL `author`. For `case` items, creator type `author` is the primary creator.

### Bluebook CSL variables — what each style requires

**Source:** `M:/Coding_Projects/_zotero-research/styles/bluebook-law-review.csl` (full file, 391 lines)
**Source:** `M:/Coding_Projects/_zotero-research/styles/bluebook-inline.csl` (full file, 232 lines)

#### `bluebook-law-review.csl` (class="note" — law review footnotes)

**First citation** — `legal_case` branch of `<macro name="source">` (lines 153–167):
```
<group delimiter=", ">
  <text variable="title" text-case="title"/>         ← caseName
  <text variable="volume"/>                            ← reporterVolume
</group>
<text macro="container"/>                              ← reporter (via form="short")
<group delimiter=", ">
  <text variable="page-first"/>                        ← firstPage
  <text variable="locator"/>
</group>
<text macro="issuance" prefix="(" suffix=")"/>         ← authority + year
```
→ Output: `Roe v. Wade, 410 U.S. 113 (1973)`
→ Output: `Smith v. Jones, 123 F.3d 456 (9th Cir. 1999)`

**`issuance` macro for `legal_case`** (lines 253–257):
```
<group delimiter=" ">
  <text variable="authority"/>                         ← court
  <date variable="issued">                             ← dateDecided
    <date-part name="year"/>
  </date>
</group>
```
→ Inside parentheses: `U.S. Supreme Court 1973` → `(U.S. Supreme Court 1973)`

**Subsequent citation** — `legal_case` branch (lines 290–303):
```
<group delimiter=", ">
  <text variable="title" form="short" font-style="italic"/>   ← shortTitle
  <group delimiter=" ">
    <text variable="volume"/>                                   ← reporterVolume
    <text variable="container-title" form="short"/>             ← reporter
    <text macro="at_page"/>                                     ← locator
  </group>
</group>
```
→ Output: `Roe v. Wade, 410 U.S. at 113`

**`container` macro for `legal_case`** (lines 309–311):
```
<text variable="container-title" form="short" prefix=" "/>     ← reporter (short form)
```
→ Note: uses `form="short"` — must match CSL `form="short"` rendering of container-title

**`author` macro** (lines 70–88): Legal_case suppresses author display entirely — no party names rendered outside `title`.

#### `bluebook-inline.csl` (class="in-text" — sentence citations)

**First citation** — `legal_case` branch of `<macro name="source-long">` (lines 110–130):
```
<text variable="title" suffix=", " font-variant="normal"/>      ← caseName
<text variable="number" suffix=", "/>                             ← docketNumber
<group delimiter=" ">
  <text variable="volume"/>                                       ← reporterVolume
  <text variable="container-title"/>                              ← reporter
  <text variable="page"/>                                         ← firstPage
</group>
<text variable="locator" prefix=", "/>
<group prefix=" (" suffix=")" delimiter=" ">                     ← parentheses
  <text variable="authority"/>                                    ← court
  <date variable="issued">
    <date-part name="month" form="short" suffix=" "/>
    <date-part name="day" suffix=", "/>
    <date-part name="year"/>
  </date>
</group>
```
→ Can produce: `Roe v. Wade, 410 U.S. 113 (U.S. Supreme Court 1973)`
→ If docketNumber present: `Smith v. Jones, No. 20-1234, 123 F.3d 456 (9th Cir. 1999)`

**`source-short` macro** (lines 28–42):
```
<if type="legal_case">
  <group delimiter=" ">
    <text variable="title" form="short" suffix="," font-style="italic"/>
    <text variable="volume"/>
    <text variable="container-title"/>
  </group>
</if>
```

**`container` macro for `legal_case`** (line 189):
```
<text variable="container-title" form="short" prefix=" "/>
```

### Key observations about Bluebook conventions in CSL

1. **Court name (authority):** Bluebook requires abbreviated court names (e.g., "U.S." not "Supreme Court of the United States"; "9th Cir." not "United States Court of Appeals for the Ninth Circuit"). The CSL `authority` variable is rendered verbatim — Zotero does NOT abbreviate it automatically. The translator should set `court` to the Bluebook abbreviation directly.

2. **Reporter (container-title):** Must be the standard Bluebook reporter abbreviation (e.g., "U.S." for United States Reports, "F.3d" for Federal Reporter Third Series). The style uses `form="short"` for container-title in `bluebook-law-review`, which means the short form should be the abbreviated reporter name.

3. **Number vs docketNumber:** The `bluebook-inline` style uses `<text variable="number"/>` for the docket number. Standard Bluebook format is "No. 20-1234". Only used in medium-neutral citations.

4. **Short forms:** Both styles support `title-short` for subsequent citation short forms. `bluebook-law-review` uses `title form="short"` for subsequent cites.

5. **`Id.` support:** `bluebook-law-review` uses CSL `position="ibid-with-locator"` and `position="ibid"` to render `id.` but notes in `bluebook-inline` (line 170): "CSL does not currently support reference to number of repeats, so cannot follow proper Bluebook repeat rule".

6. **Parallel citations:** Neither Bluebook style in this repo handles parallel citations (multiple reporters for same case). This is a known CSL limitation.

7. **No `history` variable usage:** Neither Bluebook style uses `history` field.

8. **URL handling:** Both styles suppress URL for `legal_case` type — `bluebook-law-review` (lines 97–99):
   ```
   <if type="legal_case legislation" match="any">
     <!-- legal case citations generally do not use URL's -->
   </if>
   ```

### AGLC (Australian Guide to Legal Citation) corroboration

**Source:** `M:/Coding_Projects/_zotero-research/styles/australian-guide-to-legal-citation.csl` (lines 514–519, 531–543)

The AGLC style uses similar variables for cases:
- `authority` + `number` + `issued` → medium-neutral citation: `[2023] HCA 1`
- `volume` + `container-title form="short"` + `page` → traditional citation: `(2023) 220 CLR 300`
- Comment at line 543: "only cases with a Medium Neutral Citation have a docket number"

This confirms the pattern that legal CSL styles consistently rely on `authority`, `number`, `volume`, `container-title`, `page`, and `issued`.

---

## 2. Juris-M / MLZ vs standard Zotero: extra legal fields

**Sources:**
- `gh api repos/Juris-M/zotero-schema/contents/schema-jurism.json` (Juris-M extended schema)
- `gh api repos/Juris-M/zotero-schema/contents/schema-jurism-patch.json` (patch definitions)
- `gh api repos/Juris-M/zotero/contents/chrome/content/zotero/xpcom/jurismMapExtensions.js`
- `gh api repos/Juris-M/zotero/contents/chrome/content/zotero/xpcom/jurisAbbrev.js`

### Standard Zotero 'case' fields (15 fields)

**Source:** `M:/Coding_Projects/_zotero-research/zotero/resource/schema/global/schema.json`

```
caseName, abstractNote, court, dateDecided, docketNumber, reporter,
reporterVolume, firstPage, history, DOI, citationKey, url, accessDate,
shortTitle, language, rights, extra
```

### Juris-M 'case' extra fields (32 total, 17 added)

**Source:** Juris-M `schema-jurism.json`, confirmed in `schema-jurism-patch.json`

| Added field | CSL mapping | Purpose |
|---|---|---|
| `jurisdiction` | `jurisdiction` | Geographic/political jurisdiction |
| `division` | `division` | Court division (e.g., Appellate Division) |
| `documentName` | `document-name` | Document name within proceeding |
| `documentNumber` | `publication-number` | Document number |
| `yearAsVolume` | `collection-number` | Year used as volume (common outside US) |
| `adminFlag` | `admin-flag` | Administrative flag marker |
| `reign` | `genre` | Regnal year (UK historical) |
| `supplementName` | `supplement` | Supplement name |
| `publicationDate` | `publication-date` | Separate publication date |
| `filingDate` | `submitted` | Date filed/submitted |
| `place` | `publisher-place` | Place of publication |
| `issue` | `issue` | Issue number |
| `archive` | `archive` | Archive name |
| `archiveLocation` | `archive_location` | Archive location |
| `callNumber` | `call-number` | Call number |
| `DOI` | `DOI` | DOI |
| `publisher` | `publisher` | Publisher |

### Abbreviation machinery (Juris-M only)

**Source:** `jurisAbbrev.js` — Juris-M has a complete abbreviation system:

- Loads `juris-*.json` files from `Zotero.getJurisAbbrevsDirectory()`
- `Zotero.JurisAbbrevs` class with `get(id)` method
- `Zotero.JurisAbbrev` class for individual abbreviation sets
- Version tracking via `versions.json`

**Source:** `jurismMapExtensions.js` — Juris-M also provides:
- `Zotero.Jurism.CSL.FORCE_REMAP` — remaps certain Zotero fields to different CSL variables
- `Zotero.Jurism.CSL.FORCE_FIELD_CONTENT` — forces field content for certain types
- `Zotero.Jurism.PATCH` — patches CSL type, creator, field, and date mappings at runtime

### Verdict: what standard Zotero lacks

Standard Zotero **does not have**:
1. `jurisdiction` field (very useful for legal cases)
2. `division` field
3. `yearAsVolume` (required for non-US citations where year is the volume)
4. Any abbreviation system (no `jurisAbbrev.js` equivalent)
5. `Zotero.Jurism` patch mechanism for CSL mapping
6. Extended CSL date types (`publication-date`, `filing-date`)

Standard Zotero **already has** (and a translator should populate):
- `court` (→ `authority`) — MUST contain Bluebook abbreviation
- `reporter` (→ `container-title`) — MUST contain Bluebook abbreviation
- `reporterVolume` (→ `volume`) — the volume number
- `firstPage` (→ `page`) — starting page
- `docketNumber` (→ `number`) — docket number
- `dateDecided` (→ `issued`) — decision date
- `caseName` (→ `title`) — party names

**Key insight for Westlaw feature:** All fields needed for a clean Bluebook citation of US federal/state cases already exist in standard Zotero. The challenge is getting Westlaw data into the correct fields with proper abbreviations. Juris-M provides additional fields useful for non-US or civil-law jurisdictions, but these are not required for basic US Bluebook compliance.

---

## 3. Translator dev & contribution workflow

**Sources:**
- `M:/Coding_Projects/_zotero-research/translators/.github/workflows/ci.yml` (CI pipeline)
- `M:/Coding_Projects/_zotero-research/translators/.ci/pull-request-check/` (test infrastructure)
- `M:/Coding_Projects/_zotero-research/translators/.ci/eslint-plugin-zotero-translator/` (lint rules)
- `M:/Coding_Projects/_zotero-research/translators/.ci/helper.sh` (helper functions)
- `M:/Coding_Projects/_zotero-research/translators/.ci/constants.mjs` (shared constants)
- `M:/Coding_Projects/_zotero-research/translators/.ci/lint.sh` (lint runner)
- `M:/Coding_Projects/_zotero-research/translate/src/repo.js` (update mechanism)
- `M:/Coding_Projects/_zotero-research/zotero/chrome/content/scaffold/` (Scaffold)

### Creating a translator: Scaffold

**Source:** `M:/Coding_Projects/_zotero-research/zotero/chrome/content/scaffold/translators.js`

1. Open Zotero desktop → Tools → Translator Editor (Scaffold)
2. Scaffold generates a translator skeleton with:
   - Unique `translatorID` (UUID v4)
   - `translatorType` bitmask (web=4)
   - `label`, `target` regex pattern
   - License block (AGPL)
3. Developer writes `detectWeb()`, `doWeb()`, and supporting functions
4. Scaffold provides a live test panel to run the translator against URLs

**Source:** `chrome/content/scaffold/zoteroWebTranslationEnvironment.mjs` — Scaffold includes a full translation environment for testing.

### Translator file format

Required header fields (from `translate/src/translator.js` lines 30–35):
```javascript
var TRANSLATOR_REQUIRED_PROPERTIES = ["translatorID", "translatorType", "label", "creator",
    "target", "priority", "lastUpdated"];
var TRANSLATOR_OPTIONAL_PROPERTIES = ["targetAll", "browserSupport", "minVersion", "maxVersion",
    "inRepository", "configOptions", "displayOptions",
    "hiddenPrefs", "itemType", "proxy"];
```

The `browserSupport` string uses single-letter codes: `g`=Gecko, `c`=Chrome, `s`=Safari, `i`=IE, `b`=Bookmarklet, `v`=Server.

### Test case format

**Source:** `M:/Coding_Projects/_zotero-research/translators/.ci/eslint-plugin-zotero-translator/lib/rules/test-cases.js`

Test cases are embedded at the bottom of each translator JS file:
```javascript
/** BEGIN TEST CASES **/
var testCases = [
    {
        "type": "web",           // "web", "import", or "search"
        "url": "https://...",    // URL for web tests
        "items": "multiple",     // or array of expected items
        "items": [
            {
                "itemType": "case",
                "caseName": "...",
                "creators": [...],
                // expected field values
            }
        ]
    }
];
/** END TEST CASES **/
```

### ESLint rules (custom plugin)

**Source:** `M:/Coding_Projects/_zotero-research/translators/.ci/eslint-plugin-zotero-translator/lib/rules/`

| Rule | Description |
|---|---|
| `test-cases.js` | Validates test case structure (type, url, items), no trailing semicolon, no trailing code |
| `translator-framework.js` | Detects deprecated Translator Framework usage |
| `header-valid-json.js` | Validates translator JSON header parses |
| `header-translator-id.js` | Ensures unique translatorID (no conflicts) |
| `header-translator-type.js` | Checks detectWeb/doWeb vs translatorType consistency |
| `header-last-updated.js` | Verifies lastUpdated timestamp changed |
| `license.js` | Ensures AGPL license block present |
| `no-for-each.js` | Prefers for-of over forEach |
| `not-executable.js` | Ensures .js files are not executable |
| `prefer-index-of.js` | Prefers includes() over indexOf() |
| `robust-query-selector.js` | Ensures safe querySelector usage |

### CI pipeline

**Source:** `M:/Coding_Projects/_zotero-research/translators/.github/workflows/ci.yml`

On every push and PR:
1. Fetches origin/master for diff detection
2. Sets up Node 22 + Chromium (playwright)
3. Builds the Chrome connector from source with the changed translators
4. Launches a Chromium browser with the custom connector loaded
5. Opens `testTranslators.html` page in the extension
6. Runs web tests for all changed translators (plus any that depend on them)
7. Runs `checkDeletedTxt.sh` to ensure deleted translators are tracked
8. Runs `lint.sh` (ESLint with custom Zotero translator rules)

**Limitation for login-walled sites:** The CI runs a real browser but cannot authenticate to paywalled/proxied sites like Westlaw or Lexis+. Translators for such sites either have empty test arrays or will get skipped/timeout in CI.

### How login-walled translators handle tests

**Source:** `M:/Coding_Projects/_zotero-research/translators/Lexis+.js` (line 262–263)
```javascript
var testCases = [
]
```
Empty test array — no test cases can run without authentication.

**Source:** `M:/Coding_Projects/_zotero-research/translators/WestLaw UK.js` (lines 139–172)
```javascript
var testCases = [
    {
        "type": "web",
        "url": "https://uk.westlaw.com/Document/...",
        "items": [
            {
                "itemType": "case",
                "caseName": "Parker-Tweedale v Dunbar Bank Plc (No.1)",
                ...
```
WestLaw UK has real test URLs but they require authentication — they will fail in CI. Acceptable practice documented in CI code: failures from login-walled tests are noted but do not block PRs.

**Source:** `M:/Coding_Projects/_zotero-research/translators/.ci/pull-request-check/browser-test.mjs` (line 148–150): tests timeout after 5 minutes.

### PR review expectations

From the CI error message (browser-test.mjs lines 75–85):
- Translators must be created via Scaffold (not AI-generated structure)
- Must have valid UUID
- Must have proper header format
- Linting must pass
- License block required (AGPL)
- lastUpdated must be incremented
- testCases format must be valid
- For deleted translators, entry must be added to `deleted.txt` with incremented version

### Deployment to users

**Source:** `M:/Coding_Projects/_zotero-research/translate/src/zotero.js` (lines 36–39)
```javascript
REPOSITORY_URL: 'https://www.zotero.org/repo/',
REPOSITORY_CHECK_INTERVAL: 86400, // 24 hours
REPOSITORY_RETRY_INTERVAL: 3600, // 1 hour
REPOSITORY_CHANNEL: 'trunk',
```

**Update path:**
1. PR merged to `master` branch of `zotero/translators`
2. Translators are published to `https://www.zotero.org/repo/` (mechanism: Zotero server-side sync, likely triggered by git hook)
3. Connector checks every 24h: `Zotero.Repo.getTranslatorMetadataFromServer()` (`repo.js` line 70)
4. Desktop checks via `/ping` response — translator hash mismatch triggers `Zotero.Translators.updateFromRemote()` (`connector.js` lines 121–128)
5. Reset Translators button in connector prefs forces full re-fetch

**Desktop bundle:** Zotero desktop ships bundled translators at `M:/Coding_Projects/_zotero-research/zotero/translators/` as a git submodule. These are updated with each desktop release.

---

## 4. Local translator testing workflow

### Desktop: Scaffold (Tools → Translator Editor)

**Source:** `M:/Coding_Projects/_zotero-research/zotero/chrome/content/scaffold/`

1. Open Scaffold → create new web translator
2. Fill in:
   - Translator type: web
   - Browser support: gcsibv
   - Target URL regex pattern
3. Scaffold loads translators from `scaffold.translatorsDir` preference (configurable in Zotero prefs)
4. Test panel:
   - Enter a URL → click "Run" → translator executes in sandbox
   - Shows detected items with field-by-field diff
   - Can iterate by editing code and re-running
5. When satisfied, Scaffold compiles into a `.js` file with JSON header

### Connector: Loading custom translators

**Source:** `M:/Coding_Projects/_zotero-research/zotero-connectors/src/common/translators.js`, `/src/browserExt/prefs.js`

1. **Direct file method (Scaffold):** Set Scaffold's translators directory to your working directory. Scaffold loads `.js` files directly.

2. **Connector "Reset Translators" button:**
   - Preferences → Advanced → Reset Translators
   - Forces re-fetch from repository
   - Clears locally cached translator code

3. **Connector preferences menu:** The connector stores translators in browser sync storage as `translatorCode_<UUID>` keys. These are only updated via the update-from-remote mechanism.

4. **Chrome extension test mode (CI):** Build with `-d` flag:
   ```bash
   ./build.sh -p b -d    # debug build, enables testTranslators page
   ```

5. **testTranslators.html page:** Available in debug builds at:
   `chrome-extension://<EXTENSION_ID>/tools/testTranslators/testTranslators.html`
   Pass `?translators=<UUID1>,<UUID2>` to test specific translators.

### Debug options

- **`debug.js`** in translate framework: `Zotero.debug()` calls can be enabled
- **Connector console logging:** Set `extensions.zotero.debug.logging` pref to see debug output in browser console
- **Scaffold previews:** `scaffoldItemPreview.js` provides a side-by-side diff of expected vs actual items
- **Sandbox:** `translation/sandboxManager.js` — translators run in a restricted sandbox; Scaffold provides tighter integration

---

## Key facts

- **Zotero 'case' item type maps to CSL `legal_case`** — confirmed in schema.json CSL_TYPE_MAPPINGS
- **Three Zotero fields are critical for Bluebook formatting:** `court` (→ `authority`), `reporter` (→ `container-title`), `reporterVolume` (→ `volume`), plus `caseName` (→ `title`) and `dateDecided` (→ `issued`)
- **Bluebook requires abbreviated court names** — Zotero has no auto-abbreviation; the translator must supply the correct abbreviation
- **Standard Zotero lacks `jurisdiction`, `division`, `yearAsVolume` fields** — Juris-M adds these plus a full abbreviation system
- **WestLaw UK translator already exists** with working `scrapeCase()` function and test cases (login-gated)
- **Lexis+ translator exists** but has empty test cases array (login-gated, no CI tests)
- **Login-walled translators are allowed** in the repo with empty test arrays — CI skips them
- **Translators deploy via zotero.org/repo** on a 24h check cycle; desktop also ships them bundled
- **Scaffold is mandatory for translator creation** — AI-generated structure is explicitly discouraged in CI messages
- **ESLint enforces 11 custom rules** on PRs including header validation, license, test case structure
- **CI uses real Chromium/Playwright** to run web tests against the built connector
- **`Id.` support in Bluebook CSL is partial** — CSL lacks repeat-count logic needed for proper Bluebook `id.` behavior

## Open questions / unknowns

1. **How does Westlaw (US) currently save in Zotero?** — The US Westlaw site (`westlaw.com`) has no translator. Need to verify what URL pattern it uses and whether it gets caught by a generic translator (e.g., Embedded Metadata) that saves as webpage/document rather than case. This determines whether the existing WestLaw UK translator needs a US counterpart or a unified Westlaw translator.

2. **Westlaw data availability** — What structured data does Westlaw US expose in its HTML/JSON-LD? Does it include properly abbreviated court names, reporter names, etc., or would the translator need to perform abbreviation mapping?

3. **Thomson Reuters Westlaw URL patterns** — Need to confirm US Westlaw case page URLs to set the `target` regex. UK Westlaw uses `^https://uk\.westlaw\.com/Document/`. US Westlaw may differ.

4. **Embedded Metadata (EM) detection** — Westlaw pages may embed Dublin Core, Highwire, or other metadata that would be caught by the EM translator before a custom Westlaw translator. Need to check priority and target patterns.

5. **Parallel citation handling** — Is this needed for a first version? CSL/Bluebook styles in this repo don't handle it; Juris-M style modules may.

6. **Juris-M compatibility** — Should a Westlaw translator be compatible with Juris-M's extra fields? If the translator populates standard fields only, Juris-M users won't get the benefit of its extra legal fields.

7. **Test case strategy** — Since Westlaw is login-walled, what's the approach? Empty testCases (like Lexis+)? Or use snapshot attachments as expected output (like WestLaw UK does)?

8. **Citation format variations** — Does the user want Bluebook (federal), ALWD, California Style Manual, or state-specific formats? The translator should populate fields correctly regardless; the CSL style determines output format.

## Implications for a Westlaw case-citation feature

**Observations only — not a design or plan:**

1. **A new US Westlaw translator is feasible** using the existing WestLaw UK translator as a template. The `target` regex would need to match US Westlaw URLs.

2. **The critical fields to populate** for clean Bluebook output are:
   - `itemType` = `"case"` (most important — prevents webpage fallback)
   - `caseName` = full party names as "Plaintiff v. Defendant"
   - `court` = Bluebook abbreviation (e.g., "U.S." not "Supreme Court of the United States")
   - `reporter` = Bluebook abbreviation (e.g., "U.S." for United States Reports)
   - `reporterVolume` = volume as integer
   - `firstPage` = starting page
   - `dateDecided` = year (or full date; CSL extracts year)
   - `docketNumber` = docket number (e.g., "No. 20-1234")
   - `author` creator = either empty (creators not displayed by Bluebook) or populated with parties

3. **Court name abbreviation is the hardest part** — Westlaw may provide full court names. A mapping table from full name → Bluebook abbreviation will likely be needed. This is a known challenge (same for Lexis+).

4. **Priority must be higher** than Embedded Metadata (EM) translator (UUID `951c027d-74ac-47d4-a107-9c3069ab7b48`) to prevent Westlaw pages from being caught by EM first.

5. **Test cases will be empty** (like Lexis+) since Westlaw is login-walled. This is accepted practice.

6. **The feature is purely about the translator** — no changes needed to Zotero desktop, CSL styles, or schema. Standard Zotero 15 fields for `case` are sufficient for US Bluebook citations.

7. **Juris-M users** would get basic functionality but not the extra fields (`jurisdiction`, `division`) unless the translator specifically populates them via `extra` field or checks for Juris-M's extended schema.

8. **Deployment timeline:** A translator PR could be merged and deployed to all users within weeks (next desktop release for bundled translators; same-day for connector auto-update).
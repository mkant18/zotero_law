import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { render } from '../harness/render.mjs';

const items = JSON.parse(
  readFileSync(new URL('../fixtures/items.json', import.meta.url), 'utf-8')
);
const expected = JSON.parse(
  readFileSync(new URL('../fixtures/expected.json', import.meta.url), 'utf-8')
);

it('lead opinion author stays in CSL metadata without changing Bluebook case citation', () => {
  const item = structuredClone(items.find(item => item.uri === 'G1'));
  assert.ok(item);
  const baseline = render([item], [[{ id: 'G1' }]])[0];
  item.creators = [{ creatorType: 'author', lastName: 'BROOKSHIRE', fieldMode: 1 }];
  const withAuthor = render([item], [[{ id: 'G1' }]])[0];
  assert.equal(withAuthor.text, baseline.text);
  assert.equal(withAuthor.html, baseline.html);
  assert.equal(withAuthor.cslJSON[0].author[0].literal, 'BROOKSHIRE');
});

// Helper: compare actual cite text against expected, normalizing U+2019→'
// and accepting an optional trailing period added by the style's layout suffix.
function eqCite(actual, expected) {
  const normalized = actual.replace(/\u2019/g, "'");
  return normalized === expected || normalized === expected + '.';
}

// Helper: render a single cluster and return the text.
function renderCluster(itemIds, clusterItems) {
  const result = render(items, [clusterItems]);
  return result[0].text;
}

// Helper: render a single cluster and return the html.
function renderClusterHtml(itemIds, clusterItems) {
  const result = render(items, [clusterItems]);
  return result[0].html;
}

// Helper: get CSL-JSON for a specific item by uri.
function getCslJSON(uri) {
  const result = render(items, [[{ id: uri }]]);
  return result[0].cslJSON.find((item) => item.id === uri);
}

// ---------------------------------------------------------------------------
// E-string tests
// ---------------------------------------------------------------------------

describe('E-string rendering', () => {
  it('E1: first cite G1', () => {
    const text = renderCluster(items, [{ id: 'G1' }]);
    assert.ok(eqCite(text, expected.E1), `E1: expected ${expected.E1} got ${text}`);
  });

  it('E2: first cite G1 with locator', () => {
    const text = renderCluster(items, [{ id: 'G1', locator: '490' }]);
    assert.ok(eqCite(text, expected.E2), `E2: expected ${expected.E2} got ${text}`);
  });

  it('E3: subsequent G1 with locator (after intervening cite)', () => {
    const result = render(items, [
      [{ id: 'G1' }],
      [{ id: 'G4' }],
      [{ id: 'G1', locator: '490' }]
    ]);
    assert.ok(eqCite(result[2].text, expected.E3), `E3: expected ${expected.E3} got ${result[2].text}`);
  });

  it('E4: subsequent G1 no locator (after intervening cite)', () => {
    const result = render(items, [
      [{ id: 'G1' }],
      [{ id: 'G4' }],
      [{ id: 'G1' }]
    ]);
    assert.ok(eqCite(result[2].text, expected.E4), `E4: expected ${expected.E4} got ${result[2].text}`);
  });

  it('E5: ibid G1', () => {
    const result = render(items, [
      [{ id: 'G1' }],
      [{ id: 'G1' }]
    ]);
    assert.ok(eqCite(result[1].text, expected.E5), `E5: expected ${expected.E5} got ${result[1].text}`);
  });

  it('E6: ibid-with-locator G1', () => {
    const result = render(items, [
      [{ id: 'G1' }],
      [{ id: 'G1', locator: '491' }]
    ]);
    assert.ok(eqCite(result[1].text, expected.E6), `E6: expected ${expected.E6} got ${result[1].text}`);
  });

  it('E7: first cite G5 (genre: writ denied)', () => {
    const text = renderCluster(items, [{ id: 'G5' }]);
    assert.ok(eqCite(text, expected.E7), `E7: expected ${expected.E7} got ${text}`);
  });

  it('E8: first cite G5h (with history/references)', () => {
    const text = renderCluster(items, [{ id: 'G5h' }]);
    assert.ok(eqCite(text, expected.E8), `E8: expected ${expected.E8} got ${text}`);
  });

  it('E9: subsequent G5h with locator', () => {
    const result = render(items, [
      [{ id: 'G5h' }],
      [{ id: 'G1' }],
      [{ id: 'G5h', locator: '791' }]
    ]);
    assert.ok(eqCite(result[2].text, expected.E9), `E9: expected ${expected.E9} got ${result[2].text}`);
  });

  it('E10: first cite G7 with locator (WL-primary)', () => {
    const text = renderCluster(items, [{ id: 'G7', locator: '*4' }]);
    assert.ok(eqCite(text, expected.E10), `E10: expected ${expected.E10} got ${text}`);
  });

  it('E11: first cite G7 no locator (separate document/sequence)', () => {
    const text = renderCluster(items, [{ id: 'G7' }]);
    assert.ok(eqCite(text, expected.E11), `E11: expected ${expected.E11} got ${text}`);
  });

  it('E12: subsequent G7 with locator', () => {
    const result = render(items, [
      [{ id: 'G7' }],
      [{ id: 'G1' }],
      [{ id: 'G7', locator: '*4' }]
    ]);
    assert.ok(eqCite(result[2].text, expected.E12), `E12: expected ${expected.E12} got ${result[2].text}`);
  });

  it('E13: ibid-with-locator G7', () => {
    const result = render(items, [
      [{ id: 'G7' }],
      [{ id: 'G7', locator: '*5' }]
    ]);
    assert.ok(eqCite(result[1].text, expected.E13), `E13: expected ${expected.E13} got ${result[1].text}`);
  });

  it('E14: first cite G7s (WL-primary)', () => {
    const text = renderCluster(items, [{ id: 'G7s' }]);
    assert.ok(eqCite(text, expected.E14), `E14: expected ${expected.E14} got ${text}`);
  });

  it('E15: first cite G7j (WL-primary)', () => {
    const text = renderCluster(items, [{ id: 'G7j' }]);
    assert.ok(eqCite(text, expected.E15), `E15: expected ${expected.E15} got ${text}`);
  });

  it('E16: first cite G4 (no medium)', () => {
    const text = renderCluster(items, [{ id: 'G4' }]);
    assert.ok(eqCite(text, expected.E16), `E16: expected ${expected.E16} got ${text}`);
  });

  it('E17: first cite G2 (with history/references)', () => {
    const text = renderCluster(items, [{ id: 'G2' }]);
    assert.ok(eqCite(text, expected.E17), `E17: expected ${expected.E17} got ${text}`);
  });

  it('E18: first cite G3 with locator', () => {
    const text = renderCluster(items, [{ id: 'G3', locator: '495' }]);
    assert.ok(eqCite(text, expected.E18), `E18: expected ${expected.E18} got ${text}`);
  });

  it('E19: cluster [G1, G4] (two items)', () => {
    const text = renderCluster(items, [{ id: 'G1' }, { id: 'G4' }]);
    assert.ok(eqCite(text, expected.E19), `E19: expected ${expected.E19} got ${text}`);
  });

  it('E20: first cite GX', () => {
    const text = renderCluster(items, [{ id: 'GX' }]);
    assert.ok(eqCite(text, expected.E20), `E20: expected ${expected.E20} got ${text}`);
  });

  it('E21: subsequent G2 with locator (after intervening cite)', () => {
    const result = render(items, [
      [{ id: 'G2' }],
      [{ id: 'G1' }],
      [{ id: 'G2', locator: '15' }]
    ]);
    assert.ok(eqCite(result[2].text, expected.E21), `E21: expected ${expected.E21} got ${result[2].text}`);
  });
});

// ---------------------------------------------------------------------------
// H-string tests (HTML output)
// ---------------------------------------------------------------------------

describe('H-string HTML assertions', () => {
  it('H1a: E3 html italicizes short name (<i>Sanchez</i>)', () => {
    const result = render(items, [
      [{ id: 'G1' }],
      [{ id: 'G4' }],
      [{ id: 'G1', locator: '490' }]
    ]);
    const html = result[2].html;
    assert.ok(html.includes('<i>Sanchez</i>'), 'E3 html should contain <i>Sanchez</i>');
  });

  it('H1b: E5 html italicizes Id.', () => {
    const result = render(items, [
      [{ id: 'G1' }],
      [{ id: 'G1' }]
    ]);
    const html = result[1].html;
    assert.ok(html.includes('<i>Id.</i>'), 'E5 html should contain <i>Id.</i>');
  });

  it('H1c: E1 html does NOT italicize the full case name', () => {
    const result = render(items, [[{ id: 'G1' }]]);
    const html = result[0].html;
    // The full case name "Sanchez v. Liggett & Myers, Inc." should NOT be wrapped in <i>
    assert.ok(
      !html.includes('<i>Sanchez v. Liggett & Myers, Inc.</i>'),
      'E1 html should NOT italicize the full case name'
    );
  });

  it('H2: G2i first cite — plain text equals E17, html contains <i> from history', () => {
    const result = render(items, [[{ id: 'G2i' }]]);
    const html = result[0].html;
    const text = result[0].text;

    // citeproc passes <i> through from the history field into html
    const hasIInHtml = html.includes('<i>aff\u2019d in part, vacated in part</i>');
    assert.equal(hasIInHtml, true, 'H2: html should contain <i>aff\u2019d in part, vacated in part</i> from history');

    // Plain text should contain no <i> tags
    assert.ok(!text.includes('<i>'), 'G2i plain text should not contain <i> tags');

    // Plain text should equal E17 text (allowing trailing period from layout suffix)
    assert.ok(eqCite(text, expected.E17), `H2: expected ${expected.E17} got ${text}`);
  });
});

// ---------------------------------------------------------------------------
// C-string tests (CSL-JSON assertions)
// ---------------------------------------------------------------------------

describe('C-string CSL-JSON assertions', () => {
  it('C1: CSL-JSON field checks', () => {
    const g7 = getCslJSON('G7');
    const g4 = getCslJSON('G4');
    const g1 = getCslJSON('G1');
    const g5 = getCslJSON('G5');
    const g2 = getCslJSON('G2');

    // G7 has medium — may be in cslJSON.medium or in note field via citeproc's field hack
    const g7MediumInNote = /^medium: Westlaw$/im.test(g7.note || '');
    assert.ok(
      g7.medium === 'Westlaw' || g7MediumInNote,
      `C1: G7 medium should be Westlaw (in cslJSON.medium=${g7.medium !== undefined} or note=${g7MediumInNote})`
    );

    // G4 and G1 do NOT have medium in either cslJSON.medium or note
    assert.equal(g4.medium, undefined, 'G4 should not have medium in cslJSON');
    assert.ok(!/^medium:/im.test(g4.note || ''), 'G4 should not have medium line in note');
    assert.equal(g1.medium, undefined, 'G1 should not have medium in cslJSON');
    assert.ok(!/^medium:/im.test(g1.note || ''), 'G1 should not have medium line in note');

    // G5 has genre: "writ denied" — may be in cslJSON.genre or in note field via citeproc's field hack
    const g5GenreInNote = /^genre: writ denied$/im.test(g5.note || '');
    assert.ok(
      g5.genre === 'writ denied' || g5GenreInNote,
      `C1: G5 genre should be writ denied (in cslJSON.genre=${g5.genre !== undefined} or note=${g5GenreInNote})`
    );

    // G2 has references
    assert.ok(g2.references, 'G2 should have references');

    // G1 has number (docket number)
    assert.equal(g1.number, 'No. 98-40679');

    // G1 has full issued date parts [1999, 8, 25]
    assert.ok(g1.issued, 'G1 should have issued date');
    const issuedParts = g1.issued['date-parts'];
    assert.deepEqual(issuedParts, [[1999, 8, 25]]);
  });

  it('C2: Diagnostic Extra lines do not create CSL variables for G1', () => {
    const g1 = getCslJSON('G1');
    const allowedKeys = new Set([
      'id', 'type', 'authority', 'container-title', 'note', 'number',
      'page', 'title', 'title-short', 'volume', 'issued'
    ]);
    const actualKeys = Object.keys(g1);
    const unexpectedKeys = actualKeys.filter((k) => !allowedKeys.has(k));
    assert.equal(
      unexpectedKeys.length,
      0,
      `C2: G1 has unexpected CSL-JSON keys: ${unexpectedKeys.join(', ')}`
    );
    const wlKeys = actualKeys.filter(
      (k) => k.startsWith('westlaw') || k.includes('wl')
    );
    assert.equal(
      wlKeys.length,
      0,
      `C2: G1 CSL-JSON keys must not start with "westlaw" or contain "wl": ${wlKeys.join(', ')}`
    );
  });

  it('C3: Rendered text never contains WL for G1/G4 and never contains docket-like text for G5', () => {
    const resultG1 = render(items, [[{ id: 'G1' }]]);
    const resultG4 = render(items, [[{ id: 'G4' }]]);
    const resultG5 = render(items, [[{ id: 'G5' }]]);

    assert.ok(!resultG1[0].text.includes('WL'), 'G1 rendered text should not contain WL');
    assert.ok(!resultG4[0].text.includes('WL'), 'G4 rendered text should not contain WL');
    assert.ok(!resultG1[0].text.includes('No. 98-40679'), 'G1 rendered text should not contain docket');
    assert.ok(!resultG5[0].text.includes('No.'), 'G5 rendered text should not contain docket-like text');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loadModules } from './helpers/load.mjs';
import { render } from '../../m0/csl/harness/render.mjs';
import { G1, G2, G3, G4, G5, G7 } from './fixtures/golden-inputs.mjs';

const ctx = loadModules([
  'text.js', 'reporters.js', 'cite-parse.js', 'profile.js',
  'service.js', 'dom.js', 'map.js', 'reconcile.js'
]);

const wlRecReconcile = ctx.wlRecReconcile;
const wlMapToZoteroFields = ctx.wlMapToZoteroFields;
const wlMapValidateOutgoing = ctx.wlMapValidateOutgoing;

// Same comparison helper as render.test.mjs: normalize U+2019→' and accept trailing "."
function eqCite(actual, expected) {
  const normalized = actual.replace(/\u2019/g, "'");
  return normalized === expected || normalized === expected + '.';
}

function pipeline(goldenInput, uri) {
  const rec = wlRecReconcile(goldenInput);
  const fields = wlMapToZoteroFields(rec);
  const item = { ...fields, uri };
  return { rec, fields, item };
}

function renderText(items, cluster) {
  return render(items, [cluster])[0].text;
}

function renderTexts(items, clusters) {
  // clusters must be an array of arrays: [[{id:'G1'}], [{id:'G4'}], ...]
  return render(items, clusters).map(r => r.text);
}

function assertNoWestlaw(text, label) {
  assert.ok(!text.includes('Westlaw'), `${label}: rendered text must not contain "Westlaw" (got: ${text})`);
}

function assertNoDocket(text, label) {
  assert.ok(!text.includes('No. '), `${label}: rendered text must not contain "No. " docket (got: ${text})`);
}

function assertNoWL(text, label) {
  assert.ok(!text.includes('WL'), `${label}: rendered text must not contain "WL" (got: ${text})`);
}

// ---- G1 Sanchez ----
describe('G1 Sanchez — first cite no locator', () => {
  const { item, rec } = pipeline(G1, 'G1');
  const text = renderText([item], [{ id: 'G1' }]);
  it('equals E1', () => {
    assert.ok(eqCite(text, 'Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)'));
  });
  it('status is validated-profile', () => { assert.equal(rec.status, 'validated-profile'); });
  it('wlMapValidateOutgoing passes', () => {
    const v = wlMapValidateOutgoing(wlMapToZoteroFields(rec));
    assert.equal(v.ok, true, JSON.stringify(v.problems));
  });
  it('rendered text contains no Westlaw', () => { assertNoWestlaw(text, 'G1'); });
  it('rendered text contains no No. docket', () => { assertNoDocket(text, 'G1'); });
  it('rendered text contains no WL', () => { assertNoWL(text, 'G1'); });
});

describe('G1 Sanchez — pin @490 → E2', () => {
  const { item } = pipeline(G1, 'G1');
  const text = renderText([item], [{ id: 'G1', locator: '490' }]);
  it('equals E2', () => {
    assert.ok(eqCite(text, 'Sanchez v. Liggett & Myers, Inc., 187 F.3d 486, 490 (5th Cir. 1999)'));
  });
});

describe('G1 Sanchez — subsequent @490 after intervening G4 → E3', () => {
  const { item: g1Item } = pipeline(G1, 'G1');
  const { item: g4Item } = pipeline(G4, 'G4');
  it('equals E3', () => {
    const texts = renderTexts([g1Item, g4Item], [
      [{ id: 'G1' }],
      [{ id: 'G4' }],
      [{ id: 'G1', locator: '490' }]
    ]);
    assert.ok(eqCite(texts[2], 'Sanchez, 187 F.3d at 490'));
  });
});

describe('G1 Sanchez — Id. [G1],[G1 @491] → E6', () => {
  const { item } = pipeline(G1, 'G1');
  it('equals E6', () => {
    const texts = renderTexts([item, item], [
      [{ id: 'G1' }],
      [{ id: 'G1', locator: '491' }]
    ]);
    assert.ok(eqCite(texts[1], 'Id. at 491'));
  });
});

// ---- G2 Philip Morris ----
describe('G2 Philip Morris — first cite → E17', () => {
  const { item, rec } = pipeline(G2, 'G2');
  const text = renderText([item], [{ id: 'G2' }]);
  it('equals E17', () => {
    assert.ok(eqCite(text, 'United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff\'d in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)'));
  });
  it('wlMapValidateOutgoing passes', () => {
    const v = wlMapValidateOutgoing(wlMapToZoteroFields(rec));
    assert.equal(v.ok, true, JSON.stringify(v.problems));
  });
  it('rendered text contains no Westlaw', () => { assertNoWestlaw(text, 'G2'); });
  it('rendered text contains no No. docket', () => { assertNoDocket(text, 'G2'); });
  it('rendered text contains no WL', () => { assertNoWL(text, 'G2'); });
});

describe('G2 Philip Morris — subsequent @15 after intervening G1 → E21', () => {
  const { item: g1Item } = pipeline(G1, 'G1');
  const { item: g2Item } = pipeline(G2, 'G2');
  it('equals E21', () => {
    const texts = renderTexts([g2Item, g1Item, { ...g2Item, uri: 'G2', locator: '15' }], [
      [{ id: 'G2' }],
      [{ id: 'G1' }],
      [{ id: 'G2', locator: '15' }]
    ]);
    assert.ok(eqCite(texts[2], 'Philip Morris USA, Inc., 449 F. Supp. 2d at 15'));
  });
});

// ---- G3 Brown (synthetic SCOTUS) ----
describe('G3 Brown — first cite', () => {
  const { item, rec } = pipeline(G3, 'G3');
  const text = renderText([item], [{ id: 'G3' }]);
  it('equals Brown first-cite string', () => {
    assert.ok(eqCite(text, 'Brown v. Bd. of Educ., 347 U.S. 483 (1954)'));
  });
  it('wlMapValidateOutgoing passes', () => {
    const v = wlMapValidateOutgoing(wlMapToZoteroFields(rec));
    assert.equal(v.ok, true, JSON.stringify(v.problems));
  });
  it('rendered text contains no Westlaw', () => { assertNoWestlaw(text, 'G3'); });
  it('rendered text contains no No. docket', () => { assertNoDocket(text, 'G3'); });
  it('rendered text contains no WL', () => { assertNoWL(text, 'G3'); });
  it('status and review reasons are printed', () => {
    console.log(`G3 status: ${rec.status}, reviewReasons: ${JSON.stringify(rec.reviewReasons)}`);
  });
});

describe('G3 Brown — pin @495 → E18', () => {
  const { item } = pipeline(G3, 'G3');
  const text = renderText([item], [{ id: 'G3', locator: '495' }]);
  it('equals E18', () => {
    assert.ok(eqCite(text, 'Brown v. Bd. of Educ., 347 U.S. 483, 495 (1954)'));
  });
});

// ---- G4 Miele ----
describe('G4 Miele — first cite → E16', () => {
  const { item, rec } = pipeline(G4, 'G4');
  const text = renderText([item], [{ id: 'G4' }]);
  it('equals E16', () => {
    assert.ok(eqCite(text, 'Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)'));
  });
  it('status is validated-profile', () => {
    assert.equal(rec.status, 'validated-profile', `observed="${rec.status}" vs expected="validated-profile"`);
  });
  it('wlMapValidateOutgoing passes', () => {
    const v = wlMapValidateOutgoing(wlMapToZoteroFields(rec));
    assert.equal(v.ok, true, JSON.stringify(v.problems));
  });
  it('rendered text contains no Westlaw', () => { assertNoWestlaw(text, 'G4'); });
  it('rendered text contains no No. docket', () => { assertNoDocket(text, 'G4'); });
  it('rendered text contains no WL', () => { assertNoWL(text, 'G4'); });
});

// ---- G5 Rogers (texas, with history) ----
describe('G5 Rogers — first cite with history → E8', () => {
  const { item, rec } = pipeline(G5, 'G5');
  const text = renderText([item], [{ id: 'G5' }]);
  it('equals E8', () => {
    assert.ok(eqCite(text, 'Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.—Beaumont 1988, writ denied), disapproved of by Triplex Commc\'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)'));
  });
  it('status is validated-profile', () => { assert.equal(rec.status, 'validated-profile'); });
  it('wlMapValidateOutgoing passes', () => {
    const v = wlMapValidateOutgoing(wlMapToZoteroFields(rec));
    assert.equal(v.ok, true, JSON.stringify(v.problems));
  });
  it('rendered text contains no Westlaw', () => { assertNoWestlaw(text, 'G5'); });
  it('rendered text contains no No. docket', () => { assertNoDocket(text, 'G5'); });
  it('rendered text contains no WL', () => { assertNoWL(text, 'G5'); });
});

describe('G5 Rogers — subsequent @791 → E9', () => {
  const { item: g1Item } = pipeline(G1, 'G1');
  const { item: g5Item } = pipeline(G5, 'G5');
  it('equals E9', () => {
    const texts = renderTexts([g5Item, g1Item, { ...g5Item, uri: 'G5', locator: '791' }], [
      [{ id: 'G5' }],
      [{ id: 'G1' }],
      [{ id: 'G5', locator: '791' }]
    ]);
    assert.ok(eqCite(texts[2], 'Rogers, 761 S.W.2d at 791'));
  });
});

// ---- G7 Example (WL-only synthetic) ----
describe('G7 Example — first cite no locator → E11', () => {
  const { item, rec } = pipeline(G7, 'G7');
  const text = renderText([item], [{ id: 'G7' }]);
  it('equals E11', () => {
    assert.ok(eqCite(text, 'Example v. Sample, No. 24-123, 2024 WL 1234567 (D. Kan. Mar. 1, 2024)'));
  });
  it('wlMapValidateOutgoing passes', () => {
    const v = wlMapValidateOutgoing(wlMapToZoteroFields(rec));
    assert.equal(v.ok, true, JSON.stringify(v.problems));
  });
  it('rendered text contains no Westlaw', () => { assertNoWestlaw(text, 'G7'); });
  it('status and review reasons are printed', () => {
    console.log(`G7 status: ${rec.status}, reviewReasons: ${JSON.stringify(rec.reviewReasons)}`);
  });
});

describe('G7 Example — pin @*4 → E10', () => {
  const { item } = pipeline(G7, 'G7');
  const text = renderText([item], [{ id: 'G7', locator: '*4' }]);
  it('equals E10', () => {
    assert.ok(eqCite(text, 'Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)'));
  });
});

describe('G7 Example — subsequent @*4 after intervening G1 → E12', () => {
  const { item: g1Item } = pipeline(G1, 'G1');
  const { item: g7Item } = pipeline(G7, 'G7');
  it('equals E12', () => {
    const texts = renderTexts([g7Item, g1Item, { ...g7Item, uri: 'G7', locator: '*4' }], [
      [{ id: 'G7' }],
      [{ id: 'G1' }],
      [{ id: 'G7', locator: '*4' }]
    ]);
    assert.ok(eqCite(texts[2], 'Example, 2024 WL 1234567, at *4'));
  });
});

// Offline prototype: reconcile synthetic golden cases, map them, render Bluebook text.
// Does not contact Westlaw. Exits 1 if a rendered line drifts from EXPECTED.
import { loadModules } from '../src/test/helpers/load.mjs';
import { G1, G2, G4, G5, G7 } from '../src/test/fixtures/golden-inputs.mjs';
import { render } from '../m0/csl/harness/render.mjs';

var EXPECTED = {
  "G1": "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)",
  "G1-pin": "Sanchez v. Liggett & Myers, Inc., 187 F.3d 486, 490 (5th Cir. 1999)",
  "G1-short": "Sanchez, 187 F.3d at 490",
  "G2": "United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)",
  "G4": "Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)",
  "G5": "Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.\u2014Beaumont 1988, writ denied), disapproved of by Triplex Commc'ns, Inc. v. Riley, 900 S.W.2d 716 (Tex. 1995)",
  "G7": "Example v. Sample, No. 24-123, 2024 WL 1234567 (D. Kan. Mar. 1, 2024)",
  "G7-pin": "Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)",
  "G7-id": "Id. at *5"
};

const ctx = loadModules([
  'text.js', 'reporters.js', 'cite-parse.js', 'profile.js',
  'service.js', 'dom.js', 'map.js', 'reconcile.js'
]);

function prepare(input, id) {
  const rec = ctx.wlRecReconcile(input);
  const fields = ctx.wlMapToZoteroFields(rec, { version: '0.1.0-prototype' });
  return { rec, item: { ...fields, uri: id } };
}

const prepared = {
  G1: prepare(G1, 'G1'),
  G2: prepare(G2, 'G2'),
  G4: prepare(G4, 'G4'),
  G5: prepare(G5, 'G5'),
  G7: prepare(G7, 'G7')
};

function texts(items, clusters) {
  return render(items, clusters).map((row) => row.text);
}

const rows = [];

function printCite(label, text) {
  const shown = text.replace(/\u2019/g, "'");
  rows.push({ label, text: shown });
  process.stdout.write(label + ' ' + shown + '\n');
}

printCite('G1', texts([prepared.G1.item], [[{ id: 'G1' }]])[0]);
printCite('G1-pin', texts([prepared.G1.item], [[{ id: 'G1', locator: '490' }]])[0]);

// Short form needs a prior full cite of G1. G4 is the intervening cite; the pin is the last text.
const g1Short = texts(
  [prepared.G1.item, prepared.G4.item],
  [
    [{ id: 'G1' }],
    [{ id: 'G4' }],
    [{ id: 'G1', locator: '490' }]
  ]
);
printCite('G1-short', g1Short[g1Short.length - 1]);

printCite('G2', texts([prepared.G2.item], [[{ id: 'G2' }]])[0]);
printCite('G4', texts([prepared.G4.item], [[{ id: 'G4' }]])[0]);
printCite('G5', texts([prepared.G5.item], [[{ id: 'G5' }]])[0]);
printCite('G7', texts([prepared.G7.item], [[{ id: 'G7' }]])[0]);
printCite('G7-pin', texts([prepared.G7.item], [[{ id: 'G7', locator: '*4' }]])[0]);

const g7Id = texts(
  [prepared.G7.item],
  [
    [{ id: 'G7', locator: '*4' }],
    [{ id: 'G7', locator: '*5' }]
  ]
);
printCite('G7-id', g7Id[1]);

for (const id of ['G1', 'G2', 'G4', 'G5', 'G7']) {
  process.stdout.write(id + ' status=' + prepared[id].rec.status + '\n');
}

function matches(actual, expected) {
  const normalized = actual.replace(/\u2019/g, "'");
  return normalized === expected || normalized === expected + '.';
}

let failed = false;
for (const row of rows) {
  if (!matches(row.text, EXPECTED[row.label])) {
    process.stderr.write('MISMATCH ' + row.label + '\n');
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'prototype.mjs');

const SUBSTRINGS = [
  'G1 Sanchez v. Liggett & Myers, Inc., 187 F.3d 486 (5th Cir. 1999)',
  'G1-pin Sanchez v. Liggett & Myers, Inc., 187 F.3d 486, 490 (5th Cir. 1999)',
  'G1-short Sanchez, 187 F.3d at 490',
  "G2 United States v. Philip Morris USA, Inc., 449 F. Supp. 2d 1 (D.D.C. 2006), aff'd in part, vacated in part, 566 F.3d 1095 (D.C. Cir. 2009)",
  'G4 Miele v. Am. Tobacco Co., 770 N.Y.S.2d 386 (App. Div. 2003)',
  'G5 Rogers v. R.J. Reynolds Tobacco Co., 761 S.W.2d 788 (Tex. App.\u2014Beaumont 1988, writ denied)',
  'G7 Example v. Sample, No. 24-123, 2024 WL 1234567 (D. Kan. Mar. 1, 2024)',
  'G7-pin Example v. Sample, No. 24-123, 2024 WL 1234567, at *4 (D. Kan. Mar. 1, 2024)',
  'G7-id Id. at *5',
  'G1 status=validated-profile'
];

describe('offline prototype', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  const stdout = result.stdout || '';

  it('exits 0', () => {
    assert.equal(result.status, 0, `status=${result.status} error=${result.error && result.error.code} stderr=${result.stderr}`);
  });

  for (const needle of SUBSTRINGS) {
    it(`stdout includes ${JSON.stringify(needle)}`, () => {
      assert.ok(stdout.includes(needle), stdout);
    });
  }

  it('stdout does not include ResourceToken', () => {
    assert.equal(stdout.includes('ResourceToken'), false);
  });

  it('stdout does not include Westlaw review', () => {
    assert.equal(stdout.includes('Westlaw review'), false);
  });

  it('G1 G2 G4 G5 cite lines have no WL token and no docket', () => {
    const lines = stdout.split(/\r?\n/);
    for (const label of ['G1', 'G2', 'G4', 'G5']) {
      const cite = lines.find((line) => line.startsWith(label + ' ') && !line.startsWith(label + ' status='));
      assert.ok(cite, `missing cite line for ${label}\n${stdout}`);
      assert.equal(cite.includes(' WL '), false, cite);
      assert.equal(cite.includes('No. '), false, cite);
    }
  });
});

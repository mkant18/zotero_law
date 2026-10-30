import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStyle } from '../harness/validate.mjs';

const style = readFileSync(new URL('../bluebook-law-review-westlaw-us.csl', import.meta.url), 'utf8');

it('repaired style passes strict XML, official schema, and macro validation', () => {
  assert.doesNotThrow(() => validateStyle(style));
});

it('missing if end tag fails before citeproc can recover malformed XML', () => {
  assert.throws(() => validateStyle(style.replace('</if>', '')), /Opening and ending tag mismatch/);
});

it('well-formed invalid month identifiers fail official schema validation', () => {
  assert.throws(() => validateStyle(style.replace('name="month-01"', 'name="month"')), /CSL validation failed/);
});

it('undefined macros fail official Schematron validation', () => {
  assert.throws(() => validateStyle(style.replace('macro="source"', 'macro="missing-macro"')), /no corresponding macro/);
});

it('duplicate macro names fail official Schematron validation', () => {
  assert.throws(() => validateStyle(style.replace('</style>', '<macro name="source"><text value="x"/></macro></style>')), /unique name/);
});

it('DOCTYPE and external entities are rejected without resolution', () => {
  const hostile = style.replace('<style xmlns=', '<!DOCTYPE style [<!ENTITY external SYSTEM "file:///test-secret">]><style xmlns=');
  assert.throws(() => validateStyle(hostile), /DOCTYPE is not allowed/);
});

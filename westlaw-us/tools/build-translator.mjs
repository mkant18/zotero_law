#!/usr/bin/env node
// Build script: concatenates westlaw-us/src/*.js modules into a single Zotero translator file.
// Output: westlaw-us/dist/Westlaw Advantage US.js
// Can also be imported as a module: import { buildTranslator } from './build-translator.mjs'

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const outputFile = join(distDir, 'Westlaw Advantage US.js');

// Stable translatorID across builds (Zotero keys installed translators by ID)
var TRANSLATOR_ID = '9abca805-707d-4064-958f-e08ac37f0862';

// Module files to concatenate, in order
var modules = [
  'text.js',
  'reporters.js',
  'cite-parse.js',
  'profile.js',
  'service.js',
  'dom.js',
  'map.js',
  'reconcile.js',
  'translator.js'
];

export function buildTranslator() {
  // Use stable translatorID
  var translatorID = TRANSLATOR_ID;

  // Read the AGPL license from the M0 probe file
  var probePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'm0', 'probe', 'Westlaw US M0 Probe.js');
  var probeContent = readFileSync(probePath, 'utf8');

  // Extract the AGPL license block from the probe
  var licenseMatch = probeContent.match(/\/\*[\s\S]*?BEGIN LICENSE BLOCK[\s\S]*?END LICENSE BLOCK[\s\S]*?\*\//);
  var licenseComment = licenseMatch ? licenseMatch[0] : '';

  // Fix copyright line to "Copyright © 2026 local"
  licenseComment = licenseComment.replace(/Copyright © 2026 local M0 spike/, 'Copyright © 2026 local');

  // Collect top-level function declaration names across modules to check for duplicates.
  // Only function declarations (not var declarations) can collide after concatenation
  // since var names are prefixed with module prefixes.
  var allTopLevelFunctionNames = [];

  function extractTopLevelFunctionNames(code) {
    var names = [];
    // Match function declarations at the start of a line (top-level only)
    // These are the names that would collide after concatenation.
    var funcRe = /^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;
    var m;
    while ((m = funcRe.exec(code)) !== null) {
      names.push(m[1]);
    }
    return names;
  }

  // Build the output
  var outputParts = [];

  // JSON header block
  // Advance for each changed deployed release so Connector invalidates cached code.
  // Keep fixed within a release so repeated builds remain byte-for-byte reproducible.
  var now = new Date('2026-10-11T20:00:00Z');
  var lastUpdated = now.getUTCFullYear() + '-' +
    String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(now.getUTCDate()).padStart(2, '0') + ' ' +
    String(now.getUTCHours()).padStart(2, '0') + ':' +
    String(now.getUTCMinutes()).padStart(2, '0') + ':' +
    String(now.getUTCSeconds()).padStart(2, '0');

  var header = {
    translatorID: translatorID,
    label: 'Westlaw Advantage US (local)',
    creator: 'local',
    target: '^https://1\\.next\\.westlaw\\.com/',
    minVersion: '5.0',
    maxVersion: '',
    priority: 100,
    inRepository: false,
    translatorType: 4,
    browserSupport: 'gcsibv',
    lastUpdated: lastUpdated
  };

  // Output bare JSON header (Zotero requires file to start with {)
  outputParts.push(JSON.stringify(header, null, "\t"));
  outputParts.push('');

  // AGPL license comment
  if (licenseComment) {
    outputParts.push(licenseComment);
  }

  // Concatenate modules, removing trailing module.exports guards
  var buildHash = createHash('sha256');
  buildHash.update(readFileSync(fileURLToPath(import.meta.url)));
  buildHash.update(licenseComment);
  for (var i = 0; i < modules.length; i++) {
    var modFile = modules[i];
    var modPath = join(srcDir, modFile);
    var modCode = readFileSync(modPath, 'utf8').replace(/\r\n/g, '\n');
    buildHash.update(modFile + '\n' + modCode);

    // Collect top-level function names for duplicate check
    var names = extractTopLevelFunctionNames(modCode);
    allTopLevelFunctionNames = allTopLevelFunctionNames.concat(names);

    // Remove the trailing module.exports guard
    var cleaned = modCode.replace(
      /\nif \(typeof module !== "undefined" && module\.exports\) \{\s*module\.exports = \{[^}]*\};\s*\}\s*$/,
      ''
    );

    outputParts.push('/* ---- ' + modFile + ' ---- */');
    outputParts.push(cleaned);
  }

  // Check for duplicate top-level function names
  var nameCounts = {};
  for (var n = 0; n < allTopLevelFunctionNames.length; n++) {
    var name = allTopLevelFunctionNames[n];
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  }
  var duplicates = [];
  for (var dn in nameCounts) {
    if (nameCounts[dn] > 1) {
      duplicates.push(dn);
    }
  }
  if (duplicates.length > 0) {
    console.error('ERROR: Duplicate top-level function names across modules: ' + duplicates.join(', '));
    process.exit(1);
  }

  // Add testCases variable (Zotero's translator tooling parses this block)
  outputParts.push('/** BEGIN TEST CASES **/');
  outputParts.push('var testCases = [');
  outputParts.push(']');
  outputParts.push('/** END TEST CASES **/');
  outputParts.push('');

  // Join all parts
  var build = buildHash.digest('hex');
  var output = outputParts.join('\n').replace('var wlTrBuild = "source-unbuilt";', 'var wlTrBuild = "' + build + '";');

  // B5: Verify no module.exports or require( in built file
  if (output.indexOf('module.exports') !== -1) {
    console.error('ERROR: Built file contains module.exports');
    process.exit(1);
  }
  if (output.indexOf('require(') !== -1) {
    console.error('ERROR: Built file contains require(');
    process.exit(1);
  }

  // Zotero consumes the JSON header separately from the JavaScript body.
  new Script(output.slice(output.indexOf('\n}\n') + 3), { filename: outputFile });

  // Ensure dist directory exists
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // Write the output file
  writeFileSync(outputFile, output, 'utf8');

  console.log('Build successful: ' + outputFile);
  console.log('translatorID: ' + translatorID);

  return { outputFile, translatorID, build, lastUpdated, sha256: createHash('sha256').update(output).digest('hex') };
}

// Run build when executed directly
if (process.argv[1] && process.argv[1].endsWith('build-translator.mjs')) {
  buildTranslator();
}

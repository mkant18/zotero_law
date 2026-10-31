// M0-C private-data checker tests. Uses node:test (Node 22 built-in).
// All trigger strings are composed at runtime so this source never trips the checker.

import { describe, test, beforeEach, afterEach } from 'node:test';
import { execFileSync } from 'node:child_process';
import { strict as assert } from 'node:assert';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync as ws,
  appendFileSync,
} from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const WORKSPACE_ROOT = process.cwd();
const CHECKER = join(WORKSPACE_ROOT, 'westlaw-us/tools/check-private-data.mjs');

let tmpDir;

function setupGitRepo(dir) {
  execFileSync('git', ['init', dir], { stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'ignore' });
}

function runChecker(...args) {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER, ...args], {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', status: 0 };
  } catch (err) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      status: err.status ?? 2,
    };
  }
}

function runCheckerSafe(...args) {
  try {
    return runChecker(...args);
  } catch (err) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      status: err.status ?? 2,
    };
  }
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'check-private-data-test-'));
  setupGitRepo(tmpDir);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(relPath, content) {
  const full = join(tmpDir, relPath);
  const dir = dirname(full);
  try { mkdirSync(dir, { recursive: true }); } catch { /* already exists */ }
  ws(full, content);
}

function gitAdd(relPath) {
  execFileSync('git', ['add', relPath], { cwd: tmpDir, stdio: 'ignore' });
}

// --- R1 tests ---

describe('R1 path-based rules', () => {
  test('FAIL: file under westlaw-us/.private/', () => {
    writeFile('westlaw-us/.private/secret.txt', 'hello');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-us/.private/secret.txt'), r.stdout);
  });

  test('FAIL: file under westlaw-us/.cache/', () => {
    writeFile('westlaw-us/.cache/data.bin', 'hello');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-us/.cache/data.bin'), r.stdout);
  });

  test('FAIL: file under westlaw-us/ out/ directory', () => {
    writeFile('westlaw-us/build/out/result.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-us/build/out/result.json'), r.stdout);
  });

  test('FAIL: .har file', () => {
    writeFile('capture.har', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 capture.har'), r.stdout);
  });

  test('FAIL: .har.json file', () => {
    writeFile('capture.har.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 capture.har.json'), r.stdout);
  });

  test('FAIL: westlaw-samples HTML file', () => {
    writeFile('westlaw-samples/page.html', '<html></html>');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/page.html'), r.stdout);
  });

  test('FAIL: westlaw-samples TXT file', () => {
    writeFile('westlaw-samples/notes.txt', 'hello');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/notes.txt'), r.stdout);
  });

  test('FAIL: westlaw-samples other path', () => {
    writeFile('westlaw-samples/config.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/config.json'), r.stdout);
  });

  test('FAIL: formerly grandfathered westlaw-samples/citations-settings.json', () => {
    writeFile('westlaw-samples/citations-settings.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/citations-settings.json'), r.stdout);
  });

  test('FAIL: formerly grandfathered westlaw-samples/cite-matrix/5th-cir.json', () => {
    writeFile('westlaw-samples/cite-matrix/5th-cir.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/cite-matrix/5th-cir.json'), r.stdout);
  });

  test('FAIL: formerly grandfathered westlaw-samples/cite-matrix/dc-cir.json', () => {
    writeFile('westlaw-samples/cite-matrix/dc-cir.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/cite-matrix/dc-cir.json'), r.stdout);
  });

  test('FAIL: formerly grandfathered westlaw-samples/cite-matrix/ddc.json', () => {
    writeFile('westlaw-samples/cite-matrix/ddc.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/cite-matrix/ddc.json'), r.stdout);
  });

  test('FAIL: formerly grandfathered westlaw-samples/cite-matrix/ny-appdiv.json', () => {
    writeFile('westlaw-samples/cite-matrix/ny-appdiv.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/cite-matrix/ny-appdiv.json'), r.stdout);
  });

  test('FAIL: formerly grandfathered westlaw-samples/cite-matrix/tex-app.json', () => {
    writeFile('westlaw-samples/cite-matrix/tex-app.json', '{}');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R1 westlaw-samples/cite-matrix/tex-app.json'), r.stdout);
  });
});

// --- R2 tests ---

describe('R2 zero-width watermark characters', () => {
  test('FAIL: U+200B zero-width space', () => {
    const zwsp = String.fromCodePoint(0x200b);
    writeFile('normal.txt', `hello${zwsp}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R2'), r.stdout);
    assert(r.stdout.includes('U+200B'), r.stdout);
  });

  test('FAIL: U+200C zero-width non-joiner', () => {
    const zwnj = String.fromCodePoint(0x200c);
    writeFile('normal.txt', `hello${zwnj}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+200C'), r.stdout);
  });

  test('FAIL: U+200D zero-width joiner', () => {
    const zwj = String.fromCodePoint(0x200d);
    writeFile('normal.txt', `hello${zwj}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+200D'), r.stdout);
  });

  test('FAIL: U+200E left-to-right mark', () => {
    const lrm = String.fromCodePoint(0x200e);
    writeFile('normal.txt', `hello${lrm}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+200E'), r.stdout);
  });

  test('FAIL: U+200F right-to-left mark', () => {
    const rlm = String.fromCodePoint(0x200f);
    writeFile('normal.txt', `hello${rlm}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+200F'), r.stdout);
  });

  test('FAIL: U+2060 word joiner', () => {
    const wj = String.fromCodePoint(0x2060);
    writeFile('normal.txt', `hello${wj}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+2060'), r.stdout);
  });

  test('FAIL: U+2061 function application', () => {
    const fa = String.fromCodePoint(0x2061);
    writeFile('normal.txt', `hello${fa}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+2061'), r.stdout);
  });

  test('FAIL: U+2062 invisible separator', () => {
    const isep = String.fromCodePoint(0x2062);
    writeFile('normal.txt', `hello${isep}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+2062'), r.stdout);
  });

  test('FAIL: U+2063 invisible times', () => {
    const itimes = String.fromCodePoint(0x2063);
    writeFile('normal.txt', `hello${itimes}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+2063'), r.stdout);
  });

  test('FAIL: U+2064 invisible plus', () => {
    const iplus = String.fromCodePoint(0x2064);
    writeFile('normal.txt', `hello${iplus}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('U+2064'), r.stdout);
  });

  test('FAIL: UTF-8 BOM at byte 0', () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const text = Buffer.from('hello world');
    writeFile('bom.txt', Buffer.concat([bom, text]));
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R2'), r.stdout);
    assert(r.stdout.includes('U+FEFF'), r.stdout);
  });

  test('R2 does NOT fire on \\u2060 escape text (literal backslash-u-2060)', () => {
    const escapeText = '\\u2060';
    writeFile('normal.txt', `hello${escapeText}world`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R2'), r.stdout);
  });
});

// --- R3 tests ---

describe('R3 secret-like values', () => {
  test('FAIL: literal ResourceToken secret', () => {
    const key = String.fromCodePoint(0x22) + 'ResourceToken' + String.fromCodePoint(0x22);
    const val = String.fromCodePoint(0x22) + 'realSecret123' + String.fromCodePoint(0x22);
    writeFile('config.json', `{${key}: ${val}}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R3'), r.stdout);
    assert(r.stdout.includes('value-length=13'), r.stdout);
    assert(!r.stdout.includes('realSecret123'), 'secret value must not appear in output');
  });

  test('PASS: placeholder ResourceToken value', () => {
    const key = String.fromCodePoint(0x22) + 'ResourceToken' + String.fromCodePoint(0x22);
    const val = String.fromCodePoint(0x22) + 'PLACEHOLDER_TOKEN' + String.fromCodePoint(0x22);
    writeFile('config.json', `{${key}: ${val}}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R3'), r.stdout);
  });

  test('PASS: variable-assignment (not a string literal)', () => {
    // compose trigger from pieces so source never contains literal pattern
    const k = 'x-cobalt-rtid';
    writeFile('config.js', `${k}: someVariable`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R3'), r.stdout);
  });

  test('FAIL: cookie header line', () => {
    const colon = String.fromCharCode(58);
    const cookieLine = 'Cookie' + colon + ' session=abc123';
    writeFile('headers.txt', cookieLine);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R3'), r.stdout);
    assert(r.stdout.includes('cookie header'), r.stdout);
    assert(!r.stdout.includes('session=abc123'), 'cookie value must not appear in output');
  });

  test('FAIL: Set-Cookie header line', () => {
    const colon = String.fromCharCode(58);
    const setCookieLine = 'Set-Cookie' + colon + ' session=abc123';
    writeFile('headers.txt', setCookieLine);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R3'), r.stdout);
  });

  test('FAIL: Authorization Bearer token (20+ char)', () => {
    const colon = String.fromCharCode(58);
    const space = ' ';
    const bearerLine = 'Authorization' + colon + space + 'Bearer' + space + 'abcdefghijklmnopqrst';
    writeFile('config.txt', bearerLine);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R3'), r.stdout);
    assert(r.stdout.includes('bearer token'), r.stdout);
    assert(!r.stdout.includes('abcdefghijklmnopqrst'), 'bearer value must not appear in output');
  });

  test('FAIL: x-cobalt-rtid JS single-quoted form', () => {
    const key = String.fromCodePoint(0x27) + 'x-cobalt-rtid' + String.fromCodePoint(0x27);
    const val = String.fromCodePoint(0x27) + 'secretRtid' + String.fromCodePoint(0x27);
    writeFile('config.js', `${key}: ${val}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R3'), r.stdout);
    assert(!r.stdout.includes('secretRtid'), 'secret value must not appear in output');
  });

  test('FAIL: x-cobalt-pcid JS unquoted key form', () => {
    const val = String.fromCodePoint(0x22) + 'secretPcid' + String.fromCodePoint(0x22);
    writeFile('config.js', `x-cobalt-pcid: ${val}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R3'), r.stdout);
    assert(!r.stdout.includes('secretPcid'), 'secret value must not appear in output');
  });

  // R3 literal-secret regex tests
  test('PASS: regex-pattern value not flagged', () => {
    const key = String.fromCodePoint(0x22) + 'ResourceToken' + String.fromCodePoint(0x22);
    const val = String.fromCodePoint(0x22) + '([^\"]+)' + String.fromCodePoint(0x22);
    writeFile('config.json', `{${key}: ${val}}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R3'), r.stdout);
  });

  test('PASS: template-literal value not flagged', () => {
    const key = String.fromCodePoint(0x22) + 'ResourceToken' + String.fromCodePoint(0x22);
    const val = String.fromCodePoint(0x22) + '${x}' + String.fromCodePoint(0x22);
    writeFile('config.json', `{${key}: ${val}}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R3'), r.stdout);
  });

  test('PASS: <literal> doc prose not flagged', () => {
    const key = String.fromCodePoint(0x22) + 'ResourceToken' + String.fromCodePoint(0x22);
    const val = String.fromCodePoint(0x22) + '<literal>' + String.fromCodePoint(0x22);
    writeFile('config.json', `{${key}: ${val}}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R3'), r.stdout);
  });

  test('FAIL: 24-char token literal still flagged', () => {
    const key = String.fromCodePoint(0x22) + 'ResourceToken' + String.fromCodePoint(0x22);
    const val = String.fromCodePoint(0x22) + 'abcdefghijklmnopqrstuvwx' + String.fromCodePoint(0x22);
    writeFile('config.json', `{${key}: ${val}}`);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R3'), r.stdout);
    assert(r.stdout.includes('value-length=24'), r.stdout);
  });
});

// --- R4 tests ---

describe('R4 raw capture heuristics', () => {
  test('FAIL: unmarked HTML under westlaw-us/', () => {
    writeFile('westlaw-us/page.html', '<html><body>content</body></html>');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R4'), r.stdout);
  });

  test('PASS: synthetic-marked HTML under westlaw-us/fixtures/synthetic/', () => {
    writeFile('westlaw-us/fixtures/synthetic/page.html', '<!-- SYNTHETIC FIXTURE -->\n<html><body>ok</body></html>');
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R4'), r.stdout);
  });

  test('FAIL: large file with <script and co_document', () => {
    const bigContent = '<script>var x=1;</script>' + 'co_document' + 'x'.repeat(20000);
    writeFile('westlaw-us/capture.txt', bigContent);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R4'), r.stdout);
  });

  test('PASS: .md mentioning <script and co_document not flagged', () => {
    const bigContent = '<script>var x=1;</script>' + 'co_document' + 'x'.repeat(20000);
    writeFile('westlaw-us/page.md', bigContent);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R4'), r.stdout);
  });
});

// --- R5 tests ---

describe('R5 size rule', () => {
  test('FAIL: file under westlaw-us/ exceeds 1MB', () => {
    const bigContent = 'x'.repeat(1_000_001);
    writeFile('westlaw-us/bigfile.bin', bigContent);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('FAIL R5'), r.stdout);
  });

  test('PASS: file under westlaw-us/ under 1MB', () => {
    const smallContent = 'x'.repeat(999_999);
    writeFile('westlaw-us/smallfile.bin', smallContent);
    const r = runChecker('--root', tmpDir);
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('FAIL R5'), r.stdout);
  });
});

// --- Mode tests ---

describe('mode flags', () => {
  test('--staged only sees staged files', () => {
    // Staged file with a FAIL trigger
    writeFile('staged.har', '{}');
    gitAdd('staged.har');
    // Unstaged file with a FAIL trigger (not added)
    writeFile('unstaged.har', '{}');
    const r = runChecker('--root', tmpDir, '--staged');
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('staged.har'), r.stdout);
    assert(!r.stdout.includes('unstaged.har'), `unstaged file should not appear: ${r.stdout}`);
  });

  test('--paths mode restricts to given paths', () => {
    writeFile('westlaw-us/.private/secret.txt', 'hello');
    writeFile('other.txt', 'hello');
    const r = runChecker('--root', tmpDir, '--paths', 'westlaw-us/.private');
    assert(r.status === 1, `expected exit 1 got ${r.status}`);
    assert(r.stdout.includes('westlaw-us/.private/secret.txt'), r.stdout);
    assert(!r.stdout.includes('other.txt'), `other.txt should not appear: ${r.stdout}`);
  });

  test('ignored files not scanned in default mode', () => {
    // Create .gitignore that ignores ignored.txt
    writeFile('.gitignore', 'ignored.txt\n');
    // Add and commit the .gitignore so it takes effect
    gitAdd('.gitignore');
    // Create the ignored file (untracked but matching .gitignore)
    writeFile('ignored.txt', 'secret');
    const r = runChecker('--root', tmpDir);
    // ignored.txt should not be scanned, so no FAIL
    assert(!r.stdout.includes('ignored.txt'), `ignored.txt should not appear: ${r.stdout}`);
  });

  test('--paths skips an ignored file', () => {
    writeFile('.gitignore', 'ignored-secret.txt\n');
    gitAdd('.gitignore');
    writeFile('ignored-secret.txt', 'mySecretToken123');
    const r = runChecker('--root', tmpDir, '--paths', 'ignored-secret.txt');
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
    assert(!r.stdout.includes('ignored-secret.txt'), `ignored-secret.txt should not appear: ${r.stdout}`);
  });

  test('exit code 2 on unknown flag', () => {
    const r = runCheckerSafe('--unknown-flag');
    assert(r.status === 2, `expected exit 2 got ${r.status}`);
  });
});

// --- Smoke test ---

describe('smoke test', () => {
  test('checker passes on westlaw-us/tools directory of real workspace', () => {
    const r = runChecker('--paths', 'westlaw-us/tools');
    assert(r.status === 0, `expected exit 0 got ${r.status}: ${r.stdout}`);
  });
});

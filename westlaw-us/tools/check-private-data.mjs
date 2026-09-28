#!/usr/bin/env node
// M0-C private-data checker (offline). See westlaw-us/tasks/M0-C-private-data-check.md for spec.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ZERO_WIDTH_RANGES = [
  [0x200b, 0x200f],
  [0x2060, 0x2064],
];
const BOM_CODE_POINT = 0xfeff;

const LEGACY_WARN_FILES = new Set([
  'westlaw-samples/citations-settings.json',
  'westlaw-samples/cite-matrix/5th-cir.json',
  'westlaw-samples/cite-matrix/dc-cir.json',
  'westlaw-samples/cite-matrix/ddc.json',
  'westlaw-samples/cite-matrix/ny-appdiv.json',
  'westlaw-samples/cite-matrix/tex-app.json',
]);

const SECRET_KEYS = ['ResourceToken', 'PageEventIdentifier', 'x-cobalt-rtid', 'x-cobalt-pcid'];

function parseArgs(argv) {
  const args = { root: null, staged: false, paths: [] };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--root') {
      if (i + 1 >= argv.length) {
        console.error('check-private-data: --root requires a value');
        process.exit(2);
      }
      args.root = argv[++i];
    } else if (arg === '--staged') {
      args.staged = true;
    } else if (arg === '--paths') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args.paths.push(argv[++i]);
      }
    } else {
      console.error(`check-private-data: unknown flag: ${arg}`);
      process.exit(2);
    }
    i++;
  }
  return args;
}

function gitRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf-8' }).trim();
}

function gitLsFiles(root) {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf-8',
  });
  return out.split('\0').filter(Boolean);
}

function gitDiffCached(root) {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {
    cwd: root,
    encoding: 'utf-8',
  });
  return out.split('\0').filter(Boolean);
}

function gitShow(root, path) {
  return execFileSync('git', ['show', `:${path}`], { cwd: root, encoding: 'utf-8' });
}

function isBinary(buf) {
  const limit = Math.min(buf.length, 8192);
  for (let i = 0; i < limit; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function isUnderDir(filePath, dir) {
  const norm = normalizePath(filePath);
  return norm === dir || norm.startsWith(dir + '/');
}

function checkR1(filePath) {
  const norm = normalizePath(filePath);
  const failures = [];
  const warnings = [];

  if (isUnderDir(norm, 'westlaw-us/.private')) {
    failures.push({ path: norm, reason: 'under westlaw-us/.private/' });
  }

  if (isUnderDir(norm, 'westlaw-us/.cache')) {
    failures.push({ path: norm, reason: 'under westlaw-us/.cache/' });
  }

  // Any /out/ directory under westlaw-us/
  if (norm.startsWith('westlaw-us/') && /\/out\//.test(norm)) {
    failures.push({ path: norm, reason: 'under an out/ directory in westlaw-us/' });
  }

  if (norm.endsWith('.har')) {
    failures.push({ path: norm, reason: '.har file' });
  }

  if (norm.endsWith('.har.json')) {
    failures.push({ path: norm, reason: '.har.json file' });
  }

  if (norm.startsWith('westlaw-samples/')) {
    if (LEGACY_WARN_FILES.has(norm)) {
      warnings.push({ path: norm, reason: 'legacy tracked file (pre-ignore-rule)' });
    } else {
      let reason;
      if (norm.endsWith('.html')) reason = 'westlaw-samples HTML file';
      else if (norm.endsWith('.txt')) reason = 'westlaw-samples text file';
      else reason = 'westlaw-samples path (not legacy)';
      failures.push({ path: norm, reason });
    }
  }

  return { failures, warnings };
}

function checkR2(filePath, text) {
  const results = [];

  // UTF-8 BOM at byte 0
  if (text.charCodeAt(0) === BOM_CODE_POINT) {
    results.push({ line: 1, codePoint: 'U+FEFF' });
  }

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const cp = line.codePointAt(j);
      if (cp > 0xffff) j++; // skip surrogate pair

      if (cp === BOM_CODE_POINT && i === 0 && j === 0) continue; // already handled

      for (const [lo, hi] of ZERO_WIDTH_RANGES) {
        if (cp >= lo && cp <= hi) {
          results.push({ line: i + 1, codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` });
          break;
        }
      }
    }
  }

  return results;
}

function isPlaceholder(value) {
  return /^(PLACEHOLDER|TEST|FAKE|REDACTED|EXAMPLE)[A-Za-z0-9._-]*$/i.test(value);
}

function isLiteralSecret(value) {
  return /^[A-Za-z0-9._~+\/=-]{6,}$/.test(value) && !isPlaceholder(value);
}

function contentLooksLikeHtml(content) {
  const stripped = content.replace(/^\uFEFF/, '').trimStart();
  const lower = stripped.toLowerCase();
  return lower.startsWith('<!doctype') || lower.startsWith('<html');
}

function checkR3(filePath, text) {
  const results = [];

  for (const key of SECRET_KEYS) {
    // JSON double-quoted key: "key": "value"
    const jsonDQ = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, 'g');
    let m;
    while ((m = jsonDQ.exec(text)) !== null) {
      const val = m[1];
      if (isLiteralSecret(val)) {
        results.push({ path: filePath, reason: `secret ${key} value-length=${val.length}` });
      }
    }

    // JS single-quoted key: 'key': 'value'
    const jsSQ = new RegExp(`'${key}'\\s*:\\s*'([^']*)'`, 'g');
    while ((m = jsSQ.exec(text)) !== null) {
      const val = m[1];
      if (isLiteralSecret(val)) {
        results.push({ path: filePath, reason: `secret ${key} value-length=${val.length}` });
      }
    }

    // JS unquoted key (only x-cobalt-pcid): x-cobalt-pcid: PLACEHOLDER
    if (key === 'x-cobalt-pcid') {
      const jsUnq = new RegExp(`\\bx-cobalt-pcid\\s*:\\s*"([^"]*)"`, 'g');
      while ((m = jsUnq.exec(text)) !== null) {
        const val = m[1];
        if (isLiteralSecret(val)) {
          results.push({ path: filePath, reason: `secret ${key} value-length=${val.length}` });
        }
      }
    }
  }

  // HTTP cookie header lines: Cookie: or Set-Cookie:
  const cookieHeaderRe = /^\s*(set-)?cookie\s*:/gim;
  let m;
  while ((m = cookieHeaderRe.exec(text)) !== null) {
    const lineStart = text.lastIndexOf('\n', m.index) + 1;
    const lineEnd = text.indexOf('\n', m.index);
    const line = lineEnd === -1 ? text.slice(lineStart) : text.slice(lineStart, lineEnd);
    const afterColon = line.slice(m.index + m[0].length).trim();
    if (isLiteralSecret(afterColon)) {
      results.push({ path: filePath, reason: `cookie header value-length=${afterColon.length}` });
    }
  }

  // JSON keys "cookie" and "set-cookie" with string value
  const jsonCookie = /"cookie"\s*:\s*"([^"]*)"/g;
  while ((m = jsonCookie.exec(text)) !== null) {
    if (isLiteralSecret(m[1])) {
      results.push({ path: filePath, reason: `cookie JSON value-length=${m[1].length}` });
    }
  }

  const jsonSetCookie = /"set-cookie"\s*:\s*"([^"]*)"/g;
  while ((m = jsonSetCookie.exec(text)) !== null) {
    if (isLiteralSecret(m[1])) {
      results.push({ path: filePath, reason: `set-cookie JSON value-length=${m[1].length}` });
    }
  }

  // Bearer token header pattern detection (requires 16+ char literal token)
  const bearerRe = /Authorization:\s*Bearer\s+(\S+)/g;
  while ((m = bearerRe.exec(text)) !== null) {
    if (/^[A-Za-z0-9._~+\/=-]{16,}$/.test(m[1]) && !isPlaceholder(m[1])) {
      results.push({ path: filePath, reason: `bearer token value-length=${m[1].length}` });
    }
  }

  return results;
}

function checkR4(filePath, content) {
  const norm = normalizePath(filePath);
  const results = [];

  // HTML/htm under westlaw-us/
  if ((norm.endsWith('.html') || norm.endsWith('.htm')) && norm.startsWith('westlaw-us/')) {
    const syntheticPrefix = 'westlaw-us/fixtures/synthetic/';
    const first200 = content.substring(0, 200);
    if (!norm.startsWith(syntheticPrefix) || !first200.includes('<!-- SYNTHETIC FIXTURE -->')) {
      results.push({ path: norm, reason: 'HTML under westlaw-us/ (not synthetic fixture)' });
    }
  }

  // Large text file with both <script and co_document (R4 scope: only HTML-like extensions or content, never .md/.js/.mjs/.json)
  const ext = '.' + norm.split('.').pop().toLowerCase();
  const htmlLikeExts = new Set(['.html', '.htm', '.mhtml', '.txt']);
  const neverExts = new Set(['.md', '.js', '.mjs', '.json']);
  if (!neverExts.has(ext) && content.length > 20000 && content.includes('<script') && content.includes('co_document')) {
    if (htmlLikeExts.has(ext) || contentLooksLikeHtml(content)) {
      results.push({ path: norm, reason: 'large file with <script and co_document (likely saved Westlaw page)' });
    }
  }

  return results;
}

function checkR5(filePath, size) {
  const norm = normalizePath(filePath);
  if (norm.startsWith('westlaw-us/') && size > 1_000_000) {
    return { path: norm, reason: `exceeds 1MB (${size} bytes)` };
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let root;
  if (args.root) {
    root = resolve(args.root);
  } else {
    try {
      root = gitRoot(process.cwd());
    } catch {
      console.error('check-private-data: could not determine git root');
      process.exit(2);
    }
  }

  let candidates;
  if (args.staged) {
    candidates = gitDiffCached(root);
  } else if (args.paths.length > 0) {
    const found = [];
    for (const p of args.paths) {
      const full = join(root, p);
      if (!existsSync(full)) {
        console.error(`check-private-data: path not found: ${p}`);
        process.exit(2);
      }
      const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', p], {
        cwd: root,
        encoding: 'utf-8',
      });
      for (const f of out.split('\n').filter(Boolean)) {
        found.push(normalizePath(f));
      }
    }
    candidates = found;
  } else {
    candidates = gitLsFiles(root);
  }

  let fileCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (let relPath of candidates) {
    relPath = normalizePath(relPath);
    const fullPath = join(root, relPath);
    if (!existsSync(fullPath)) continue;
    const st = statSync(fullPath);
    if (!st.isFile()) continue;

    fileCount++;

    // R1
    const r1 = checkR1(relPath);
    for (const f of r1.failures) {
      console.log(`FAIL R1 ${f.path} ${f.reason}`);
      failCount++;
    }
    for (const w of r1.warnings) {
      console.log(`WARN R1 ${w.path} ${w.reason}`);
      warnCount++;
    }

    // Read content
    let content;
    let contentBuf;
    try {
      if (args.staged) {
        content = gitShow(root, relPath);
        contentBuf = Buffer.from(content, 'utf-8');
      } else {
        contentBuf = readFileSync(fullPath);
        content = contentBuf.toString('utf-8');
      }
      // Normalize CRLF to LF for consistent line handling
      if (content !== null) {
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      }
    } catch {
      // Cannot read file (permission, etc.) — skip R2-R4 but still apply R5
      content = null;
      contentBuf = null;
    }

    const binary = contentBuf !== null && isBinary(contentBuf);

    // R2 (skip binary)
    if (content !== null && !binary) {
      const r2 = checkR2(relPath, content);
      for (const r of r2) {
        console.log(`FAIL R2 ${relPath}:${r.line} ${r.codePoint}`);
        failCount++;
      }
    }

    // R3 (skip binary)
    if (content !== null && !binary) {
      const r3 = checkR3(relPath, content);
      for (const r of r3) {
        console.log(`FAIL R3 ${r.path} ${r.reason}`);
        failCount++;
      }
    }

    // R4 (skip binary)
    if (content !== null && !binary) {
      const r4 = checkR4(relPath, content);
      for (const r of r4) {
        console.log(`FAIL R4 ${r.path} ${r.reason}`);
        failCount++;
      }
    }

    // R5
    const r5 = checkR5(relPath, st.size);
    if (r5) {
      console.log(`FAIL R5 ${r5.path} ${r5.reason}`);
      failCount++;
    }
  }

  console.log(`summary: files=${fileCount} fail=${failCount} warn=${warnCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main();

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

// The preload replaces WebSocket before the actual CLI is imported. No browser
// connection, HTTP listener, translator build, or original output is touched.
const root = path.dirname(fileURLToPath(import.meta.url));
function run(entry, args, { fail = false, html = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'westlaw-cdp-test-'));
  try {
    const profile = path.join(dir, 'Google/Chrome/User Data');
    fs.mkdirSync(profile, { recursive: true });
    fs.writeFileSync(path.join(profile, 'DevToolsActivePort'), '1\n/fake');
    fs.writeFileSync(path.join(dir, 'expression.js'), 'fixture expression');
    const record = path.join(dir, 'commands.json');
    const preload = path.join(dir, 'fake.mjs');
    fs.writeFileSync(preload, `
      import fs from 'node:fs';
      const commands = [];
      globalThis.fetch = () => { throw new Error('HTTP relay forbidden'); };
      globalThis.WebSocket = class {
        constructor(url) {
          if (url !== 'ws://127.0.0.1:1/fake') throw new Error('unexpected transport');
          queueMicrotask(() => this.onopen());
        }
        send(raw) {
          const command = JSON.parse(raw); commands.push(command);
          let result = {};
          if (command.method === 'Target.getTargets') result = { targetInfos: [{ type: 'page', targetId: 'fixture123', title: 'Fixture', url: 'https://example.invalid' }] };
          if (command.method === 'Target.attachToTarget') result = { sessionId: 'owned' };
          if (command.method === 'Runtime.evaluate') result = ${fail ? '{ exceptionDetails: { text: "fixture error" } }' : `{ result: { value: ${html ? JSON.stringify('<html>fixture</html>') : JSON.stringify('fixture result')} } }`};
          queueMicrotask(() => this.onmessage({ data: JSON.stringify({ id: command.id, result }) }));
        }
        close() { fs.writeFileSync(${JSON.stringify(record)}, JSON.stringify({ commands, closed: true })); }
      };
    `);
    const actualArgs = args.map(a => a === 'EXPR' ? path.join(dir, 'expression.js') : a === 'HTML' ? path.join(dir, 'out.html') : a);
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(root, entry), ...actualArgs], {
      env: { ...process.env, LOCALAPPDATA: dir }, encoding: 'utf8', timeout: 5000
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, fail ? 1 : 0, result.stderr);
    const observed = JSON.parse(fs.readFileSync(record, 'utf8'));
    assert.equal(observed.closed, true);
    if (args[0] !== 'targets') {
      assert.equal(observed.commands.at(-1).method, 'Target.detachFromTarget');
      assert.equal(observed.commands.find(c => c.method === 'Runtime.evaluate').sessionId, 'owned');
    }
    if (html) assert.equal(fs.readFileSync(path.join(dir, 'out.html'), 'utf8'), '<html>fixture</html>');
    return { ...result, commands: observed.commands };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('direct targets entry uses only its owned transport', () => {
  assert.match(run('cdp.mjs', ['targets']).stdout, /fixture1.*Fixture/);
});
test('compatibility entry evaluates a file directly', () => {
  const result = run('c.mjs', ['eval', 'fixture', 'EXPR']);
  assert.equal(result.commands.find(c => c.method === 'Runtime.evaluate').params.expression, 'fixture expression');
  assert.match(result.stdout, /fixture result/);
});
test('compatibility entry retains inline evaluation', () => {
  const result = run('c.mjs', ['eval', 'fixture', '-e', 'inline fixture']);
  assert.equal(result.commands.find(c => c.method === 'Runtime.evaluate').params.expression, 'inline fixture');
});
test('HTML capture writes only the disposable output and detaches', () => {
  run('c.mjs', ['html', 'fixture', 'HTML'], { html: true });
});
test('evaluation failure detaches and closes its connection', () => {
  run('c.mjs', ['eval', 'fixture', '-e', 'fixture failure'], { fail: true });
});

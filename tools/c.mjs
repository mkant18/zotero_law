// Client for cdp-daemon. Usage:
//   node c.mjs targets
//   node c.mjs eval <targetPrefix> <file.js | -e "expr">
//   node c.mjs html <targetPrefix> <outFile>
import fs from 'node:fs';
import path from 'node:path';

async function send(method, params = {}, sessionId) {
	const r = await fetch('http://127.0.0.1:9333', { method: 'POST', body: JSON.stringify({ method, params, sessionId }) });
	const m = await r.json();
	if (m.error) throw new Error(method + ': ' + JSON.stringify(m.error));
	return m.result;
}
const [cmd, a1, a2, a3] = process.argv.slice(2);
const pages = (await send('Target.getTargets')).targetInfos.filter(t => t.type === 'page');
async function attach(prefix) {
	const t = pages.find(p => p.targetId.startsWith(prefix));
	if (!t) throw new Error('no target ' + prefix);
	const { sessionId } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
	return { t, sessionId };
}
async function evaluate(sessionId, expression) {
	const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
	if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 2000));
	return r.result.value;
}
if (cmd === 'targets') {
	for (const p of pages) console.log(p.targetId.slice(0, 8), '|', p.title.slice(0, 100), '|', p.url.slice(0, 200));
}
else if (cmd === 'eval') {
	const { sessionId } = await attach(a1);
	const expr = a2 === '-e' ? a3 : fs.readFileSync(a2, 'utf8');
	const out = await evaluate(sessionId, expr);
	console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
	await send('Target.detachFromTarget', { sessionId });
}
else if (cmd === 'html') {
	const { t, sessionId } = await attach(a1);
	const html = await evaluate(sessionId, `(() => {
		let out = '<!-- URL: ' + location.href + ' -->\\n' + document.documentElement.outerHTML;
		document.querySelectorAll('iframe').forEach((f, i) => {
			try { out += '\\n<!-- IFRAME ' + i + ' src=' + f.src + ' -->\\n' + f.contentDocument.documentElement.outerHTML; }
			catch (e) { out += '\\n<!-- IFRAME ' + i + ' src=' + f.src + ' (cross-origin) -->'; }
		});
		return out;
	})()`);
	fs.mkdirSync(path.dirname(a2), { recursive: true });
	fs.writeFileSync(a2, html);
	console.log('saved', a2, html.length, 'chars |', t.url.slice(0, 150));
	await send('Target.detachFromTarget', { sessionId });
}

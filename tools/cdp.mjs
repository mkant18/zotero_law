// Direct CDP client for explicitly authorized browser research.
// Usage: node cdp.mjs <command> [args]
//   targets                         list page targets
//   eval <targetIdPrefix> <file.js | -e "expr"> evaluate JS, print JSON result
//   html <targetIdPrefix> <outFile> save document.documentElement.outerHTML (+ same-origin iframes)
import fs from 'node:fs';
import path from 'node:path';

const portFile = path.join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data/DevToolsActivePort');
const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
	const msg = JSON.parse(ev.data);
	if (msg.id && pending.has(msg.id)) {
		const { resolve, reject, timer } = pending.get(msg.id);
		clearTimeout(timer);
		pending.delete(msg.id);
		msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
	}
};
function send(method, params = {}, sessionId) {
	const mid = ++id;
	ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); reject(new Error('timeout ' + method)); } }, 60000);
		pending.set(mid, { resolve, reject, timer });
	});
}
try {
	await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error('ws error: ' + (e.message || 'connect failed'))); });

	const [cmd, a1, a2, a3] = process.argv.slice(2);
	const { targetInfos } = await send('Target.getTargets');
	const pages = targetInfos.filter(t => t.type === 'page');

	async function attach(prefix) {
		const t = pages.find(p => p.targetId.startsWith(prefix));
		if (!t) throw new Error('no target ' + prefix);
		const { sessionId } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
		return { t, sessionId };
	}
	async function evaluate(sessionId, expression) {
		const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
		if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
		return r.result.value;
	}

	if (cmd === 'targets') {
		for (const p of pages) console.log(p.targetId.slice(0, 8), '|', p.title.slice(0, 90), '|', p.url.slice(0, 160));
	}
	else if (cmd === 'eval') {
		const { sessionId } = await attach(a1);
		try {
			const out = await evaluate(sessionId, a2 === '-e' ? a3 : fs.readFileSync(a2, 'utf8'));
			console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
		} finally {
			await send('Target.detachFromTarget', { sessionId });
		}
	}
	else if (cmd === 'html') {
		const { t, sessionId } = await attach(a1);
		try {
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
			console.log('saved', a2, html.length, 'chars from', t.url.slice(0, 120));
		} finally {
			await send('Target.detachFromTarget', { sessionId });
		}
	}
} finally {
	for (const { timer } of pending.values()) clearTimeout(timer);
	pending.clear();
	ws.close();
}

// Holds ONE approved CDP connection to the user's Chrome and exposes it on
// http://127.0.0.1:9333 (POST JSON {method, params, sessionId}) so each approval is reused.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const portFile = path.join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data/DevToolsActivePort');
const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
const log = (...a) => console.log(new Date().toISOString(), ...a);
log('connecting; approve the "Allow remote debugging?" prompt in Chrome');
const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
	const msg = JSON.parse(ev.data);
	if (msg.id && pending.has(msg.id)) {
		const res = pending.get(msg.id);
		pending.delete(msg.id);
		res(msg);
	}
};
ws.onclose = (e) => { log('ws closed', e.code, e.reason); process.exit(1); };
ws.onerror = (e) => log('ws error', e.message || e.type);
ws.onopen = () => {
	log('CONNECTED');
	http.createServer((req, res) => {
		let body = '';
		req.on('data', c => body += c);
		req.on('end', () => {
			let cmd;
			try { cmd = JSON.parse(body); } catch { res.writeHead(400); return res.end('bad json'); }
			const mid = ++id;
			const timer = setTimeout(() => { pending.delete(mid); res.writeHead(504); res.end('{"error":"timeout"}'); }, 60000);
			pending.set(mid, (msg) => { clearTimeout(timer); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(msg)); });
			ws.send(JSON.stringify({ id: mid, method: cmd.method, params: cmd.params || {}, sessionId: cmd.sessionId }));
		});
	}).listen(9333, '127.0.0.1', () => log('proxy listening on 127.0.0.1:9333'));
};

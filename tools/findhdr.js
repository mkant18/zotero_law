(async () => {
	const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js(\?|$)/.test(n) && /westlaw/.test(n)))];
	const found = new Map();
	for (const u of urls) {
		const t = await (await fetch(u)).text();
		for (const m of t.matchAll(/["'`](x-cobalt[\w-]*|X-Cobalt[\w-]*|x-tr[\w-]*|X-TR[\w-]*|x-requested-with|X-Requested-With|x-westlaw[\w-]*)["'`]/g)) {
			const k = m[1];
			if (!found.has(k)) found.set(k, u.split('/').pop() + ': ' + t.slice(Math.max(0, m.index - 250), m.index + 250));
		}
	}
	return [...found.entries()].map(([k, v]) => '### ' + k + '\n' + v).join('\n\n');
})()

(async () => {
	const urls = performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js(\?|$)/.test(n) && /westlaw/.test(n));
	const hits = [];
	for (const u of [...new Set(urls)]) {
		try {
			const t = await (await fetch(u)).text();
			let i = -1, n = 0;
			while ((i = t.indexOf('citestyles', i + 1)) >= 0 && n++ < 6) hits.push(u.split('/').pop() + ' @' + i + ': ' + t.slice(Math.max(0, i - 700), i + 900));
		} catch (e) { hits.push('ERR ' + u + ' ' + e); }
	}
	return hits.join('\n\n=========\n\n');
})()

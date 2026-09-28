(async () => {
	const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js(\?|$)/.test(n) && /westlaw/.test(n)))];
	const out = [];
	for (const u of urls) {
		const t = await (await fetch(u)).text();
		for (const k of ['CAFormat', 'LegalBriefs', 'parallelCiteRule']) {
			let i = -1, n = 0;
			while ((i = t.indexOf(k, i + 1)) >= 0 && n++ < 3) out.push(k + ' | ' + u.split('/').pop() + ': ' + t.slice(Math.max(0, i - 400), i + 400));
		}
	}
	return out.join('\n\n----\n\n');
})()

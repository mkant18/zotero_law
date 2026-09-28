(async () => {
	const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js(\?|$)/.test(n) && /westlaw/.test(n)))];
	const out = [];
	for (const u of urls) {
		const t = await (await fetch(u)).text();
		for (const re of [/oneCitation[^]{0,300}/g, /CiteAdvisorParallelCites[^]{0,200}/g, /subStyle\s*[:=][^]{0,160}/g]) {
			let n = 0;
			for (const m of t.matchAll(re)) { if (n++ > 4) break; out.push(u.split('/').pop() + ': ' + t.slice(Math.max(0, m.index - 150), m.index + 300)); }
		}
	}
	return [...new Set(out)].join('\n\n----\n\n');
})()

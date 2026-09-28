(async () => {
	const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js(\?|$)/.test(n) && /westlaw/.test(n)))];
	const keys = ['PrepareGetFormattedReferenceRequest', 'CiteAdvisorParallelCites', 'oneCitation', 'parallelCitationRule', 'copyWithRefPref', 'CopyWithReferenceStyle', 'subStyle:', 'isOnlyCaseCitedInText', 'useOfficialStatuteCitation', 'specialRefNonConstitution', 'fallbackStyleID'];
	const out = [];
	for (const u of urls) {
		const t = await (await fetch(u)).text();
		for (const k of keys) {
			let i = -1, n = 0;
			while ((i = t.indexOf(k, i + 1)) >= 0 && n++ < 4) out.push('### ' + k + ' | ' + u.split('/').pop() + ' @' + i + '\n' + t.slice(Math.max(0, i - 1500), i + 2500));
		}
	}
	return out.join('\n\n');
})()

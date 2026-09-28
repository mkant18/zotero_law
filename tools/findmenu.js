(async () => {
	const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js(\?|$)/.test(n) && /westlaw/.test(n)))];
	const out = [];
	for (const u of urls) {
		const t = await (await fetch(u)).text();
		for (const k of ['copyWithReferenceMenuContainer}" class', 'CopyReference-typeahead-search', 'UserSettingsLightbox")']) {
			const i = t.indexOf(k);
			if (i >= 0) out.push('### ' + k + ' | ' + u.split('/').pop() + '\n' + t.slice(Math.max(0, i - 3000), i + 4000));
		}
	}
	return out.join('\n\n');
})()

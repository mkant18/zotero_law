(async () => {
	const urls = [...new Set(performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.js(\?|$)/.test(n) && /westlaw/.test(n)))];
	const out = [];
	for (const u of urls) {
		const t = await (await fetch(u)).text();
		for (const re of [/UserSettings[A-Za-z]*(Lightbox|Url|Path|Html)[^,;]{0,200}/g, /["'`][^"'`]*[Uu]ser[Ss]ettings[^"'`]*\.html[^"'`]*["'`]/g, /CopyWithRef[A-Za-z]*(Settings|Pref|Lightbox|Options)[^;]{0,300}/g, /copywithref-button[^;]{0,600}/g]) {
			let n = 0;
			for (const m of t.matchAll(re)) { if (n++ > 3) break; out.push(u.split('/').pop() + ': ' + m[0].slice(0, 600)); }
		}
	}
	return [...new Set(out)].join('\n----\n');
})()

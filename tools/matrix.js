(async () => {
	const html = document.documentElement.innerHTML;
	const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'x-cobalt-exectype': 'async',
		'x-cobalt-pcid': html.match(/"PageEventIdentifier":"([^"]+)"/)[1], 'x-cobalt-rtid': html.match(/"ResourceToken":"([^"]+)"/)[1],
		'x-cobalt-host': html.match(/"RelatedInfo":"([^"]+)"/)[1] };
	const guid = html.match(/"DocumentGuid":"(I[0-9a-f]{32})"/)[1];
	const sleep = (ms) => new Promise(r => setTimeout(r, ms));
	const allStyles = ['standard', 'westlaw', 'alwd', 'arizona', 'california', 'colorado', 'connecticut', 'delaware', 'district_columbia', 'florida', 'georgia', 'hawaii', 'illinois', 'indiana', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'nevada', 'new_jersey', 'new_mexico', 'new_york', 'north_carolina', 'north_dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'south_dakota', 'tennessee', 'texas', 'virgin_islands', 'virginia', 'washington'];
	async function call(styles, opts) {
		const q = ['contextData=(sc.Default)', ...styles.map(s => 'styleIDs=' + s), 'underline=false', 'bold=false', 'italicize=true',
			'subStyle=' + opts.sub, 'history=' + opts.hist, 'parallelCiteRule=' + opts.par, ...(opts.pages || []).map(p => 'pubPages=' + p)].join('&');
		const r = await fetch('/RelatedInfo/v2/citestyles/' + guid + '?' + q, { headers: h, credentials: 'include' });
		await sleep(350);
		const j = await r.json().catch(() => ({}));
		if (!j.responses) return { error: r.status + ' ' + JSON.stringify(j).slice(0, 150) };
		const res = {};
		for (const resp of j.responses) {
			const pick = (form, i = 0) => { const f = resp.forms.filter(x => x.form === form)[i]; return f ? { text: f.cites.find(c => c.type === 'text/plain').value, html: f.cites.find(c => c.type === 'text/html').value } : null; };
			res[resp.request.styleId] = { long: pick('long'), short1: pick('short', 0)?.text, short2: pick('short', 1)?.text, id: pick('specialRef')?.text, enhancedDiffers: pick('enhanced')?.text !== pick('long')?.text ? pick('enhanced')?.text : undefined };
		}
		return res;
	}
	const out = { guid, title: document.title };
	// 1) all 39 styles, baseline
	out.allStyles = await call(allStyles, { sub: 'LegalBriefs', hist: 'false', par: 'CAFormat' });
	// 2) option matrix on core styles
	const core = ['standard', 'alwd'];
	out.matrix = {};
	for (const par of ['CAFormat', 'allReporter', 'officialReporterOnly', 'westReporterOnly'])
		for (const sub of ['LegalBriefs', 'LawReviews'])
			out.matrix[par + '/' + sub] = await call(core, { sub, hist: 'false', par });
	out.matrix['CAFormat/LegalBriefs/history'] = await call(core, { sub: 'LegalBriefs', hist: 'true', par: 'CAFormat' });
	// 3) pin cite using the first two star-page series found on the page
	const series = [...new Set([...document.querySelectorAll('.co_starPage')].map(e => e.id.match(/co_pp_sp_(\d+)_(\d+)/)).filter(Boolean).map(m => m[1]))];
	const pages = series.map(s => { const ids = [...document.querySelectorAll('[id^="co_pp_sp_' + s + '_"]')].map(e => e.id.split('_').pop()); return s + ',' + ids[Math.min(2, ids.length - 1)]; });
	out.pinPages = pages;
	out.pin = await call(core, { sub: 'LegalBriefs', hist: 'false', par: 'CAFormat', pages });
	return out;
})()

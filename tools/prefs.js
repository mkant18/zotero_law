(async () => {
	const html = document.documentElement.innerHTML;
	const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'x-cobalt-exectype': 'async',
		'x-cobalt-pcid': html.match(/"PageEventIdentifier":"([^"]+)"/)[1], 'x-cobalt-rtid': html.match(/"ResourceToken":"([^"]+)"/)[1] };
	const r = await fetch('/V1/GetPreferences', { headers: h, credentials: 'include' });
	const txt = await r.text();
	const cite = {};
	try { const j = JSON.parse(txt); const walk = (o, p) => { for (const k in o) { if (/cite|citation|copyWith/i.test(k)) cite[p + k] = o[k]; else if (o[k] && typeof o[k] === 'object') walk(o[k], p + k + '.'); } }; walk(j, ''); } catch (e) { cite.raw = txt.slice(0, 500); }
	// also any inline copy of prefs in page
	const inline = [...new Set((html.match(/"CiteAdvisor[A-Za-z]+"\s*:\s*("[^"]*"|true|false)/g) || []))];
	return { status: r.status, cite, inline };
})()

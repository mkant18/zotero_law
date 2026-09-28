(async () => {
	const html = document.documentElement.innerHTML;
	const h = { 'X-Requested-With': 'XMLHttpRequest', 'x-cobalt-exectype': 'async',
		'x-cobalt-pcid': html.match(/"PageEventIdentifier":"([^"]+)"/)[1], 'x-cobalt-rtid': html.match(/"ResourceToken":"([^"]+)"/)[1] };
	const r = await fetch(location.search.includes('zz') ? '' : '/V2/UserSettings', { headers: h, credentials: 'include' });
	const txt = await r.text();
	let markup = txt;
	try { const j = JSON.parse(txt); markup = JSON.stringify(j); } catch (e) {}
	const d = new DOMParser().parseFromString(markup.includes('<') ? (markup.startsWith('"') ? JSON.parse(markup) : markup) : '', 'text/html');
	const ctrls = [...d.querySelectorAll('input, select')].filter(e => /cit|parallel|CiteAdvisor|history|underline|italic|rules/i.test((e.name || '') + (e.id || '') + (e.dataset.preferencekey || '')));
	const rows = ctrls.map(e => {
		const lab = e.id && d.querySelector('label[for="' + e.id + '"]');
		const txt = (lab ? lab.textContent : (e.closest('label')?.textContent || e.parentElement?.textContent || '')).replace(/\s+/g, ' ').trim().slice(0, 120);
		if (e.tagName === 'SELECT') return 'SELECT ' + (e.name || e.id) + ' key=' + (e.dataset.preferencekey || '') + ' :: ' + [...e.options].map(o => o.value + '=' + o.textContent.trim()).join(' | ');
		return e.type + ' name=' + e.name + ' key=' + (e.dataset.preferencekey || '') + ' value=' + e.value + (e.checked ? ' [checked]' : '') + ' :: ' + txt;
	});
	return { status: r.status, len: txt.length, head: rows.length ? undefined : txt.slice(0, 800), rows };
})()

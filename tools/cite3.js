(async () => {
	const html = document.documentElement.innerHTML;
	const pcid = html.match(/"PageEventIdentifier":"([^"]+)"/)[1];
	const rtid = html.match(/"ResourceToken":"([^"]+)"/)[1];
	const host = html.match(/"RelatedInfo":"([^"]+)"/)[1];
	const guid = document.querySelector('#co_docHeaderTitleLine a').href.match(/Document\/(I[0-9a-f]{32})/)[1];
	const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'x-cobalt-exectype': 'async', 'x-cobalt-pcid': pcid, 'x-cobalt-rtid': rtid, 'x-cobalt-host': host };
	const variants = ['parallelCiteRule=CAFormat&subStyle=LegalBriefs', 'parallelCiteRule=allReporter&subStyle=LegalBriefs', 'parallelCiteRule=OneCitation&subStyle=LegalBriefs', 'parallelCiteRule=National&subStyle=LegalBriefs', 'parallelCiteRule=Regional&subStyle=LegalBriefs', 'parallelCiteRule=CAFormat&subStyle=LawReview', 'parallelCiteRule=CAFormat&subStyle=CourtDocuments'];
	const out = {};
	for (const v of variants) {
		const r = await fetch('/RelatedInfo/v2/citestyles/' + guid + '?contextData=(sc.Default)&styleIDs=standard&styleIDs=westlaw&underline=false&bold=false&italicize=false&history=true&' + v, { headers: h, credentials: 'include' });
		const j = await r.json().catch(() => null);
		const s = j && j.responses && j.responses.find(x => x.request.styleId === 'standard');
		out[v] = r.status + ' | ' + (s ? s.forms.filter(f => f.form !== 'specialRef').map(f => f.form + ': ' + f.cites.find(c => c.type === 'text/plain').value).join(' || ') + ' | echoed=' + s.request.formatOptions.parallelCitationRule + '/' + s.request.formatOptions.subStyle : "no standard: " + JSON.stringify(j).slice(0, 200));
	}
	return out;
})()

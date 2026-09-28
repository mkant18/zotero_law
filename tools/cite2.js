(async () => {
	const html = document.documentElement.innerHTML;
	const pcid = html.match(/"PageEventIdentifier":"([^"]+)"/)[1];
	const rtid = html.match(/"ResourceToken":"([^"]+)"/)[1];
	const host = html.match(/"RelatedInfo":"([^"]+)"/)[1];
	const guid = (document.querySelector('#co_docHeaderTitleLine a')?.href.match(/Document\/(I[0-9a-f]{32})/) || location.href.match(/Document\/(I[0-9a-f]{32})/) || html.match(/documentGuid=(I[0-9a-f]{32})/))[1];
	const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'x-cobalt-exectype': 'async', 'x-cobalt-pcid': pcid, 'x-cobalt-rtid': rtid, 'x-cobalt-host': host };
	const q = 'contextData=(sc.Default)&styleIDs=standard&styleIDs=westlaw&styleIDs=alwd&underline=false&bold=false&italicize=true&subStyle=LegalBriefs&history=true&parallelCiteRule=CAFormat';
	const r = await fetch('/RelatedInfo/v2/citestyles/' + guid + '?' + q, { headers: h, credentials: 'include' });
	return { guid, status: r.status, body: (await r.text()).slice(0, 6000) };
})()

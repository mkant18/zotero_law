(async () => {
	const html = document.documentElement.innerHTML;
	const pcid = html.match(/"PageEventIdentifier":"([^"]+)"/)[1];
	const rtid = html.match(/"ResourceToken":"([^"]+)"/)[1];
	const host = html.match(/"RelatedInfo":"([^"]+)"/)[1];
	const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'x-cobalt-exectype': 'async', 'x-cobalt-pcid': pcid, 'x-cobalt-rtid': rtid, 'x-cobalt-host': host };
	const r1 = await fetch('/RelatedInfo/v2/citestyles/styles?contextData=(sc.Default)', { headers: h, credentials: 'include' });
	const styles = await r1.text();
	return { status: r1.status, ct: r1.headers.get('content-type'), styles: styles.slice(0, 5000) };
})()

(() => {
	const q = (s) => document.querySelector(s);
	const txt = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 300) : null;
	const out = {};
	out.url = location.href;
	out.title = document.title;
	out.metas = [...document.querySelectorAll('meta')].map(m => (m.name || m.getAttribute('property') || m.httpEquiv) + '=' + (m.content || '').slice(0, 120));
	out.jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent.slice(0, 300));
	out.iframes = [...document.querySelectorAll('iframe')].map(f => f.id + ' ' + f.src.slice(0, 100));
	const sels = ['#co_docHeaderTitleLine', '#title', '#courtline', '#filedate', '#cite0', '#cite1', '#cite2', '#cite3', '.co_courtBlock', '.co_docketBlock', '.co_dateBlock', '.co_title', '#co_docHeaderContainer', '#co_docContentHeader', '.co_cites', '#co_document_0', '#co_document', '.co_judges', '.co_judgeBlock', '#co_docContentCourt', '.co_briefItState', '#co_docHeader'];
	out.selectors = {};
	for (const s of sels) {
		const els = document.querySelectorAll(s);
		out.selectors[s] = els.length ? els.length + ' :: ' + txt(els[0]) + (els[0].getAttribute('title') ? ' [title=' + els[0].getAttribute('title').slice(0, 150) + ']' : '') : 0;
	}
	// IDs & classes starting with co_ near the top of the document body
	const doc = q('#co_document') || q('#co_document_0') || document.body;
	const ids = new Set(), classes = new Map();
	doc.querySelectorAll('[id],[class]').forEach((el, i) => {
		if (i > 400) return;
		if (el.id) ids.add(el.id);
		el.classList.forEach(c => classes.set(c, (classes.get(c) || 0) + 1));
	});
	out.docIdsFirst400 = [...ids].slice(0, 120);
	out.docClassesFirst400 = [...classes.entries()].slice(0, 150).map(([k, v]) => k + ':' + v);
	return out;
})()

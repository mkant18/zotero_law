(() => {
	const clean = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/\s+/g, ' ');
	const out = {};
	const hdr = document.querySelector('#co_docHeaderContainer');
	out.headerHTML = hdr ? clean(hdr.outerHTML).slice(0, 6000) : null;
	const doc = document.querySelector('#co_document');
	// top-of-document block up to the first opinion
	const top = [];
	for (const s of ['.co_cites', '.co_title', '.co_courtBlock', '.co_docketBlock', '.co_date', '.co_dateBlock', '.co_snt_courtLine', '.co_snt_dateFiled', '.co_caselawOfficial', '.co_remarksBlock', '.x_opinionLead', '.x_dissentAuthorLine', '.co_judges', '.co_attorneyBlock', '.co_synopsis', '[class*="uthor"]', '[class*="udge"]', '[class*="anel"]', '[class*="ttorney"]', '[class*="ounsel"]', '.co_starPageMetadataItem']) {
		document.querySelectorAll(s).forEach((el, i) => { if (i < 4) top.push(s + ' #' + i + ' => ' + clean(el.outerHTML).slice(0, 700)); });
	}
	out.blocks = top;
	// invisible-char audit
	const inv = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
	const counts = {};
	for (const s of ['#co_docHeaderTitleLine', '.co_cites', '.co_title', '.co_courtBlock', '.co_docketBlock', '#filedate', '.co_date']) {
		const el = document.querySelector(s);
		if (el) counts[s] = (el.textContent.match(inv) || []).length + ' invisible / ' + el.textContent.length;
	}
	out.invisible = counts;
	out.titleAttr = document.querySelector('#co_docHeaderTitleLine')?.getAttribute('title');
	return out;
})()

(() => {
	const t = (el) => el ? el.textContent.replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, '').replace(/\s+/g, ' ').trim() : null;
	const all = (s) => [...document.querySelectorAll(s)].map(t).filter(Boolean);
	const html = document.documentElement.innerHTML;
	const cfgKeys = {};
	for (const k of ['ContentType', 'DocumentGuid', 'Collection', 'DocType', 'Jurisdiction', 'CitationSeries', 'PageEventIdentifier']) {
		const m = html.match(new RegExp('"' + k + '"\\s*:\\s*"([^"]{0,120})"'));
		if (m) cfgKeys[k] = m[1];
	}
	return {
		docTitle: document.title,
		h1Title: document.querySelector('#co_docHeaderTitleLine')?.getAttribute('title'),
		headerList: [...document.querySelectorAll('#co_docHeaderCitation > li')].map(li => (li.id || '-') + ': ' + t(li)),
		cites: all('.co_cites'),
		partyLines: all('.co_title .co_partyLine'),
		court: all('.co_courtBlock'),
		docket: all('.co_docketBlock'),
		date: all('.co_date, .co_dateBlock'),
		judges: all('.co_judges, .x_opinionAuthor, .co_panel, .co_judgeBlock, [class*="judge" i]').slice(0, 5),
		opinionAuthorLines: all('.x_opinionLead .co_paragraphText').slice(0, 1).map(s => s.slice(0, 200)),
		counsel: all('.co_attorneyBlock, .co_counsel, [class*="ttorney"]').slice(0, 3).map(s => s.slice(0, 200)),
		priorHistory: all('.co_priorHistory, [class*="History" i]').slice(0, 3).map(s => s.slice(0, 200)),
		starPageSets: [...new Set([...document.querySelectorAll('.co_starPage')].map(e => e.id.replace(/_\d+$/, '')))],
		config: cfgKeys,
		contentTypeInTitle: document.title.split(' | ')[1],
		urlGuid: (location.href.match(/Document\/(I[0-9a-f]{32})/) || [])[1] || null,
		headerLinkGuid: (document.querySelector('#co_docHeaderTitleLine a')?.href.match(/Document\/(I[0-9a-f]{32})/) || [])[1] || null
	};
})()

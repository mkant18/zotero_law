// Fake Zotero, ZU, and DOM for offline node:test execution.

export function makeFakeZotero() {
  const items = [];
  const debugMessages = [];
  const monitorDOMChangesCalls = [];

  class FakeItem {
    constructor(itemType) {
      this.itemType = itemType;
      this._fields = {};
      this._completeCalled = false;
    }

    get caseName() { return this._fields.caseName; }
    set caseName(v) { this._fields.caseName = v; }

    get url() { return this._fields.url; }
    set url(v) { this._fields.url = v; }

    get dateDecided() { return this._fields.dateDecided; }
    set dateDecided(v) { this._fields.dateDecided = v; }

    get attachments() { return this._fields.attachments; }
    set attachments(v) { this._fields.attachments = v; }

    get creators() { return this._fields.creators; }
    set creators(v) { this._fields.creators = v; }

    get notes() { return this._fields.notes; }
    set notes(v) { this._fields.notes = v; }

    get tags() { return this._fields.tags; }
    set tags(v) { this._fields.tags = v; }

    get extra() { return this._fields.extra; }
    set extra(v) { this._fields.extra = v; }

    complete() {
      this._completeCalled = true;
      items.push(this);
    }
  }

  return {
    Zotero: {
      Item: FakeItem,
      debug: (msg) => { debugMessages.push(String(msg)); },
      monitorDOMChanges: (el) => { monitorDOMChangesCalls.push(el); },
      isInject: false
    },
    items,
    debugMessages,
    monitorDOMChangesCalls,
    getLastItem() { return items[items.length - 1] || null; },
    getCompleteCount() { return items.length; },
    reset() {
      items.length = 0;
      debugMessages.length = 0;
      monitorDOMChangesCalls.length = 0;
    }
  };
}

export function makeFakeZU(responseFn) {
  const calls = [];
  let _responseFn = responseFn;

  const fakeZU = {
    calls,
    getCallCount() { return calls.length; },
    getCalls() { return calls; },
    reset() { calls.length = 0; },
    get request() {
      return async (url, options = {}) => {
        calls.push({ url, options, timestamp: Date.now() });
        return _responseFn(url, options);
      };
    },
    set request(fn) {
      _responseFn = fn;
    }
  };

  return fakeZU;
}

export function makeFakeDoc(opts = {}) {
  const {
    title = "",
    href = "https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html",
    hostname = "1.next.westlaw.com",
    scripts = [],
    headerTitle = null,
    headerCitationLis = [],
    docketBlock = null,
    headerAnchorHref = null,
    coDocument = null
  } = opts;

  const headerTitleEl = headerTitle !== null ? {
    tagName: "div",
    attributes: {},
    _textContent: headerTitle,
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = v; },
    getAttribute(name) { return this.attributes[name] || null; },
    _anchor: null
  } : null;

  if (headerAnchorHref && headerTitleEl) {
    headerTitleEl._anchor = {
      tagName: "a",
      attributes: { href: headerAnchorHref },
      _textContent: "",
      get textContent() { return this._textContent; },
      set textContent(v) { this._textContent = v; },
      getAttribute(name) { return this.attributes[name] || null; }
    };
  }

  const citationLis = headerCitationLis.map(t => ({
    tagName: "li",
    attributes: {},
    _textContent: t,
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = v; },
    getAttribute(name) { return this.attributes[name] || null; }
  }));

  const docketEl = docketBlock !== null ? {
    tagName: "div",
    attributes: {},
    _textContent: docketBlock,
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = v; },
    getAttribute(name) { return this.attributes[name] || null; }
  } : null;

  const coDocEl = coDocument !== null ? {
    tagName: "div",
    attributes: {},
    _textContent: coDocument,
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = v; },
    getAttribute(name) { return this.attributes[name] || null; }
  } : null;

  const elements = {};
  if (headerTitleEl) elements["#co_docHeaderTitleLine"] = headerTitleEl;
  if (citationLis.length > 0) elements["#co_docHeaderCitation > li"] = citationLis;
  if (docketEl) elements[".co_docketBlock"] = docketEl;
  if (coDocEl) elements["#co_document"] = coDocEl;

  let _href = href;

  const doc = {
    title,
    get href() { return _href; },
    set href(v) { _href = v; },
    location: {
      get href() { return _href; },
      set href(v) { _href = v; },
      get hostname() { return hostname; }
    },
    querySelector(sel) {
      if (sel === "#co_docHeaderTitleLine") return elements["#co_docHeaderTitleLine"] || null;
      if (sel === "#co_document") return elements["#co_document"] || null;
      if (sel === ".co_docketBlock") return elements[".co_docketBlock"] || null;
      if (sel === "#co_docHeaderTitleLine a[href*=\"/Document/I\"]") {
        const el = elements["#co_docHeaderTitleLine"];
        return el && el._anchor ? el._anchor : null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === "#co_docHeaderCitation > li") return elements["#co_docHeaderCitation > li"] || [];
      if (sel === "script") return scripts;
      return [];
    }
  };

  return doc;
}

// Tiny fake DOM for offline node:test execution. No npm dependencies.
// Exports: el(tag, attrs, ...children), makeDoc({ title, body, href, hostname })

function isElement(node) {
  return node !== null && node !== undefined && typeof node === 'object' && node !== {} && '_children' in node;
}

function el(tag, attrs, ...children) {
  const tagName = tag.toUpperCase();
  const attributes = attrs || {};
  const childNodes = [];
  for (const c of children) {
    if (c == null || c === false) continue;
    childNodes.push(isElement(c) ? c : String(c));
  }

  const id = attributes.id || '';
  const className = attributes.class || '';
  const classList = {
    contains(cls) { return className.split(/\s+/).indexOf(cls) !== -1; }
  };

  const node = {
    tagName,
    get id() { return id; },
    get className() { return className; },
    get classList() { return classList; },
    getAttribute(name) { return attributes[name] !== undefined ? String(attributes[name]) : null; },
    _children: childNodes.filter(isElement),
    _parent: null,
    get textContent() {
      let text = '';
      for (const c of childNodes) {
        text += isElement(c) ? c.textContent : c;
      }
      return text;
    },
    get children() { return this._children; },
    querySelector(sel) {
      const results = this.querySelectorAll(sel);
      return results[0] || null;
    },
    querySelectorAll(sel) {
      return selectAll(sel, this);
    }
  };

  for (const c of childNodes) {
    if (isElement(c)) c._parent = node;
  }

  return node;
}

// ---- Simple selector engine ----

function parseSelector(selector) {
  const steps = [];
  let i = 0;
  const s = selector.trim();

  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;

    const compound = [];
    while (i < s.length && !/[\s>+~,]/.test(s[i])) {
      if (s[i] === '#') {
        i++;
        let id = '';
        while (i < s.length && /[^.#\[ >+~,]/.test(s[i])) id += s[i++];
        compound.push({ type: 'id', value: id });
      } else if (s[i] === '.') {
        i++;
        let cls = '';
        while (i < s.length && /[^.#\[ >+~,]/.test(s[i])) cls += s[i++];
        compound.push({ type: 'class', value: cls });
      } else if (s[i] === '[') {
        i++;
        let attrContent = '';
        let depth = 1;
        while (i < s.length && depth > 0) {
          if (s[i] === '[') depth++;
          else if (s[i] === ']') depth--;
          if (depth > 0) attrContent += s[i];
          i++;
        }
        const m = attrContent.match(/^([a-zA-Z0-9_-]+)(?:([~|^$*]?=)(?:"([^"]*)"|'([^']*)'|([^\]]*)))?$/);
        if (m) {
          compound.push({ type: 'attr', attrName: m[1], op: m[2] || '', attrVal: m[3] || m[4] || m[5] || '' });
        }
      } else {
        let tag = '';
        while (i < s.length && /[^.#\[ >+~,]/.test(s[i])) tag += s[i++];
        compound.push({ type: 'tag', value: tag || '*' });
      }
    }

    if (compound.length === 0) break;

    let combinator = null;
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i < s.length) {
      if (s[i] === '>') { combinator = '>'; i++; }
      else if (s[i] === '+') { combinator = '+'; i++; }
      else if (s[i] === '~') { combinator = '~'; i++; }
      else if (/\s/.test(s[i])) { combinator = ' '; }
    }

    steps.push({ compound, combinator });
  }

  return steps;
}

function matchesSimple(node, simple) {
  if (simple.type === 'tag') {
    if (simple.value === '*') return true;
    return node.tagName === simple.value.toUpperCase();
  }
  if (simple.type === 'id') return node.id === simple.value;
  if (simple.type === 'class') return node.classList.contains(simple.value);
  if (simple.type === 'attr') {
    const val = node.getAttribute(simple.attrName);
    if (val === null) return false;
    if (!simple.op) return true;
    switch (simple.op) {
      case '=': return val === simple.attrVal;
      case '~=': return val.split(/\s+/).indexOf(simple.attrVal) !== -1;
      case '|=': return val === simple.attrVal || val.startsWith(simple.attrVal + '-');
      case '^=': return val.startsWith(simple.attrVal);
      case '$=': return val.endsWith(simple.attrVal);
      case '*=': return val.indexOf(simple.attrVal) !== -1;
      default: return false;
    }
  }
  return false;
}

function matchesCompound(node, compound) {
  for (const simple of compound) {
    if (!matchesSimple(node, simple)) return false;
  }
  return true;
}

function selectAll(selector, root) {
  // Handle comma-separated selectors
  const parts = selector.split(',');
  if (parts.length === 1) {
    return selectAllPart(selector.trim(), root);
  }
  const results = [];
  for (const part of parts) {
    const partResults = selectAllPart(part.trim(), root);
    for (const r of partResults) {
      if (results.indexOf(r) === -1) results.push(r);
    }
  }
  return results;
}

function selectAllPart(selector, root) {
  const steps = parseSelector(selector);
  if (steps.length === 0) return [];

  // BFS: collect all elements
  const allEls = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!isElement(node)) continue;
    allEls.push(node);
    for (const child of (node.children || [])) {
      queue.push(child);
    }
  }

  // Step 0: find all elements matching first compound
  let currentMatches = allEls.filter(n => matchesCompound(n, steps[0].compound));

  if (steps.length === 1) return currentMatches;

  // For each subsequent step, filter based on combinator
  for (let s = 1; s < steps.length; s++) {
    const step = steps[s];
    const combinator = steps[s - 1].combinator;
    const nextMatches = [];

    for (const candidate of allEls) {
      if (!matchesCompound(candidate, step.compound)) continue;

      let valid = false;
      if (combinator === '>') {
        // Child combinator: direct parent must be in currentMatches
        if (candidate._parent && currentMatches.indexOf(candidate._parent) !== -1) {
          valid = true;
        }
      } else {
        // Descendant combinator: any ancestor must be in currentMatches
        let ancestor = candidate._parent;
        while (ancestor) {
          if (currentMatches.indexOf(ancestor) !== -1) { valid = true; break; }
          ancestor = ancestor._parent;
        }
      }

      if (valid) nextMatches.push(candidate);
    }

    currentMatches = nextMatches;
  }

  return currentMatches;
}

function makeDoc(opts = {}) {
  const { title = '', body = null, href = 'https://1.next.westlaw.com/Document/I1234567890abcdef1234567890abcdef/View/FullText.html', hostname = '1.next.westlaw.com' } = opts;
  const bodyNode = body || el('body');
  const html = el('html', {}, bodyNode);
  const doc = {
    title,
    href,
    get documentElement() { return html; },
    location: {
      get href() { return href; },
      get hostname() { return hostname; }
    },
    querySelector(sel) {
      const results = selectAll(sel, html);
      return results[0] || null;
    },
    querySelectorAll(sel) {
      return selectAll(sel, html);
    }
  };
  return doc;
}

export { el, makeDoc };
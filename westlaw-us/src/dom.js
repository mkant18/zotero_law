var wlDomWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
var wlDomPageCountRe = /^\(Approx\. \d+ pages?\)$/;
var wlDomGuidRe = /^I[0-9a-f]{32}$/;
var wlDomDocRe = /\/Document\/([^\/?#]+)/;
var wlDomLinkRe = /\/Link\//;
var wlDomCourtLineRe = /\b(Court|Circuit|Tribunal)\b/i;

function wlDomClean(s) {
  if (s == null) return "";
  return s
    .replace(wlDomWatermarkRe, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

// Judicial titles, longest first so "Chief Justice" wins over "Justice".
var wlDomAuthorTitleRe = "associate chief justice|chief justice|senior circuit judge|circuit judge|senior judge|presiding judge|magistrate judge|associate justice|justice|judge";
var wlDomAuthorTitleFirstRe = new RegExp("^(" + wlDomAuthorTitleRe + ")\\s+(.+)$", "i");
var wlDomAuthorNameFirstRe = new RegExp("^(.+?),\\s+(" + wlDomAuthorTitleRe + "|j|c\\.?\\s?j)\\.?$", "i");
var wlDomAuthorSuffixRe = /^(Jr|Sr|II|III|IV|V)\.?$/i;

function wlDomAuthorCaseWord(word) {
  if (!word) return word;
  var dotted = word.charAt(word.length - 1) === ".";
  var bare = dotted ? word.slice(0, -1) : word;
  if (/^(II|III|IV|V)$/i.test(bare)) return bare.toUpperCase() + (dotted ? "." : "");
  if (/[a-z]/.test(word)) return word;
  var lower = word.toLowerCase();
  var cased = lower.replace(/(^|['’\-])([a-z])/g, function(_, sep, ch) { return sep + ch.toUpperCase(); });
  return cased.replace(/\bMc([a-z])/g, function(_, ch) { return "Mc" + ch.toUpperCase(); });
}

function wlDomSplitAuthorName(name) {
  var cased = wlDomClean(name).split(/\s+/).map(wlDomAuthorCaseWord).filter(Boolean);
  if (!cased.length) return null;
  if (/^the$/i.test(cased[0]) && cased.length === 2 && /^court$/i.test(cased[1])) return null;
  var last = cased[cased.length - 1];
  var rest = cased.slice(0, -1);
  if (rest.length && wlDomAuthorSuffixRe.test(last)) {
    last = rest.pop() + " " + last;
  }
  return {
    firstName: rest.join(" "),
    lastName: last,
    creatorType: "author"
  };
}

// The lead-author line is the opinion's author, not the panel sentence.
// "Associate Chief Justice Lee, opinion of the Court:" → Lee
// "BROOKSHIRE, Justice." → Brookshire
// "PER CURIAM:" → Per Curiam
function wlDomParseLeadAuthor(text) {
  var cleaned = wlDomClean(text).replace(/[:\s]+$/, "");
  if (!cleaned) return null;
  if (/^per curiam\b/i.test(cleaned)) {
    return { firstName: "", lastName: "Per Curiam", creatorType: "author", fieldMode: 1 };
  }
  cleaned = cleaned.replace(/,?\s+(?:delivered|authored|announced)\b.*$/i, "");
  cleaned = cleaned.replace(/,?\s+opinion of the court\.?$/i, "");
  cleaned = wlDomClean(cleaned).replace(/[,\s]+$/, "");
  var titled = cleaned.match(wlDomAuthorTitleFirstRe);
  if (titled) return wlDomSplitAuthorName(titled[2]);
  var named = cleaned.match(wlDomAuthorNameFirstRe);
  if (named) return wlDomSplitAuthorName(named[1]);
  return null;
}

function wlDomAuthorLastKey(last) {
  return String(last || "").replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/i, "").toLowerCase();
}

function wlDomAuthorFirstOk(first) {
  var words = String(first || "").split(/\s+/).filter(Boolean);
  var titleRe = /^(associate|chief|senior|circuit|presiding|magistrate|justice|judge|j|cj)$/i;
  for (var i = 0; i < words.length; i++) {
    if (!titleRe.test(words[i].replace(/\./g, ""))) return true;
  }
  return false;
}

function wlDomAuthorJoinSuffix(text) {
  return wlDomClean(text).replace(/,\s+(Jr|Sr|II|III|IV|V)\b/ig, " $1");
}

// A byline often gives only the surname. The given name is on a short signature
// ("Thomas R. Lee, Associate Chief Justice") or on the byline link's title.
function wlDomParseFullerAuthor(text, lastKey) {
  var cleaned = wlDomAuthorJoinSuffix(text).replace(/[:\s]+$/, "");
  if (!cleaned || cleaned.length > 90 || /\d/.test(cleaned)) return null;
  if (/\b(authored|delivered|announced|opinion|which|joined|writing|concurr|dissent|panel|versus|\bv\.)\b/i.test(cleaned)) return null;
  var titled = new RegExp("\\b(" + wlDomAuthorTitleRe + ")\\b", "i").test(cleaned);
  cleaned = cleaned.replace(new RegExp("(?:,\\s+|\\s+)(" + wlDomAuthorTitleRe + ")\\.?$", "i"), "");
  cleaned = wlDomClean(cleaned).replace(/\s+$/, "");
  if (!/\b(Jr|Sr)\.$/i.test(cleaned)) cleaned = cleaned.replace(/\.$/, "");
  var parsed = null;
  var swapped = cleaned.match(/^([A-Za-z][A-Za-z.'’\-]*),\s+(.+)$/);
  if (swapped && swapped[1].toLowerCase() === lastKey) {
    parsed = wlDomSplitAuthorName(swapped[2] + " " + swapped[1]);
  } else if (!/[,:]/.test(cleaned)) {
    parsed = wlDomSplitAuthorName(cleaned);
  }
  if (!parsed || wlDomAuthorLastKey(parsed.lastName) !== lastKey || !wlDomAuthorFirstOk(parsed.firstName)) return null;
  parsed.score = parsed.firstName.replace(/[^A-Za-z]/g, "").length + (titled ? 20 : 0);
  return parsed;
}

function wlDomAuthorInSkippedBlock(el) {
  var node = el;
  var depth = 0;
  while (node && depth < 12) {
    var cls = typeof node.className === "string" ? node.className : "";
    if (/(^|\s)(co_panelBlock|co_attorneyBlock|co_partyLine|co_docketBlock|co_title|x_dissentAuthorLine)(\s|$)/.test(cls)) return true;
    node = node.parentElement || node._parent || null;
    depth++;
  }
  return false;
}

function wlDomAuthorConsider(best, text, lastKey) {
  var parsed = wlDomParseFullerAuthor(text, lastKey);
  if (!parsed) return best;
  if (!best || parsed.score > best.score) return parsed;
  return best;
}

function wlDomAuthorComplete(doc, partial) {
  if (!partial || partial.fieldMode === 1 || partial.firstName) return partial;
  var lastKey = wlDomAuthorLastKey(partial.lastName);
  if (!lastKey) return partial;
  var best = null;
  var line = doc.querySelector(".x_leadAuthorLine");
  if (line) {
    best = wlDomAuthorConsider(best, line.getAttribute("title"), lastKey);
    best = wlDomAuthorConsider(best, line.getAttribute("aria-label"), lastKey);
    var anchors = line.querySelectorAll("a");
    for (var i = 0; i < anchors.length; i++) {
      best = wlDomAuthorConsider(best, anchors[i].getAttribute("title"), lastKey);
      best = wlDomAuthorConsider(best, anchors[i].getAttribute("aria-label"), lastKey);
      best = wlDomAuthorConsider(best, anchors[i].textContent, lastKey);
    }
  }
  var nodes = doc.querySelectorAll("p, div, span, a, h2, h3, h4");
  for (var n = 0; n < nodes.length; n++) {
    if (wlDomAuthorInSkippedBlock(nodes[n])) continue;
    var text = nodes[n].textContent;
    if (!text || text.length > 120) continue;
    best = wlDomAuthorConsider(best, text, lastKey);
  }
  if (!best) return partial;
  return {
    firstName: best.firstName,
    lastName: best.lastName,
    creatorType: "author"
  };
}

function wlDomReadLeadAuthor(doc) {
  var nodes = doc.querySelectorAll(".x_leadAuthorLine");
  var seen = {};
  for (var i = 0; i < nodes.length; i++) {
    var parsed = wlDomParseLeadAuthor(nodes[i].textContent);
    if (!parsed || !parsed.lastName) continue;
    var key = (parsed.firstName + "\n" + parsed.lastName).toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    return wlDomAuthorComplete(doc, parsed);
  }
  return null;
}

function wlDomValidateGUID(v) {
  return wlDomGuidRe.test(v);
}

function wlDomReadPageContext(doc, url) {
  var reviewReasons = [];
  var ambiguous = false;
  var config = {};
  var secrets = {};

  var scripts = doc.querySelectorAll("script");
  var kv = {};
  var keyPattern = /"(DocumentGuid|ContentType|RelatedInfo|Search|PageEventIdentifier|ResourceToken)"\s*:\s*"([^"]*)"/g;

  for (var i = 0; i < scripts.length; i++) {
    var text = scripts[i].textContent;
    if (!text) continue;
    var m;
    while ((m = keyPattern.exec(text)) !== null) {
      var key = m[1];
      var val = m[2];
      if (!kv[key]) kv[key] = [];
      kv[key].push(val);
    }
  }

  var guidValues = kv["DocumentGuid"] || [];
  var contentTypeValues = kv["ContentType"] || [];
  var riValues = kv["RelatedInfo"] || [];
  var peiValues = kv["PageEventIdentifier"] || [];
  var rtValues = kv["ResourceToken"] || [];
  var searchHosts = (kv["Search"] || []).filter(function(value, index, values) { return values.indexOf(value) === index; });
  if (searchHosts.length === 1 && /^[A-Za-z0-9][A-Za-z0-9.:-]{0,252}$/.test(searchHosts[0])) config.searchHost = searchHosts[0];

  var guidAmbiguous = false;
  var validGUIDs = [];
  for (var g = 0; g < guidValues.length; g++) {
    if (wlDomValidateGUID(guidValues[g])) {
      validGUIDs.push(guidValues[g]);
    }
  }

  if (validGUIDs.length > 1) {
    var uniqGUIDs = [];
    for (var v = 0; v < validGUIDs.length; v++) {
      if (uniqGUIDs.indexOf(validGUIDs[v]) === -1) uniqGUIDs.push(validGUIDs[v]);
    }
    if (uniqGUIDs.length > 1) {
      ambiguous = true;
      guidAmbiguous = true;
      reviewReasons.push("ambiguous-guid");
    }
  }

  if (contentTypeValues.length > 0) {
    var uniqCT = [];
    for (var c = 0; c < contentTypeValues.length; c++) {
      if (uniqCT.indexOf(contentTypeValues[c]) === -1) uniqCT.push(contentTypeValues[c]);
    }
    if (uniqCT.length > 1) {
      ambiguous = true;
    } else {
      config.contentType = uniqCT[0];
    }
  }

  if (riValues.length > 0) {
    var uniqRI = [];
    for (var r = 0; r < riValues.length; r++) {
      if (uniqRI.indexOf(riValues[r]) === -1) uniqRI.push(riValues[r]);
    }
    if (uniqRI.length > 1) {
      ambiguous = true;
    } else {
      config.relatedInfoHost = uniqRI[0];
    }
  }

  var urlGUID = null;
  var docMatch = url.match(wlDomDocRe);
  if (docMatch) {
    var pathGUID = docMatch[1];
    if (wlDomValidateGUID(pathGUID)) {
      urlGUID = pathGUID;
    }
  }

  var identityGUID = null;
  var identityReason = null;

  if (urlGUID) {
    if (validGUIDs.indexOf(urlGUID) !== -1) {
      identityGUID = urlGUID;
    } else {
      identityReason = "identity-mismatch";
    }
  } else if (validGUIDs.length === 1) {
    identityGUID = validGUIDs[0];
  } else {
    var headerAnchor = doc.querySelector("#co_docHeaderTitleLine a[href*=\"/Document/I\"]");
    if (headerAnchor) {
      var href = headerAnchor.getAttribute("href") || "";
      var anchorGUID = href.match(/\/Document\/(I[0-9a-f]{32})/);
      if (anchorGUID && validGUIDs.indexOf(anchorGUID[1]) !== -1) {
        identityGUID = anchorGUID[1];
      } else {
        identityReason = "identity-ambiguous";
      }
    } else {
      identityReason = "identity-ambiguous";
    }
  }

  // Two distinct DocumentGuid values: even one matching the URL is not trustworthy for service calls.
  if (guidAmbiguous) {
    identityGUID = null;
    if (identityReason !== "identity-mismatch") identityReason = "identity-ambiguous";
  }

  config.guid = identityGUID;
  config.identityReason = identityReason;
  config.ambiguous = ambiguous;

  var ok = validGUIDs.length > 0 || identityGUID !== null;

  // Validate and resolve secrets
  var tokenPattern = /^[A-Za-z0-9._~+\/=:\|-]{8,512}$/;
  var peiValid = [];
  for (var p = 0; p < peiValues.length; p++) {
    if (tokenPattern.test(peiValues[p])) peiValid.push(peiValues[p]);
  }
  var rtValid = [];
  for (var r = 0; r < rtValues.length; r++) {
    if (tokenPattern.test(rtValues[r])) rtValid.push(rtValues[r]);
  }

  var peiUniq = [];
  for (var p2 = 0; p2 < peiValid.length; p2++) {
    if (peiUniq.indexOf(peiValid[p2]) === -1) peiUniq.push(peiValid[p2]);
  }
  var rtUniq = [];
  for (var r2 = 0; r2 < rtValid.length; r2++) {
    if (rtUniq.indexOf(rtValid[r2]) === -1) rtUniq.push(rtValid[r2]);
  }

  var secrets = null;
  if (peiUniq.length === 1 && rtUniq.length === 1) {
    secrets = { resourceToken: rtUniq[0], pageEventId: peiUniq[0] };
  } else if (peiValues.length > 0 || rtValues.length > 0) {
    if (peiUniq.length === 0 || rtUniq.length === 0) {
      reviewReasons.push("missing-config");
    } else {
      reviewReasons.push("ambiguous-config");
    }
  } else {
    reviewReasons.push("missing-config");
  }
  if (guidAmbiguous) secrets = null;

  return {
    ok: ok,
    config: config,
    secrets: secrets,
    ambiguous: ambiguous,
    reviewReasons: reviewReasons
  };
}

function wlDomInspectCaseReadiness(doc, url) {
  var host = doc.location.hostname || "";
  if (host !== "1.next.westlaw.com") {
    return { isCase: false, capability: null, reason: "wrong-host" };
  }

  var header = doc.querySelector("#co_docHeaderTitleLine");
  var headerCitation = doc.querySelector("#co_docHeaderCitation");
  if (!header && !headerCitation) {
    return { isCase: false, capability: null, reason: "no-header" };
  }

  var ctx = wlDomReadPageContext(doc, url);
  var contentType = ctx.config && ctx.config.contentType;

  if (ctx.config && ctx.config.identityReason === "identity-mismatch") {
    return { isCase: false, capability: null, reason: "identity-mismatch" };
  }

  var title = doc.title || "";
  var titleParts = title.split(" | ");
  var hasCasesTitle = false;
  for (var i = 0; i < titleParts.length; i++) {
    if (titleParts[i] === "Cases") {
      hasCasesTitle = true;
      break;
    }
  }

  var hasCaseDOM = false;
  if (header) {
    var headerText = wlDomClean(header.textContent);
    if (headerText) hasCaseDOM = true;
  }
  if (!hasCaseDOM && headerCitation) {
    var lis = doc.querySelectorAll("#co_docHeaderCitation > li");
    if (lis.length > 0) hasCaseDOM = true;
  }

  if (contentType) {
    if (contentType !== "Cases") {
      return { isCase: false, capability: null, reason: "non-case-content-type" };
    }
    if (hasCasesTitle && hasCaseDOM) {
      if (ctx.config.guid && ctx.config.relatedInfoHost && ctx.secrets) {
        return { isCase: true, capability: "service", reason: "content-type-cases" };
      }
      return { isCase: true, capability: "dom-only", reason: "content-type-cases-no-secrets" };
    }
    return { isCase: true, capability: "dom-only", reason: "content-type-cases" };
  }

  if (hasCasesTitle && hasCaseDOM) {
    return { isCase: true, capability: "dom-only", reason: "title-cases-no-config" };
  }

  return { isCase: false, capability: null, reason: "not-a-case" };
}

function wlDomClassifyLI(liText) {
  var dateLiText = liText.replace(/\.$/, "");
  var date = wlTextParseUSDate(dateLiText);
  if (date) return { kind: "date", date: date, dateText: dateLiText };

  if (wlDomPageCountRe.test(liText)) {
    return { kind: "pageCount", text: liText };
  }

  var cits = wlRepFindCitations(liText);
  if (cits.length > 0) {
    return { kind: "citation", citations: cits, text: liText };
  }

  return { kind: "unparsed", text: liText, raw: liText };
}

// Docket block text -> normalized "No. X" values. Anything that is not a docket number (parentheticals,
// "Division B", unprefixed text) is reported through `unparsed` instead of becoming a docket or vanishing.
function wlDomParseDocketText(text) {
  var dockets = [];
  var unparsed = false;
  var work = text.replace(/\.+$/, "");
  var withoutParens = work.replace(/\([^)]*\)/g, " ");
  if (withoutParens !== work) unparsed = true;
  work = wlDomClean(withoutParens).replace(/\.+$/, "");
  work = work.replace(/^Docket\s+(?=Nos?\.?\s)/i, "");
  if (!/^Nos?\.?\s/.test(work)) {
    if (work) unparsed = true;
    return { dockets: dockets, unparsed: unparsed };
  }
  work = work.replace(/\bconsolidated\s+with\b/gi, ";");
  var segments = work.split(/;\s*|,\s*|\s+and\s+/);
  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i].trim().replace(/\.+$/, "").replace(/^Nos?\.?\s*/, "").trim();
    if (!seg) continue;
    if (/[0-9]/.test(seg) && /^[A-Za-z0-9][A-Za-z0-9 .\-\u2010-\u2015\/:]*$/.test(seg) &&
        !/^(division|div\.|section|sec\.|chamber|panel)\b/i.test(seg)) {
      dockets.push("No. " + seg);
    } else {
      unparsed = true;
    }
  }
  return { dockets: dockets, unparsed: unparsed };
}

function wlDomReadAuthor(doc, reviewReasons) {
  var lines = doc.querySelectorAll(".x_leadAuthorLine");
  var names = [];
  for (var i = 0; i < lines.length; i++) {
    if (wlDomAuthorSkipped(lines[i])) continue;
    var line = wlDomClean(lines[i].textContent).replace(/,\s*opinion of the Court[:.]?$/i, "");
    var artifacts = lines[i].querySelectorAll(".co_starPage, .co_infoBox");
    for (var a = 0; a < artifacts.length; a++) line = wlDomClean(line.replace(wlDomClean(artifacts[a].textContent), ""));
    var name = "";
    if (/^per curiam[:.]?$/i.test(line)) name = "Per Curiam";
    else {
      var match = line.match(/^(?:Opinion\s+(?:by|of)\s+)?(.+?)(?:,\s*|\s+)(?:(?:Senior|Chief|Associate|United States|U\.?S\.?|District|Circuit|Magistrate|Bankruptcy)\s+)*(?:Judge|Justice|J\.|C\.?J\.?)[:.]?$/i);
      if (!match) match = line.match(/^(?:(?:Senior|Chief|Associate|United States|District|Circuit|Magistrate|Bankruptcy)\s+)*(?:Judge|Justice)\s+(.+?)[:.]?$/i);
      if (!match) match = line.match(/^(?:Mr\.?\s+)?(?:(?:Chief|Associate)\s+)?Justice\s+(.+?)\s+delivered the opinion of the Court\.?$/i);
      if (match) name = match[1];
    }
    if (!name || name.length > 200 || !/^[\p{L}\p{M} .'’-]+(?:,\s*(?:Jr\.?|Sr\.?|II|III|IV))?$/u.test(name) || /\b(?:and|before|opinion|delivered|by)\b/i.test(name)) {
      if (reviewReasons.indexOf("author-unparsed") === -1) reviewReasons.push("author-unparsed");
      continue;
    }
    var author = wlDomSplitAuthor(name);
    author.source = "lead-majority-byline";
    author.evidence = line;
    // Only evidence explicitly attached to this byline may enrich a surname.
    if (!author.firstName && author.fieldMode !== 1) {
      var records = [lines[i]].concat(Array.prototype.slice.call(lines[i].querySelectorAll("a, button")));
      var fuller = [];
      records.forEach(function(record) {
        ["title", "aria-label"].forEach(function(attr) {
          var text = wlDomClean(record.getAttribute(attr));
          if (!text || text.length > 200 || /\b(?:panel|dissent|concurr|opinion|before|and)\b/i.test(text)) return;
          text = text.replace(/^(?:Hon\.?|Judge|Justice)\s+/i, "").replace(/,\s*(?:Judge|Justice)\.?$/i, "");
          if (!/^[\p{L}\p{M} .'’-]+(?:,\s*(?:Jr\.?|Sr\.?|II|III|IV))?$/u.test(text)) return;
          var candidate = wlDomSplitAuthor(text);
          if (!candidate.firstName || candidate.lastName.toLowerCase() !== author.lastName.toLowerCase()) return;
          candidate.source = "lead-byline-linked-" + attr;
          candidate.evidence = text;
          if (!fuller.some(function(n) { return n.firstName === candidate.firstName && n.lastName === candidate.lastName; })) fuller.push(candidate);
        });
      });
      if (fuller.length === 1) author = fuller[0];
      else if (fuller.length > 1 && reviewReasons.indexOf("author-identity-conflict") === -1) reviewReasons.push("author-identity-conflict");
    }
    if (!names.some(function(n) { return n.firstName.toLowerCase() === author.firstName.toLowerCase() && n.lastName.toLowerCase() === author.lastName.toLowerCase(); })) names.push(author);
  }
  if (names.length > 1) reviewReasons.push("author-conflict");
  var result = names.length === 1 && reviewReasons.indexOf("author-unparsed") === -1 ? names[0] : null;
  return result;
}

function wlDomAuthorSkipped(el) {
  for (var node = el; node; node = node.parentElement || node._parent) {
    if (/(^|\s)(?:co_panelBlock|co_attorneyBlock|x_dissentAuthorLine|x_concurAuthorLine|co_dissent|co_concurrence)(\s|$)/i.test(node.className || "")) return true;
  }
  return false;
}

function wlDomSplitAuthor(name) {
  if (name === "Per Curiam") return { creatorType: "author", firstName: "", lastName: name, fieldMode: 1 };
  var parts = name.replace(/,\s*(Jr\.?|Sr\.?|II|III|IV)$/i, " $1").split(/\s+/);
  var last = parts.pop();
  if (/^(?:Jr\.?|Sr\.?|II|III|IV)$/i.test(last) && parts.length) last = parts.pop() + " " + last;
  while (parts.length && /^(?:de|del|della|di|da|dos|du|la|le|van|von|der|den|ten|ter)$/i.test(parts[parts.length - 1])) last = parts.pop() + " " + last;
  return { creatorType: "author", firstName: parts.join(" "), lastName: last };
}

function wlDomLinkedAuthor(text, partial) {
  var name = wlDomClean(text).replace(/^Hon\.?\s+/i, "");
  if (!name || name.length > 200 || !/^[\p{L}\p{M} .'’-]+(?:,\s*(?:Jr\.?|Sr\.?|II|III|IV))?$/u.test(name) || /\b(?:panel|dissent|concurr|opinion|before|and|judge|justice)\b/i.test(name)) return null;
  var author = wlDomSplitAuthor(name);
  var base = function(s) { return s.replace(/,?\s+(?:Jr\.?|Sr\.?|II|III|IV)$/i, "").toLowerCase(); };
  if (!author.firstName || base(author.lastName) !== base(partial.lastName)) return null;
  author.source = "lead-byline-linked-judge-profile";
  author.evidence = wlDomClean(text);
  return author;
}

function wlDomReadJudgeProfile(json, partial, guid) {
  var profile = json && json.snapshotResponse;
  if (typeof guid !== "string" || !/^I[0-9a-f]{32}$/i.test(guid) || !partial || typeof partial.lastName !== "string") return null;
  if (!profile || profile.type !== "judge" || typeof profile.guid !== "string" || profile.guid.toLowerCase() !== guid.toLowerCase()) return null;
  if (typeof profile.firstName !== "string" || typeof profile.lastName !== "string" || typeof profile.fullName !== "string") return null;
  var first = wlDomClean(profile.firstName);
  var last = wlDomClean(profile.lastName);
  var full = wlDomClean(profile.fullName);
  var author = wlDomLinkedAuthor(full, partial);
  if (!author || !first || !last || first.length + last.length > 200 || !/^[\p{L}\p{M} .'’-]+$/u.test(first) || !/^[\p{L}\p{M} .'’-]+(?:,\s*(?:Jr\.?|Sr\.?|II|III|IV))?$/u.test(last) || wlTextCompareKey(first + " " + last) !== wlTextCompareKey(full.replace(/^Hon\.?\s+/i, ""))) return null;
  author.firstName = first;
  author.lastName = last;
  author.profileGuid = profile.guid;
  return author;
}

function wlDomReadFacts(doc) {
  var reviewReasons = [];
  var citations = [];
  var dockets = [];
  var date = null;
  var dateText = null;
  var pageCountText = null;
  var rawCourt = "";
  var headerName = "";
  var guid = null;

  var header = doc.querySelector("#co_docHeaderTitleLine");
  if (header) {
    var rawTitle = wlDomClean(header.getAttribute("title") || header.textContent);
    var caseIdx = rawTitle.indexOf(" | Cases");
    if (caseIdx !== -1) {
      headerName = rawTitle.substring(0, caseIdx);
    } else {
      headerName = rawTitle;
    }
  }

  var ctx = wlDomReadPageContext(doc, "");
  if (ctx.config) {
    guid = ctx.config.guid;
  }

  var seenLis = {};
  // Duplicate IDs are possible (e.g. a sticky copy of the header): read every list, tracking per-list citations.
  var headerLists = doc.querySelectorAll("#co_docHeaderCitation");
  var lis = [];
  var liListIndex = [];
  var listCiteKeys = [];
  var listCourtKeys = [];
  var listDateSeen = [];
  for (var hl = 0; hl < headerLists.length; hl++) {
    listCiteKeys.push([]);
    listCourtKeys.push(null);
    listDateSeen.push(false);
    var kids = headerLists[hl].children || [];
    for (var kd = 0; kd < kids.length; kd++) {
      if (String(kids[kd].tagName).toUpperCase() === "LI") {
        lis.push(kids[kd]);
        liListIndex.push(hl);
      }
    }
  }
  var courtLineFound = false;
  var dateValues = [];

  for (var i = 0; i < lis.length; i++) {
    var liText = wlDomClean(lis[i].textContent);
    if (!liText) continue;

    var classified = wlDomClassifyLI(liText);
    var liList = liListIndex[i];
    // Per-list court line (same rule as the global court pick below) so duplicate headers can be compared.
    if (classified.kind === "unparsed" && listCourtKeys[liList] === null && (!listDateSeen[liList] || wlDomCourtLineRe.test(liText))) {
      listCourtKeys[liList] = liText.toLowerCase();
    }
    if (classified.kind === "date") listDateSeen[liList] = true;
    if (classified.kind === "citation") {
      for (var lk = 0; lk < classified.citations.length; lk++) {
        var lkKey = classified.citations[lk].raw.toLowerCase();
        if (listCiteKeys[liListIndex[i]].indexOf(lkKey) === -1) listCiteKeys[liListIndex[i]].push(lkKey);
      }
    }

    if (seenLis[liText]) continue;
    seenLis[liText] = true;

    if (classified.kind === "date") {
      dateValues.push({ date: classified.date, text: classified.dateText });
      if (!date) {
        date = classified.date;
        dateText = classified.dateText;
      } else if (date !== classified.date) {
        reviewReasons.push("conflicting-header");
      }
    } else if (classified.kind === "pageCount") {
      pageCountText = classified.text;
    } else if (classified.kind === "citation") {
      for (var ci = 0; ci < classified.citations.length; ci++) {
        citations.push(classified.citations[ci]);
      }
    } else if (classified.kind === "unparsed") {
      if (!courtLineFound && (!date || wlDomCourtLineRe.test(liText))) {
        rawCourt = liText;
        courtLineFound = true;
      } else {
        citations.push({ kind: "unparsed", text: liText, raw: liText });
      }
    }
  }

  // Two headers whose citation sets disagree (neither contains the other) are a conflict, not first-wins.
  for (var la = 0; la < listCiteKeys.length; la++) {
    for (var lb = la + 1; lb < listCiteKeys.length; lb++) {
      var keysA = listCiteKeys[la];
      var keysB = listCiteKeys[lb];
      if (!keysA.length || !keysB.length) continue;
      var aInB = keysA.every(function(k) { return keysB.indexOf(k) !== -1; });
      var bInA = keysB.every(function(k) { return keysA.indexOf(k) !== -1; });
      if (!aInB && !bInA && reviewReasons.indexOf("conflicting-header") === -1) {
        reviewReasons.push("conflicting-header");
      }
    }
  }

  // Two headers naming different courts are a conflict too, not first-wins.
  for (var ca = 0; ca < listCourtKeys.length; ca++) {
    for (var cb = ca + 1; cb < listCourtKeys.length; cb++) {
      if (listCourtKeys[ca] !== null && listCourtKeys[cb] !== null && listCourtKeys[ca] !== listCourtKeys[cb] &&
          reviewReasons.indexOf("conflicting-header") === -1) {
        reviewReasons.push("conflicting-header");
      }
    }
  }

  // Facts read without the header list (fallback selectors) are flagged so the record is visibly lower-trust.
  var courtFallbackSupplied = false;

  if (!rawCourt) {
    var courtBlock = doc.querySelector(".co_courtBlock") || doc.querySelector("#courtline");
    if (courtBlock) {
      var courtFallbackText = wlDomClean(courtBlock.textContent);
      if (courtFallbackText && (courtBlock.id !== "courtline" || wlDomCourtLineRe.test(courtFallbackText))) {
        rawCourt = courtFallbackText;
        courtFallbackSupplied = true;
      }
    }
  }

  var docketBlocks = doc.querySelectorAll(".co_docketBlock");
  for (var db = 0; db < docketBlocks.length; db++) {
    var docketText = wlDomClean(docketBlocks[db].textContent);
    if (/^\d+(?:[-/]\d+)*(?:,\s*\d+(?:[-/]\d+)*)*$/.test(docketText.replace(/\.$/, ""))) docketText = "Nos. " + docketText;
    var parsedDocket = wlDomParseDocketText(docketText);
    var docketParts = parsedDocket.dockets;
    if (parsedDocket.unparsed && reviewReasons.indexOf("docket-unparsed-text") === -1) reviewReasons.push("docket-unparsed-text");
    for (var dp = 0; dp < docketParts.length; dp++) {
      var dpKey = typeof wlTextCompareKey === "function" ? wlTextCompareKey(docketParts[dp]) : docketParts[dp];
      var isDup = false;
      for (var dk = 0; dk < dockets.length; dk++) {
        var dkKey = typeof wlTextCompareKey === "function" ? wlTextCompareKey(dockets[dk]) : dockets[dk];
        if (dkKey === dpKey) { isDup = true; break; }
      }
      if (!isDup) dockets.push(docketParts[dp]);
    }
  }

  var dateFallbackSupplied = false;
  if (!date) {
    var fileDate = doc.querySelector("#filedate");
    if (fileDate) {
      var fileDateText = wlDomClean(fileDate.textContent);
      var fileDateValue = wlTextParseUSDate(fileDateText);
      if (fileDateValue) {
        date = fileDateValue;
        dateText = fileDateText;
        dateFallbackSupplied = true;
      }
    }
  }

  var citesFallbackSupplied = false;
  if (!citations.length) {
    var fallbackBlocks = doc.querySelectorAll(".co_cites, #cite0, #cite1, #cite2");
    for (var fb = 0; fb < fallbackBlocks.length; fb++) {
      var citesFallback = fallbackBlocks[fb];
      var citesText = wlDomClean(citesFallback.textContent);
      var fallbackCits = wlRepFindCitations(citesText);
      if (fallbackCits.length > 0) citesFallbackSupplied = true;
      for (var fc = 0; fc < fallbackCits.length; fc++) {
        if (!citations.some(function(c) { return c.raw === fallbackCits[fc].raw; })) citations.push(fallbackCits[fc]);
      }
    }
  }

  if (headerLists.length === 0 && (courtFallbackSupplied || citesFallbackSupplied || dateFallbackSupplied)) {
    reviewReasons.push("header-fallback");
  }

  var leadAuthor = wlDomReadLeadAuthor(doc);
  return {
    ok: true,
    guid: guid,
    contentType: (ctx.config && ctx.config.contentType) || null,
    headerName: headerName,
    author: wlDomReadAuthor(doc, reviewReasons),
    rawCourt: rawCourt,
    dateText: dateText,
    date: date,
    citations: citations,
    dockets: dockets,
    pageCountText: pageCountText,
    authors: leadAuthor ? [leadAuthor] : [],
    reviewReasons: reviewReasons
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlDomReadPageContext: wlDomReadPageContext,
    wlDomInspectCaseReadiness: wlDomInspectCaseReadiness,
    wlDomReadFacts: wlDomReadFacts
  };
}

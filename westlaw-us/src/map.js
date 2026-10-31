var wlMapWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/;
var wlMapHtmlRe = /<[a-zA-Z]/;
var wlMapTokenRe = /ResourceToken|PageEventIdentifier|x-cobalt|Bearer /;
var wlMapYearParenRe = /\(\d{4}\)/;
var wlMapCiteRe = /\d+ [A-Z].* \d+/;
var wlMapCaseNameCiteRe = /,?\s\d{1,4}\s+[A-Z][A-Za-z0-9.']*(?:\s+[A-Za-z0-9.']+){0,3}\s+\d{1,5}$/;
var wlMapGuidRe = /^I[0-9a-f]{32}$/;
var wlMapDashRe = /[\u2013\u2014]/g;

// Review reasons that are informational: they stay visible as an Extra line but never add the needs-review tag.
var wlMapInformationalReasons = ["header-fallback"];
var wlMapUnparsedPayloadMax = 200;

function wlMapStripWatermark(str) {
  return str.replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "").replace(/\s+/g, " ").trim().normalize("NFC");
}

function wlMapHasDemotingReason(reviewReasons) {
  for (var i = 0; i < reviewReasons.length; i++) {
    if (wlMapInformationalReasons.indexOf(reviewReasons[i]) === -1) {
      return true;
    }
  }
  return false;
}

function wlMapUnparsedPayload(alt) {
  var payload = "";
  if (typeof alt.raw === "string" && alt.raw.trim() !== "") {
    payload = alt.raw;
  } else if (typeof alt.text === "string") {
    payload = alt.text;
  }
  payload = wlMapStripWatermark(payload).replace(/\s+/g, " ").trim();
  if (payload.length > wlMapUnparsedPayloadMax) {
    payload = payload.slice(0, wlMapUnparsedPayloadMax) + "\u2026";
  }
  return payload;
}

function wlMapNormalizeDocketSingle(docket) {
  var s = docket.replace(/\.$/, "");
  var hasPrefix = false;
  if (s.indexOf("No. ") === 0) {
    s = s.slice(4);
    hasPrefix = true;
  }
  s = s.replace(wlMapDashRe, "-");
  if (hasPrefix) {
    s = "No. " + s;
  }
  return s;
}

function wlMapFormatDocketNumber(dockets) {
  if (!dockets || dockets.length === 0) {
    return "";
  }
  if (dockets.length === 1) {
    return wlMapNormalizeDocketSingle(dockets[0]);
  }
  var parts = dockets.map(function(d) {
    var s = d.replace(/\.$/, "");
    s = s.replace(/^Nos?\.\s*/, "");
    s = s.replace(wlMapDashRe, "-");
    return s;
  });
  return "Nos. " + parts.join(", ");
}

function wlMapToZoteroFields(rec, opts) {
  if (!rec || typeof rec !== "object") {
    return { ok: false, reason: "bad-record" };
  }
  opts = opts || {};
  var version = opts.version || "0.0.0-dev";

  var caseName = wlMapStripWatermark(rec.caseName || "");
  var court = wlMapStripWatermark(rec.court || "");
  var dateDecided = wlMapStripWatermark(rec.date || "");
  var docketNumber = wlMapFormatDocketNumber(rec.dockets || []);
  var history = wlMapStripWatermark(rec.history || "");
  if (history.indexOf(", ") === 0) {
    history = history.slice(2);
  }

  var shortTitle = null;
  if (rec.shortName !== null && rec.shortName !== undefined) {
    shortTitle = wlMapStripWatermark(rec.shortName);
  }

  var guid = rec.guid || "";
  var url = "";
  var reviewReasons = (rec.reviewReasons || []).slice();
  if (wlMapGuidRe.test(guid)) {
    url = "https://1.next.westlaw.com/Document/" + guid + "/View/FullText.html";
  } else {
    reviewReasons.push("bad-guid");
  }

  var primary = rec.primary || {};
  var reporter = "";
  var reporterVolume = "";
  var firstPage = "";
  if (primary.kind === "wl") {
    reporter = "WL";
    reporterVolume = wlMapStripWatermark(primary.volume || "");
    firstPage = wlMapStripWatermark(primary.page || "");
  } else {
    reporter = wlMapStripWatermark(primary.reporter || "");
    reporterVolume = wlMapStripWatermark(primary.volume || "");
    firstPage = wlMapStripWatermark(primary.page || "");
  }

  var extraLines = [];
  if (rec.wlPrimary) {
    extraLines.push("Medium: Westlaw");
  }
  if (rec.parentheticalSuffix) {
    extraLines.push("Genre: " + wlMapStripWatermark(rec.parentheticalSuffix));
  }
  var alternates = rec.alternates || [];
  alternates.forEach(function(alt) {
    if (alt.kind === "reporter") {
      extraLines.push("Westlaw parallel citation: " + wlMapStripWatermark(alt.raw || ""));
    }
  });
  if (!rec.wlPrimary) {
    alternates.forEach(function(alt) {
      if (alt.kind === "wl") {
        extraLines.push("Westlaw alternate WL citation: " + wlMapStripWatermark(alt.raw || ""));
      }
    });
  }
  alternates.forEach(function(alt) {
    if (alt.kind === "unparsed") {
      var payload = wlMapUnparsedPayload(alt);
      if (payload !== "") {
        extraLines.push("Westlaw unparsed citation: " + payload);
      }
    }
  });
  extraLines.push("Westlaw court (raw): " + wlMapStripWatermark(rec.rawCourt || ""));
  extraLines.push("Westlaw profile: " + wlMapStripWatermark(rec.profile || ""));
  extraLines.push("Westlaw status: " + wlMapStripWatermark(rec.status || ""));
  reviewReasons.forEach(function(r) {
    extraLines.push("Westlaw review: " + wlMapStripWatermark(r));
  });
  extraLines.push("Westlaw translator: " + version);
  if (opts.build) extraLines.push("Westlaw build: " + opts.build);
  if (opts.importRun) extraLines.push("Westlaw import run: " + opts.importRun);
  if (rec.author && typeof rec.author === "object") {
    extraLines.push("Westlaw author source: " + wlMapStripWatermark(rec.author.source || "lead-majority-byline"));
    extraLines.push("Westlaw author evidence: " + wlMapStripWatermark(rec.author.evidence || ""));
    if (typeof rec.author.profileGuid === "string" && /^I[0-9a-f]{32}$/i.test(rec.author.profileGuid)) extraLines.push("Westlaw author profile: " + rec.author.profileGuid);
  }
  var extra = extraLines.join("\n");

  var tags = [];
  if (wlMapHasDemotingReason(reviewReasons) || rec.status !== "validated-profile") {
    tags.push({ tag: "Westlaw: needs citation review" });
  }

  var creators = [];
  var authors = Array.isArray(rec.authors) ? rec.authors : [];
  for (var ai = 0; ai < authors.length && creators.length < 1; ai++) {
    if (!wlMapAuthorOk(authors[ai])) continue;
    var creator = {
      firstName: authors[ai].firstName || "",
      lastName: authors[ai].lastName,
      creatorType: "author"
    };
    if (authors[ai].fieldMode === 1) creator.fieldMode = 1;
    creators.push(creator);
  }

  var result = {
    itemType: "case",
    caseName: caseName,
    court: court,
    dateDecided: dateDecided,
    docketNumber: docketNumber,
    reporter: reporter,
    reporterVolume: reporterVolume,
    firstPage: firstPage,
    history: history,
    extra: extra,
    tags: tags,
    creators: rec.author ? [typeof rec.author === "object" ? {
      creatorType: "author", firstName: wlMapStripWatermark(rec.author.firstName || ""),
      lastName: wlMapStripWatermark(rec.author.lastName || ""),
      ...(rec.author.fieldMode === 1 ? { fieldMode: 1 } : {})
    } : { creatorType: "author", lastName: wlMapStripWatermark(rec.author), fieldMode: 1 }] : creators,
    attachments: [],
    notes: []
  };
  if (shortTitle !== null) {
    result.shortTitle = shortTitle;
  }
  if (url) {
    result.url = url;
  }

  return result;
}

function wlMapContainsCredential(value, credentialValues) {
  if (typeof value === "string") {
    return credentialValues.some(function(token) {
      return typeof token === "string" && token.length > 0 && value.indexOf(token) !== -1;
    });
  }
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some(function(key) {
    return wlMapContainsCredential(value[key], credentialValues);
  });
}

function wlMapValidateOutgoing(fields, credentialValues) {
  var problems = [];
  if (!fields || typeof fields !== "object") return { ok: false, problems: ["bad-fields"] };
  if (credentialValues && wlMapContainsCredential(fields, credentialValues)) problems.push("captured-credential");
  if (fields.itemType !== "case") problems.push("invalid-item-type:itemType");
  if (typeof fields.caseName !== "string" || !wlMapStripWatermark(fields.caseName)) problems.push("required:caseName");
  var scalarKeys = [
    "itemType", "caseName", "court", "dateDecided", "docketNumber",
    "reporter", "reporterVolume", "firstPage", "history", "shortTitle", "url"
  ];
  scalarKeys.forEach(function(key) {
    var val = fields[key];
    if (val !== undefined && typeof val !== "string") problems.push("invalid-type:" + key);
    if (typeof val !== "string") {
      return;
    }
    if (val.length > 2000) {
      problems.push("value-too-long:" + key);
    }
    if (wlMapWatermarkRe.test(val)) {
      problems.push("watermark:" + key);
    }
    if (wlMapHtmlRe.test(val)) {
      problems.push("html:" + key);
    }
    if (wlMapTokenRe.test(val)) {
      problems.push("token-leak:" + key);
    }
  });

  if (fields.dateDecided && /^\d{4}-\d{2}-\d{2}$/.test(fields.dateDecided)) {
    var parts = fields.dateDecided.split("-");
    var date = new Date(fields.dateDecided + "T00:00:00Z");
    if (!isFinite(date.getTime()) || date.getUTCFullYear() !== Number(parts[0]) || date.getUTCMonth() + 1 !== Number(parts[1]) || date.getUTCDate() !== Number(parts[2])) problems.push("invalid-date:dateDecided");
  } else if (fields.dateDecided && !/^\d{4}$/.test(fields.dateDecided)) problems.push("invalid-date:dateDecided");
  ["reporterVolume", "firstPage"].forEach(function(key) {
    if (fields[key] && !/^\d+$/.test(fields[key])) problems.push("invalid-number:" + key);
  });

  if (typeof fields.extra === "string") {
    var extraLines = fields.extra.split("\n");
    extraLines.forEach(function(line, i) {
      if (line.length > 2000) {
        problems.push("value-too-long:extra[" + i + "]");
      }
      if (wlMapWatermarkRe.test(line)) {
        problems.push("watermark:extra[" + i + "]");
      }
      if (wlMapHtmlRe.test(line)) {
        problems.push("html:extra[" + i + "]");
      }
      if (wlMapTokenRe.test(line)) {
        problems.push("token-leak:extra[" + i + "]");
      }
    });
  }

  if (Array.isArray(fields.tags)) {
    fields.tags.forEach(function(t, i) {
      if (t && typeof t.tag === "string") {
        if (t.tag.length > 2000) {
          problems.push("value-too-long:tags[" + i + "]");
        }
        if (wlMapWatermarkRe.test(t.tag)) {
          problems.push("watermark:tags[" + i + "]");
        }
        if (wlMapHtmlRe.test(t.tag)) {
          problems.push("html:tags[" + i + "]");
        }
        if (wlMapTokenRe.test(t.tag)) {
          problems.push("token-leak:tags[" + i + "]");
        }
      }
    });
  }

  if (Array.isArray(fields.creators)) fields.creators.forEach(function(c, i) {
    if (!c || c.creatorType !== "author" || (c.fieldMode !== undefined && c.fieldMode !== 0 && c.fieldMode !== 1) || typeof c.lastName !== "string" || !c.lastName.trim() || c.lastName.length > 200 || wlMapWatermarkRe.test(c.lastName) || wlMapHtmlRe.test(c.lastName) || wlMapTokenRe.test(c.lastName) || (c.firstName !== undefined && (typeof c.firstName !== "string" || c.firstName.length > 200 || wlMapWatermarkRe.test(c.firstName) || wlMapHtmlRe.test(c.firstName) || wlMapTokenRe.test(c.firstName)))) {
      problems.push("invalid-creator:creators[" + i + "]");
    }
  });
  if (fields.attachments && fields.attachments.length > 0) {
    problems.push("non-empty-attachments");
  }
  if (fields.notes && fields.notes.length > 0) {
    problems.push("non-empty-notes");
  }

  if (typeof fields.firstPage === "string" && fields.firstPage) {
    if (fields.firstPage.indexOf("*") !== -1) {
      problems.push("firstPage-has-star");
    }
    if (fields.firstPage.indexOf("-") !== -1) {
      problems.push("firstPage-has-range");
    }
    if (fields.firstPage.indexOf(",") !== -1) {
      problems.push("firstPage-has-comma");
    }
  }

  ["reporter", "caseName", "court"].forEach(function(key) {
    var val = fields[key];
    if (typeof val === "string" && wlMapYearParenRe.test(val)) {
      problems.push("year-paren:" + key);
    }
  });

  if (typeof fields.caseName === "string") {
    var citeMatch = fields.caseName.match(wlMapCaseNameCiteRe);
    if (citeMatch && citeMatch[0].indexOf(".") !== -1) {
      problems.push("caseName-has-cite");
    }
  }

  if (fields.shortTitle) {
    if (fields.shortTitle === "Id.") {
      problems.push("shortTitle-is-Id");
    }
    if (wlMapCiteRe.test(fields.shortTitle)) {
      problems.push("shortTitle-has-cite");
    }
  }

  if (typeof fields.url === "string" && fields.url) {
    if (fields.url.indexOf("?") !== -1) {
      problems.push("url-has-query");
    }
    if (fields.url.indexOf("#") !== -1) {
      problems.push("url-has-fragment");
    }
  }

  return { ok: problems.length === 0, problems: problems };
}

function wlMapApply(fields, item) {
  if (!item || typeof item !== "object") {
    return item;
  }
  var scalarKeys = [
    "itemType", "caseName", "court", "dateDecided", "docketNumber",
    "reporter", "reporterVolume", "firstPage", "history", "shortTitle", "url", "extra"
  ];
  scalarKeys.forEach(function(key) {
    var val = fields[key];
    if (val === undefined) {
      return;
    }
    if (val === "" && key !== "court") {
      return;
    }
    item[key] = val;
  });

  if (Array.isArray(fields.tags) && Array.isArray(item.tags)) {
    fields.tags.forEach(function(t) {
      item.tags.push(t);
    });
  }

  if (Array.isArray(fields.creators) && Array.isArray(item.creators)) {
    fields.creators.forEach(function(c) { item.creators.push(c); });
  }

  return item;
}

function wlMapAuthorOk(creator) {
  if (!creator || creator.creatorType !== "author") return false;
  var first = typeof creator.firstName === "string" ? creator.firstName : "";
  var last = typeof creator.lastName === "string" ? creator.lastName : "";
  if (!last || last.length > 80 || first.length > 80) return false;
  var nameRe = /^[A-Za-z][A-Za-z.'’\- ]*$/;
  if (!nameRe.test(last)) return false;
  if (first && !nameRe.test(first)) return false;
  if (wlMapWatermarkRe.test(first + last) || wlMapHtmlRe.test(first + last)) return false;
  return true;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlMapToZoteroFields: wlMapToZoteroFields,
    wlMapValidateOutgoing: wlMapValidateOutgoing,
    wlMapHasDemotingReason: wlMapHasDemotingReason,
    wlMapApply: wlMapApply
  };
}

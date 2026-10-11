var wlMapWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/;
var wlMapHtmlRe = /<[a-zA-Z]/;
var wlMapTokenRe = /ResourceToken|PageEventIdentifier|x-cobalt|Bearer /;
var wlMapYearParenRe = /\(\d{4}\)/;
var wlMapCiteRe = /\d+ [A-Z].* \d+/;
var wlMapGuidRe = /^I[0-9a-f]{32}$/;
// A missing header list is recorded for provenance. It does not mean the validated citation needs review.
var wlMapInformationalReasons = ["header-fallback"];
var wlMapDashRe = /[\u2013\u2014]/g;
var wlMapDocketCleanRe = /^[0-9a-zA-Z\u2013\u2014-]+$/;

function wlMapStripWatermark(str) {
  return str.replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "").replace(/\s+/g, " ").trim().normalize("NFC");
}

function wlMapNormalizeDocketSingle(docket) {
  var s = docket.replace(/\.$/, "");
  var hasPrefix = false;
  if (s.indexOf("No. ") === 0) {
    s = s.slice(4);
    hasPrefix = true;
  }
  if (wlMapDocketCleanRe.test(s)) {
    s = s.replace(wlMapDashRe, "-");
  }
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
    if (s.indexOf("No. ") === 0) {
      s = s.slice(4);
    }
    if (wlMapDocketCleanRe.test(s)) {
      s = s.replace(wlMapDashRe, "-");
    }
    return s;
  });
  return "Nos. " + parts.join(", ");
}

function wlMapHasDemotingReason(reviewReasons) {
  for (var i = 0; i < reviewReasons.length; i++) {
    if (wlMapInformationalReasons.indexOf(reviewReasons[i]) === -1) return true;
  }
  return false;
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
      extraLines.push("Westlaw unparsed citation: " + wlMapStripWatermark(alt.raw || ""));
    }
  });
  extraLines.push("Westlaw court (raw): " + wlMapStripWatermark(rec.rawCourt || ""));
  extraLines.push("Westlaw profile: " + wlMapStripWatermark(rec.profile || ""));
  extraLines.push("Westlaw status: " + wlMapStripWatermark(rec.status || ""));
  reviewReasons.forEach(function(r) {
    extraLines.push("Westlaw review: " + wlMapStripWatermark(r));
  });
  extraLines.push("Westlaw translator: " + version);
  var extra = extraLines.join("\n");

  var tags = [];
  if (wlMapHasDemotingReason(reviewReasons) || rec.status !== "validated-profile") {
    tags.push({ tag: "Westlaw: needs citation review" });
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
    creators: rec.author ? [{ creatorType: "author", lastName: wlMapStripWatermark(rec.author), fieldMode: 1 }] : [],
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

function wlMapValidateOutgoing(fields) {
  var problems = [];
  if (!fields || typeof fields !== "object") return { ok: false, problems: ["bad-fields"] };
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
    if (!c || c.creatorType !== "author" || c.fieldMode !== 1 || typeof c.lastName !== "string" || !c.lastName.trim() || c.lastName.length > 200 || wlMapWatermarkRe.test(c.lastName) || wlMapHtmlRe.test(c.lastName) || wlMapTokenRe.test(c.lastName)) {
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

  if (typeof fields.shortTitle === "string" && fields.shortTitle) {
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlMapToZoteroFields: wlMapToZoteroFields,
    wlMapValidateOutgoing: wlMapValidateOutgoing,
    wlMapApply: wlMapApply
  };
}

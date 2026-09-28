function wlRecClean(s) {
  if (s == null) return "";
  return s
    .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

function wlRecCitationMatchKey(c) {
  return c.kind + "|" + c.volume + "|" + wlTextCompareKey(c.reporter || "") + "|" + c.page;
}

function wlRecCitationInHistory(citation, history) {
  if (!history || !citation) return false;
  var key = wlRecCitationMatchKey(citation);
  var parts = key.split("|");
  if (parts.length < 4) return false;
  var vol = parts[1];
  var repKey = parts[2];
  var page = parts[3];
  var histClean = wlTextClean(history);
  var repCanon = wlTextCompareKey(parts[2].replace(/\s/g, ""));
  var repSearch = repCanon.replace(/\s/g, "");
  var re = new RegExp("\\b" + vol + "\\s+" + repSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+" + page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
  return re.test(histClean);
}

function wlRecBuildDomOnlyRecord(dom, context, profile, reviewReasons, provenance) {
  var primary = null;
  if (dom.citations && dom.citations.length > 0) {
    for (var i = 0; i < dom.citations.length; i++) {
      if (dom.citations[i].kind === "reporter") {
        primary = dom.citations[i];
        break;
      }
    }
    if (!primary) {
      primary = dom.citations[0];
    }
  }

  var classification = wlProfClassifyCourt(dom.rawCourt || "");
  var courtResult = wlProfCourtForCitation(classification, primary, null);
  if (courtResult.reviewReasons) {
    for (var r = 0; r < courtResult.reviewReasons.length; r++) {
      reviewReasons.push(courtResult.reviewReasons[r]);
    }
  }

  var date = dom.date || null;
  if (!date && dom.dateText) {
    date = wlTextParseUSDate(dom.dateText);
  }

  provenance.caseName = "dom";
  provenance.primary = "dom";
  provenance.date = date ? "dom" : "service";
  provenance.dockets = "dom";
  provenance.court = "dom";

  return {
    guid: dom.guid || null,
    url: context.url || "",
    caseName: wlRecClean(dom.headerName || ""),
    shortName: null,
    court: courtResult.court || "",
    rawCourt: dom.rawCourt || "",
    date: date,
    dockets: dom.dockets || [],
    primary: primary,
    alternates: [],
    history: "",
    parentheticalSuffix: "",
    wlPrimary: false,
    profile: "dom-only",
    status: "metadata-only",
    reviewReasons: reviewReasons,
    provenance: provenance
  };
}

function wlRecReconcile(input) {
  var context = input.context || {};
  var dom = input.dom || {};
  var svcA = input.svcA || {};
  var svcB = input.svcB || {};
  var profile = input.profile || "standard";

  var guid = context.guid || dom.guid || null;
  var url = context.url || "";
  var reviewReasons = [];
  var provenance = {};

  try {
    // 1. Service A failure → metadata-only from DOM
    if (svcA.category !== "ok") {
      reviewReasons.push("service-" + (svcA.category || "unknown"));
      return wlRecBuildDomOnlyRecord(dom, context, profile, reviewReasons, provenance);
    }

    // 2. Parse A forms — for texas profile, prefer texas.long; fall back to standard.long
    var parsedA = null;
    var aLongText = null;
    var aShorts = [];
    if (svcA.envelope) {
      if (profile === "texas" && svcA.envelope.styles.texas && svcA.envelope.styles.texas.long) {
        aLongText = svcA.envelope.styles.texas.long;
        aShorts = svcA.envelope.styles.texas.shorts || [];
      } else {
        aLongText = svcA.envelope.styles.standard && svcA.envelope.styles.standard.long;
        aShorts = svcA.envelope.styles.standard && svcA.envelope.styles.standard.shorts || [];
      }
      if (aLongText) {
        if (profile === "texas") {
          parsedA = wlCiteParseTexasForm(aLongText);
        } else {
          parsedA = wlCiteParseStandardForm(aLongText);
        }
      }
    }

    // 3. Parse B forms
    var parsedBstd = null;
    var parsedBinv = null;
    if (svcB.category === "ok" && svcB.envelope) {
      var bLongText = svcB.envelope.styles.standard && svcB.envelope.styles.standard.long;
      if (bLongText) {
        parsedBstd = wlCiteParseStandardForm(bLongText);
      }
      var bEnhancedText = svcB.envelope.styles.westlaw && svcB.envelope.styles.westlaw.enhanced;
      if (bEnhancedText) {
        parsedBinv = wlCiteParseWestlawInventory(bEnhancedText);
      }
    } else if (svcB.category !== "ok" && svcA.category === "ok") {
      reviewReasons.push("inventory-" + (svcB.category || "unknown"));
    }

    // 4. Round-trip checks
    if (parsedA && parsedA.ok && aLongText) {
      var rtA = wlCiteRoundTrip(parsedA, aLongText);
      if (!rtA.ok) {
        reviewReasons.push("round-trip-mismatch");
      }
    }
    if (parsedBstd && parsedBstd.ok && svcB.envelope && svcB.envelope.styles.standard && svcB.envelope.styles.standard.long) {
      var rtB = wlCiteRoundTrip(parsedBstd, svcB.envelope.styles.standard.long);
      if (!rtB.ok) {
        reviewReasons.push("round-trip-mismatch");
      }
    }

    // 5. caseName
    var caseName = "";
    if (parsedA && parsedA.ok && parsedA.name) {
      caseName = parsedA.name;
      provenance.caseName = "service";
    } else if (dom.headerName) {
      caseName = wlRecClean(dom.headerName);
      reviewReasons.push("name-from-dom");
      provenance.caseName = "dom";
    }

    // 6. primary citation
    var primary = null;
    var wlPrimary = false;
    var serviceCitations = [];
    if (parsedA && parsedA.ok && parsedA.citations) {
      serviceCitations = parsedA.citations;
    }

    // Find first reporter citation in service main run
    var firstReporterCite = null;
    var firstWLCite = null;
    for (var i = 0; i < serviceCitations.length; i++) {
      if (serviceCitations[i].kind === "reporter" && !firstReporterCite) {
        firstReporterCite = serviceCitations[i];
      }
      if (serviceCitations[i].kind === "wl" && !firstWLCite) {
        firstWLCite = serviceCitations[i];
      }
    }

    // Check if DOM has citations
    var domCitations = dom.citations || [];
    var domReporterCites = [];
    var domUSCite = null;
    for (var d = 0; d < domCitations.length; d++) {
      if (domCitations[d].kind === "reporter") {
        domReporterCites.push(domCitations[d]);
      }
      if (domCitations[d].kind === "reporter" && domCitations[d].reporter === "U.S.") {
        domUSCite = domCitations[d];
      }
    }

    // Track whether service primary conflicts with DOM (for R3: conflicting service cites become unparsed)
    var servicePrimaryConflictsWithDOM = false;

    // Determine primary
    if (firstReporterCite) {
      // Check if service reporter citation matches a DOM citation
      var matchesDOM = false;
      for (var dc = 0; dc < domReporterCites.length; dc++) {
        if (firstReporterCite.volume === domReporterCites[dc].volume &&
            wlTextCompareKey(firstReporterCite.reporter) === wlTextCompareKey(domReporterCites[dc].reporter) &&
            firstReporterCite.page === domReporterCites[dc].page) {
          matchesDOM = true;
          break;
        }
      }

      if (matchesDOM || domReporterCites.length === 0) {
        primary = firstReporterCite;
        provenance.primary = domReporterCites.length === 0 ? "service" : "both";
      } else {
        // Conflict: prefer U.S. cite if SCOTUS, else DOM first reporter cite
        var classification = wlProfClassifyCourt(dom.rawCourt || "");
        if (domUSCite && classification.system === "federal" && classification.level === "supreme") {
          primary = domUSCite;
        } else {
          primary = domReporterCites[0];
        }
        reviewReasons.push("primary-conflict");
        provenance.primary = "dom";
        servicePrimaryConflictsWithDOM = true;
      }
    } else if (firstWLCite) {
      primary = firstWLCite;
      wlPrimary = true;
      provenance.primary = "service";
    } else if (domReporterCites.length > 0) {
      primary = domReporterCites[0];
      provenance.primary = "dom";
    } else if (domCitations.length > 0) {
      primary = domCitations[0];
      provenance.primary = "dom";
    } else {
      reviewReasons.push("no-citation");
      provenance.primary = "service";
    }

    // 7. alternates
    var alternates = [];
    var alternateKeys = {};
    var primaryKey = primary ? wlRecCitationMatchKey(primary) : null;

    // Collect history citations to exclude
    var historyCites = [];
    if (parsedA && parsedA.ok && parsedA.history) {
      var histCites = wlRepFindCitations(parsedA.history);
      for (var hc = 0; hc < histCites.length; hc++) {
        historyCites.push(wlRecCitationMatchKey(histCites[hc]));
      }
    }

    function wlRecAddAlternate(cite) {
      if (!cite) return;
      var key = wlRecCitationMatchKey(cite);
      if (key === primaryKey) return;
      if (alternateKeys[key]) return;
      // Exclude citations found in history
      for (var h = 0; h < historyCites.length; h++) {
        if (key === historyCites[h]) return;
      }
      alternateKeys[key] = true;
      alternates.push(cite);
    }

    // Service A main run citations (excluding primary)
    // R3: conflicting service primary becomes kind "unparsed" in alternates
    var convertedToUnparsed = {};
    if (parsedA && parsedA.ok && parsedA.citations) {
      for (var ac = 0; ac < parsedA.citations.length; ac++) {
        var cite = parsedA.citations[ac];
        if (servicePrimaryConflictsWithDOM && cite.kind === "reporter" && firstReporterCite && wlRecCitationMatchKey(cite) === wlRecCitationMatchKey(firstReporterCite)) {
          // This is the conflicting service primary — keep as unparsed
          var unparsedCite = { kind: "unparsed", raw: cite.raw || (cite.volume + " " + cite.reporter + " " + cite.page) };
          wlRecAddAlternate(unparsedCite);
          convertedToUnparsed[wlRecCitationMatchKey(cite)] = true;
        } else if (convertedToUnparsed[wlRecCitationMatchKey(cite)]) {
          // Skip original reporter version of a converted citation
        } else {
          wlRecAddAlternate(cite);
        }
      }
    }

    // B-standard long citations
    if (parsedBstd && parsedBstd.ok && parsedBstd.citations) {
      for (var bc = 0; bc < parsedBstd.citations.length; bc++) {
        wlRecAddAlternate(parsedBstd.citations[bc]);
      }
    }

    // B-inventory citations
    if (parsedBinv && parsedBinv.citations) {
      for (var ic = 0; ic < parsedBinv.citations.length; ic++) {
        wlRecAddAlternate(parsedBinv.citations[ic]);
      }
    }

    // DOM citations
    for (var dc2 = 0; dc2 < domCitations.length; dc2++) {
      wlRecAddAlternate(domCitations[dc2]);
    }

    provenance.alternates = "service";

    // 8. date
    var date = null;
    if (dom.date) {
      date = dom.date;
      provenance.date = "dom";
    } else if (parsedBinv && parsedBinv.date) {
      date = parsedBinv.date;
      provenance.date = "service";
    } else if (parsedA && parsedA.ok && parsedA.year) {
      date = parsedA.year;
      provenance.date = "service";
    }

    // Year conflict check
    if (date && parsedA && parsedA.ok && parsedA.year) {
      var dateYear = null;
      if (date.length === 4) {
        dateYear = date;
      } else if (date.length === 10 && date.charAt(4) === "-") {
        dateYear = date.substring(0, 4);
      }
      if (dateYear && dateYear !== parsedA.year) {
        reviewReasons.push("year-conflict");
      }
    }

    // 9. dockets
    var dockets = [];
    if (dom.dockets && dom.dockets.length > 0) {
      dockets = dom.dockets.slice();
      provenance.dockets = "dom";
    } else if (parsedBinv && parsedBinv.dockets && parsedBinv.dockets.length > 0) {
      dockets = parsedBinv.dockets.slice();
      provenance.dockets = "service";
    }

    // WL-primary requires at least one docket
    if (wlPrimary && dockets.length === 0) {
      reviewReasons.push("wl-missing-docket");
    }

    // 10. court
    var classification = wlProfClassifyCourt(dom.rawCourt || "");
    var serviceCourt = (parsedA && parsedA.ok) ? parsedA.court : "";
    var courtResult = wlProfCourtForCitation(classification, primary, serviceCourt);
    if (courtResult.reviewReasons) {
      for (var cr = 0; cr < courtResult.reviewReasons.length; cr++) {
        reviewReasons.push(courtResult.reviewReasons[cr]);
      }
    }
    var court = courtResult.court || "";
    provenance.court = "service";

    // WL-primary requires full date
    if (wlPrimary && date && date.length === 4) {
      reviewReasons.push("wl-missing-date");
    }

    // 11. parentheticalSuffix
    var parentheticalSuffix = "";
    if (profile === "texas" && parsedA && parsedA.ok && parsedA.parentheticalSuffix) {
      parentheticalSuffix = parsedA.parentheticalSuffix;
      provenance.parentheticalSuffix = "service";
    }

    // 12. history
    var history = "";
    if (parsedA && parsedA.ok && parsedA.history) {
      history = parsedA.history;
      provenance.history = "service";

      // Texas: check for duplicated suffix in history
      if (profile === "texas" && parentheticalSuffix && history) {
        var histClean = wlTextClean(history);
        var suffixKey = wlTextCompareKey(parentheticalSuffix);
        // Check if history begins with the same writ/petition phrase
        var suffixWords = suffixKey.split(/\s+/);
        if (suffixWords.length > 0) {
          var histPrefix = histClean.split(/\s+/).slice(0, suffixWords.length).join(" ");
          if (wlTextCompareKey(histPrefix) === suffixKey) {
            reviewReasons.push("history-duplicates-suffix");
          }
        }
      }
    }

    // 13. shortName
    var shortName = null;
    if (aShorts.length > 0 && primary) {
      shortName = wlCiteSelectShortName(aShorts, primary);
    }
    if (shortName !== null) {
      provenance.shortName = "service";
    }

    // 14. status
    // A category !== ok already returned early (metadata-only from DOM).
    // By this point, svcA.category === "ok".
    var status = "metadata-only";
    if (primary) {
      var bEnvelopeOk = true;
      if (svcB.category !== "ok") bEnvelopeOk = false;
      if (svcB.envelope && !svcB.envelope.ok) bEnvelopeOk = false;
      if (reviewReasons.length === 0 && classification.confidence === "table" && bEnvelopeOk) {
        status = "validated-profile";
      } else {
        status = "unverified-profile";
      }
    }

    // 15. Build and return CaseRecord
    return {
      guid: guid,
      url: url,
      caseName: caseName,
      shortName: shortName,
      court: court,
      rawCourt: dom.rawCourt || "",
      date: date,
      dockets: dockets,
      primary: primary,
      alternates: alternates,
      history: history,
      parentheticalSuffix: parentheticalSuffix,
      wlPrimary: wlPrimary,
      profile: profile,
      status: status,
      reviewReasons: reviewReasons,
      provenance: provenance
    };
  } catch (e) {
    return {
      guid: guid,
      url: url,
      caseName: "",
      shortName: null,
      court: "",
      rawCourt: "",
      date: null,
      dockets: [],
      primary: null,
      alternates: [],
      history: "",
      parentheticalSuffix: "",
      wlPrimary: false,
      profile: "dom-only",
      status: "metadata-only",
      reviewReasons: ["reconcile-error"],
      provenance: provenance
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { wlRecReconcile: wlRecReconcile };
}

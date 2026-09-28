var wlTextWatermarkRe = /[\u200B-\u200F\u2060-\u2064\uFEFF]/g;
var wlTextNbspRe = /[\u00A0\u202F]/g;
var wlTextSpaceCollapseRe = /\s+/g;
var wlTextDashRangeRe = /[\u2010-\u2015\u2212]/g;
var wlTextRightSingleQuoteRe = /\u2019/g;
var wlTextPeriodSpaceRe = /\s*\.\s*/g;

var wlTextMonthNames = [
  { name: "january", abbr: "jan", num: "01" },
  { name: "february", abbr: "feb", num: "02" },
  { name: "march", abbr: "mar", num: "03" },
  { name: "april", abbr: "apr", num: "04" },
  { name: "may", abbr: "may", num: "05" },
  { name: "june", abbr: "jun", num: "06" },
  { name: "july", abbr: "jul", num: "07" },
  { name: "august", abbr: "aug", num: "08" },
  { name: "september", abbr: "sep", short: "sept", num: "09" },
  { name: "october", abbr: "oct", num: "10" },
  { name: "november", abbr: "nov", num: "11" },
  { name: "december", abbr: "dec", num: "12" }
];

function wlTextClean(s) {
  if (s == null) return "";
  return s
    .replace(wlTextWatermarkRe, "")
    .replace(wlTextNbspRe, " ")
    .replace(wlTextSpaceCollapseRe, " ")
    .trim()
    .normalize("NFC");
}

function wlTextNormalizeDashes(s) {
  if (s == null) return "";
  return s.replace(wlTextDashRangeRe, "-");
}

function wlTextCompareKey(s) {
  var cleaned = wlTextClean(s);
  var normalized = wlTextNormalizeDashes(cleaned);
  var deapostrophized = normalized.replace(wlTextRightSingleQuoteRe, "'");
  var lowered = deapostrophized.toLowerCase();
  return lowered.replace(wlTextPeriodSpaceRe, ".");
}

function wlTextParseUSDate(s) {
  if (s == null) return null;
  var trimmed = s.trim();

  // Year-only
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Try full month name or abbreviated month with optional period
  var monthRe = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan\.?|feb\.?|mar\.?|apr\.?|jun\.?|jul\.?|aug\.?|sep\.?|sept\.?|oct\.?|nov\.?|dec\.?)\.?\s+(\d{1,2}),?\s+(\d{4})$/i;
  var m = trimmed.match(monthRe);
  if (m) {
    var monthStr = m[1].toLowerCase().replace(/\./g, "");
    var day = parseInt(m[2], 10);
    var year = m[3];

    var monthInfo = null;
    for (var i = 0; i < wlTextMonthNames.length; i++) {
      if (wlTextMonthNames[i].name === monthStr || wlTextMonthNames[i].abbr === monthStr || wlTextMonthNames[i].short === monthStr) {
        monthInfo = wlTextMonthNames[i];
        break;
      }
    }
    if (!monthInfo) return null;

    var monthNum = parseInt(monthInfo.num, 10);
    var maxDay = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // Check leap year for Feb
    var yearNum = parseInt(year, 10);
    if (monthNum === 2 && yearNum % 4 === 0 && (yearNum % 100 !== 0 || yearNum % 400 === 0)) {
      maxDay[2] = 29;
    }
    if (day < 1 || day > maxDay[monthNum]) return null;

    return year + "-" + monthInfo.num + "-" + String(day).padStart(2, "0");
  }

  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    wlTextClean: wlTextClean,
    wlTextNormalizeDashes: wlTextNormalizeDashes,
    wlTextCompareKey: wlTextCompareKey,
    wlTextParseUSDate: wlTextParseUSDate
  };
}

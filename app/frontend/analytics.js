// Analytics page: shows this session's estimates (kept by history.js) with filters, summary
// figures, a histogram and a table. Everything here comes from the short summaries stored in
// this browser tab. It is not real loan data. All text is written with textContent.
(function () {
  "use strict";

  var BIN_LABELS = ["Under 5%", "5% to 10%", "10% to 20%", "20% to 40%", "40% and above"];
  var BIN_EDGES = [5, 10, 20, 40];
  var LEVELS = ["High", "Slightly reduced", "Reduced", "Low", "Very low"];
  var ABOVE_TEXT = "Above the review threshold";
  var BELOW_TEXT = "Below the review threshold";
  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---------- logic (also tested outside a browser) ----------

  // Same ranges as the calibration table. At the 10% edge the backend's own decision wins, so a
  // rounded 10.00% that the backend called "below" is never counted as "above".
  function binIndex(probabilityPct, above) {
    var index = 0;
    while (index < BIN_EDGES.length && probabilityPct >= BIN_EDGES[index]) { index += 1; }
    if (above && index < 2) { index = 2; }
    if (!above && index >= 2) { index = 1; }
    return index;
  }

  function filterRecords(records, filters) {
    return records.filter(function (r) {
      if (filters.reliability === "none") {
        if (!r.noLabel) { return false; }
      } else if (filters.reliability !== "all") {
        if (r.noLabel || r.reliability !== filters.reliability) { return false; }
      }
      if (filters.result === "above") {
        if (r.noLabel || r.aboveThreshold !== true) { return false; }
      } else if (filters.result === "below") {
        if (r.noLabel || r.aboveThreshold !== false) { return false; }
      }
      return true;
    });
  }

  function summarise(records) {
    var out = {
      total: records.length, labelled: 0, noLabel: 0, average: null, above: 0, below: 0,
      aboveShare: null, byReliability: {}, bins: [0, 0, 0, 0, 0]
    };
    LEVELS.forEach(function (level) { out.byReliability[level] = 0; });
    var sum = 0;
    records.forEach(function (r) {
      if (r.noLabel) { out.noLabel += 1; return; }
      out.labelled += 1;
      sum += r.probabilityPct;
      if (r.aboveThreshold) { out.above += 1; } else { out.below += 1; }
      if (!Object.prototype.hasOwnProperty.call(out.byReliability, r.reliability)) {
        out.byReliability[r.reliability] = 0;
      }
      out.byReliability[r.reliability] += 1;
      out.bins[binIndex(r.probabilityPct, r.aboveThreshold)] += 1;
    });
    if (out.labelled > 0) {
      out.average = sum / out.labelled;
      out.aboveShare = 100 * out.above / out.labelled;
    }
    return out;
  }

  function scoresLabel(scores) {
    return scores.length ? scores.join(", ") : "None";
  }

  function sourceLabel(example) {
    return example === "A" ? "Example A" : example === "B" ? "Example B" : "Entered by you";
  }

  function resultLabel(record) {
    if (record.noLabel) { return "No risk label"; }
    return record.aboveThreshold ? ABOVE_TEXT : BELOW_TEXT;
  }

  function timeLabel(iso, now) {
    var date = new Date(iso);
    var today = now || new Date();
    var sameDay = date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    var time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return sameDay ? time : date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + ", " + time;
  }

  // ---------- drawing ----------

  function byId(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function percent(value, digits) {
    return value.toFixed(digits) + "%";
  }

  function renderCards(summary) {
    byId("card-labelled").textContent = String(summary.labelled);
    byId("card-nolabel").textContent = summary.noLabel === 1
      ? "1 more request had no risk label" : summary.noLabel + " more requests had no risk label";
    byId("card-average").textContent = summary.average === null ? "n/a" : percent(summary.average, 2);
    byId("card-above").textContent = summary.aboveShare === null ? "n/a" : percent(summary.aboveShare, 1);
    byId("card-above-sub").textContent = summary.labelled === 0 ? "" :
      summary.above + " of " + summary.labelled + " estimates";
    var list = byId("reliability-counts");
    list.innerHTML = "";
    Object.keys(summary.byReliability).forEach(function (level) {
      var item = el("li");
      item.appendChild(el("span", "", level));
      item.appendChild(el("strong", "", String(summary.byReliability[level])));
      list.appendChild(item);
    });
  }

  function renderHistogram(counts) {
    var W = 520, H = 230, left = 20, right = 20, base = 170, maxHeight = 120, barWidth = 56;
    var slot = (W - left - right) / counts.length;
    var max = Math.max.apply(null, counts.concat([1]));
    var label = "Histogram of estimates by range. " + counts.map(function (count, i) {
      return BIN_LABELS[i] + ": " + count;
    }).join(". ") + ".";
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": label });
    svg.appendChild(svgEl("line", { "class": "axis", x1: left, y1: base, x2: W - right, y2: base }));
    counts.forEach(function (count, i) {
      var h = Math.round(count / max * maxHeight);
      var x = left + i * slot + (slot - barWidth) / 2;
      svg.appendChild(svgEl("rect", {
        "class": i < 2 ? "bar-below" : "bar-above", x: x, y: base - h, width: barWidth, height: h, rx: 4
      }));
      svg.appendChild(svgEl("text", {
        "class": "chart-count", x: x + barWidth / 2, y: base - h - 6, "text-anchor": "middle"
      }, String(count)));
      svg.appendChild(svgEl("text", {
        "class": "chart-text", x: x + barWidth / 2, y: base + 18, "text-anchor": "middle"
      }, BIN_LABELS[i]));
    });
    var tx = left + 2 * slot;
    svg.appendChild(svgEl("line", { "class": "thr-line", x1: tx, y1: 34, x2: tx, y2: base }));
    svg.appendChild(svgEl("text", {
      "class": "chart-text", x: tx, y: 26, "text-anchor": "middle"
    }, "10% review threshold"));
    var holder = byId("histogram");
    holder.innerHTML = "";
    holder.appendChild(svg);
    var body = byId("histogram-body");
    body.innerHTML = "";
    counts.forEach(function (count, i) {
      var row = el("tr");
      row.appendChild(el("th", "", BIN_LABELS[i]));
      row.lastChild.setAttribute("scope", "row");
      row.appendChild(el("td", "num", String(count)));
      body.appendChild(row);
    });
  }

  function renderTable(records) {
    var body = byId("history-body");
    body.innerHTML = "";
    if (records.length === 0) {
      var empty = el("tr");
      var cell = el("td", "", "No estimates match these filters.");
      cell.setAttribute("colspan", "7");
      empty.appendChild(cell);
      body.appendChild(empty);
      return;
    }
    records.slice().reverse().forEach(function (r) {
      var row = el("tr");
      row.appendChild(el("td", "", timeLabel(r.t)));
      row.appendChild(el("td", "", r.loanType));
      row.appendChild(el("td", "", scoresLabel(r.scores)));
      row.appendChild(el("td", "num", r.noLabel ? "None" : percent(r.probabilityPct, 2)));
      row.appendChild(el("td", "", resultLabel(r)));
      row.appendChild(el("td", "", r.noLabel ? "None" : r.reliability));
      row.appendChild(el("td", "", sourceLabel(r.example)));
      body.appendChild(row);
    });
  }

  function currentFilters() {
    return { reliability: byId("filter-reliability").value, result: byId("filter-result").value };
  }

  function render(message) {
    var history = window.SessionHistory;
    var live = byId("session-live");
    if (!history) {
      byId("session-empty").hidden = false;
      byId("session-content").hidden = true;
      live.textContent = "The history script did not load, so no estimates can be shown.";
      return;
    }
    byId("storage-note").hidden = history.isPersistent();
    var records = history.all();
    var hasAny = records.length > 0;
    byId("session-empty").hidden = hasAny;
    byId("session-content").hidden = !hasAny;
    if (!hasAny) {
      live.textContent = message || "";
      return;
    }
    var shown = filterRecords(records, currentFilters());
    var summary = summarise(shown);
    byId("session-count").textContent = "Showing " + shown.length + " of " + records.length +
      (records.length === 1 ? " estimate" : " estimates") + (shown.length === records.length ? "." : " (filters applied).");
    renderCards(summary);
    renderHistogram(summary.bins);
    renderTable(shown);
    live.textContent = message || "";
  }

  function init() {
    byId("filter-reliability").addEventListener("change", function () { render("Filters updated."); });
    byId("filter-result").addEventListener("change", function () { render("Filters updated."); });
    byId("clear-history").addEventListener("click", function () {
      if (window.SessionHistory) { window.SessionHistory.clear(); }
      byId("filter-reliability").value = "all";
      byId("filter-result").value = "all";
      render("History cleared.");
    });
    window.addEventListener("pageshow", function (event) { if (event.persisted) { render(""); } });
    render("");
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  // Exposed only so the logic can be tested outside a browser.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      binIndex: binIndex, filterRecords: filterRecords, summarise: summarise,
      scoresLabel: scoresLabel, sourceLabel: sourceLabel, resultLabel: resultLabel, timeLabel: timeLabel
    };
  }
})();
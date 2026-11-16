// Analytics page, historical section: draws two charts from the figures in the tables on the page.
// The tables are the only place the numbers are written, so a chart and its table cannot disagree,
// and the figures are still readable when JavaScript is off.
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---------- geometry (also tested outside a browser) ----------

  var AUC_AXIS = { min: 0.5, max: 0.8, width: 300 };
  var CAL_AXIS = { max: 50, height: 150 };

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  // Width of a ROC-AUC bar. The axis starts at 0.5, the level of random guessing.
  function aucBarWidth(auc) {
    return clamp((auc - AUC_AXIS.min) / (AUC_AXIS.max - AUC_AXIS.min), 0, 1) * AUC_AXIS.width;
  }

  function calBarHeight(pct) {
    return clamp(pct, 0, CAL_AXIS.max) / CAL_AXIS.max * CAL_AXIS.height;
  }

  // ---------- reading the tables ----------

  function readAucRows(table) {
    return Array.prototype.map.call(table.querySelectorAll("tbody tr"), function (row) {
      return {
        label: row.getAttribute("data-label"),
        auc: parseFloat(row.getAttribute("data-auc")),
        none: row.getAttribute("data-none") === "true",
        reliability: row.children[1].textContent.trim()
      };
    });
  }

  function readCalibrationRows(table) {
    return Array.prototype.map.call(table.querySelectorAll("tbody tr"), function (row) {
      return {
        label: row.children[0].textContent.trim(),
        applicants: parseInt(row.getAttribute("data-n"), 10),
        estimate: parseFloat(row.getAttribute("data-estimate")),
        actual: parseFloat(row.getAttribute("data-actual"))
      };
    });
  }

  // ---------- drawing ----------

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function drawAucChart(rows) {
    var W = 520, labelRight = 148, barLeft = 156, rowHeight = 30, barHeight = 18, top = 10;
    var H = top + rows.length * rowHeight + 46;
    var plotBottom = top + rows.length * rowHeight;
    var label = "Bar chart of ROC-AUC by external scores entered, from highest to lowest. " +
      rows.map(function (r) { return r.label + ": " + r.auc.toFixed(3); }).join(". ") +
      ". The axis starts at 0.5, which is random guessing.";
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": label });
    [0.5, 0.6, 0.7, 0.8].forEach(function (tick) {
      var x = barLeft + aucBarWidth(tick);
      svg.appendChild(svgEl("line", { "class": tick === 0.5 ? "axis" : "grid-line", x1: x, y1: top, x2: x, y2: plotBottom }));
      svg.appendChild(svgEl("text", { "class": "chart-text", x: x, y: plotBottom + 16, "text-anchor": "middle" }, tick.toFixed(1)));
    });
    rows.forEach(function (r, i) {
      var y = top + i * rowHeight + (rowHeight - barHeight) / 2;
      var width = aucBarWidth(r.auc);
      svg.appendChild(svgEl("text", {
        "class": "chart-label", x: labelRight, y: y + barHeight - 4, "text-anchor": "end"
      }, r.label));
      svg.appendChild(svgEl("rect", {
        "class": r.none ? "bar-auc-none" : "bar-auc", x: barLeft, y: y, width: width, height: barHeight, rx: 3
      }));
      svg.appendChild(svgEl("text", {
        "class": "chart-value", x: barLeft + width + 6, y: y + barHeight - 4
      }, r.auc.toFixed(3)));
    });
    svg.appendChild(svgEl("text", {
      "class": "chart-text", x: barLeft + AUC_AXIS.width / 2, y: plotBottom + 36, "text-anchor": "middle"
    }, "ROC-AUC (the axis starts at 0.5, random guessing)"));
    var holder = document.getElementById("auc-chart");
    holder.innerHTML = "";
    holder.appendChild(svg);
  }

  function drawCalibrationChart(rows) {
    var W = 520, H = 232, plotLeft = 44, plotRight = 10, base = 184, barW = 30, gap = 4;
    var slot = (W - plotLeft - plotRight) / rows.length;
    var label = "Paired bar chart comparing the average estimate with the actual default rate in each estimate range. " +
      rows.map(function (r) {
        return r.label + ": estimate " + r.estimate.toFixed(1) + "%, actual " + r.actual.toFixed(1) + "%";
      }).join(". ") + ".";
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": label });
    svg.appendChild(svgEl("rect", { "class": "bar-estimate", x: plotLeft, y: 6, width: 12, height: 12, rx: 2 }));
    svg.appendChild(svgEl("text", { "class": "chart-text", x: plotLeft + 18, y: 16 }, "Average estimate"));
    svg.appendChild(svgEl("rect", { "class": "bar-actual", x: plotLeft + 130, y: 6, width: 12, height: 12, rx: 2 }));
    svg.appendChild(svgEl("text", { "class": "chart-text", x: plotLeft + 148, y: 16 }, "Actually defaulted"));
    [0, 10, 20, 30, 40, 50].forEach(function (tick) {
      var y = base - calBarHeight(tick);
      svg.appendChild(svgEl("line", { "class": tick === 0 ? "axis" : "grid-line", x1: plotLeft, y1: y, x2: W - plotRight, y2: y }));
      svg.appendChild(svgEl("text", { "class": "chart-text", x: plotLeft - 6, y: y + 4, "text-anchor": "end" }, tick + "%"));
    });
    rows.forEach(function (r, i) {
      var start = plotLeft + i * slot + (slot - (2 * barW + gap)) / 2;
      [["bar-estimate", r.estimate, 0], ["bar-actual", r.actual, barW + gap]].forEach(function (bar) {
        var h = calBarHeight(bar[1]);
        svg.appendChild(svgEl("rect", { "class": bar[0], x: start + bar[2], y: base - h, width: barW, height: h, rx: 3 }));
        svg.appendChild(svgEl("text", {
          "class": "chart-value", x: start + bar[2] + barW / 2, y: base - h - 4, "text-anchor": "middle"
        }, bar[1].toFixed(1)));
      });
      var centre = start + barW + gap / 2;
      svg.appendChild(svgEl("text", { "class": "chart-label", x: centre, y: base + 16, "text-anchor": "middle" }, r.label));
      svg.appendChild(svgEl("text", { "class": "chart-text", x: centre, y: base + 31, "text-anchor": "middle" },
        "n = " + r.applicants.toLocaleString("en-US")));
    });
    var holder = document.getElementById("calibration-chart");
    holder.innerHTML = "";
    holder.appendChild(svg);
  }

  function init() {
    var aucTable = document.getElementById("auc-table");
    var calibrationTable = document.getElementById("calibration-table");
    if (aucTable) { drawAucChart(readAucRows(aucTable)); }
    if (calibrationTable) { drawCalibrationChart(readCalibrationRows(calibrationTable)); }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  // Exposed only so the logic can be tested outside a browser.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { aucBarWidth: aucBarWidth, calBarHeight: calBarHeight, AUC_AXIS: AUC_AXIS, CAL_AXIS: CAL_AXIS };
  }
})();
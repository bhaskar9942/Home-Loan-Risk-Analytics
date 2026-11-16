// Home Loan Risk Analytics: Risk Prediction page logic.
// Uses the existing API unchanged: GET /options and POST /predict.
// Blank fields are sent as null, exactly as before.
(function () {
  "use strict";

  var MAX_AMOUNT = 1000000000;

  // Same field rules and wording as the backend (predict.py), in the same order.
  var NUMBER_RULES = [
    { id: "income", label: "Income", required: true, min: 1, max: MAX_AMOUNT },
    { id: "loan_amount", label: "Loan amount", required: true, min: 1, max: MAX_AMOUNT },
    { id: "annuity", label: "Loan annuity", required: true, min: 1, max: MAX_AMOUNT },
    { id: "goods_price", label: "Goods price", required: false, min: 1, max: MAX_AMOUNT },
    { id: "age_years", label: "Age in years", required: true, min: 18, max: 100 },
    { id: "years_employed", label: "Years employed", required: false, min: 0, max: 60 },
    { id: "ext_source_1", label: "External score 1", required: false, min: 0, max: 1 },
    { id: "ext_source_2", label: "External score 2", required: false, min: 0, max: 1 },
    { id: "ext_source_3", label: "External score 3", required: false, min: 0, max: 1 }
  ];
  var CHOICE_RULES = [
    { id: "loan_type", label: "Loan type" },
    { id: "education", label: "Education" }
  ];
  var SCORE_IDS = ["ext_source_1", "ext_source_2", "ext_source_3"];

  var OPTIONS = null;
  var currentExample = null;

  // Two invented applicants. Their results were checked against the backend in earlier tests.
  var BASE_EXAMPLE = {
    loan_type: "Cash loans", education: "Secondary / secondary special",
    income: 150000, loan_amount: 500000, annuity: 25000, age_years: 35,
    goods_price: 450000, years_employed: 5
  };
  var EXAMPLES = {
    "example-a": { name: "Example A", scores: [0.2, 0.15, 0.2] },
    "example-b": { name: "Example B", scores: [0.7, 0.75, 0.8] }
  };

  // Measured on the notebook's test set (61,503 applicants) with all 11 form fields
  // (evaluate_form_inputs.py). Used only for results with High reliability.
  var CALIBRATION = [
    { upTo: 0.05, label: "under 5%", applicants: 25614, predicted: 3.5, actual: 2.9 },
    { upTo: 0.10, label: "5% to 10%", applicants: 20809, predicted: 7.0, actual: 6.9 },
    { upTo: 0.20, label: "10% to 20%", applicants: 11312, predicted: 13.7, actual: 14.5 },
    { upTo: 0.40, label: "20% to 40%", applicants: 3493, predicted: 26.1, actual: 29.2 },
    { upTo: Infinity, label: "40% and above", applicants: 275, predicted: 47.0, actual: 45.5 }
  ];

  // ---------- validation (mirrors the backend; the server still validates too) ----------

  function formatLimit(x) {
    return x >= 1000 ? x.toLocaleString("en-US", { maximumFractionDigits: 0 }) : String(x);
  }

  function validateValues(values, options) {
    var errors = [];
    NUMBER_RULES.forEach(function (rule) {
      var value = values[rule.id];
      if (value === null || value === undefined) {
        if (rule.required) {
          errors.push({ id: rule.id, message: rule.label + " is required." });
        }
        return;
      }
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push({ id: rule.id, message: rule.label + " must be a number." });
        return;
      }
      if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
        errors.push({
          id: rule.id,
          message: rule.label + " must be between " + formatLimit(rule.min) +
            " and " + formatLimit(rule.max) + "."
        });
      }
    });
    CHOICE_RULES.forEach(function (rule) {
      var value = values[rule.id];
      if (value === null || value === undefined || String(value).trim() === "") {
        errors.push({ id: rule.id, message: rule.label + " is required." });
        return;
      }
      var list = options && options[rule.id];
      if (list && list.indexOf(String(value).trim()) === -1) {
        errors.push({
          id: rule.id,
          message: rule.label + " must be one of: " + list.join(", ") + "."
        });
      }
    });
    if (errors.length === 0 && values.years_employed !== null &&
        values.years_employed !== undefined && values.years_employed > values.age_years) {
      errors.push({ id: "years_employed", message: "Years employed cannot be greater than age." });
    }
    return errors;
  }

  // ---------- gauge geometry ----------

  var GAUGE = { cx: 130, cy: 124, r: 92, max: 50 };

  function clampValue(value) {
    return Math.max(0, Math.min(GAUGE.max, value));
  }

  function polar(value, radius) {
    var theta = Math.PI * (1 - clampValue(value) / GAUGE.max);
    return {
      x: GAUGE.cx + radius * Math.cos(theta),
      y: GAUGE.cy - radius * Math.sin(theta)
    };
  }

  function arcPath(from, to, radius) {
    var a = polar(from, radius);
    var b = polar(to, radius);
    return "M " + a.x.toFixed(2) + " " + a.y.toFixed(2) + " A " + radius + " " + radius +
      " 0 0 1 " + b.x.toFixed(2) + " " + b.y.toFixed(2);
  }

  function needleAngle(value) {
    return (clampValue(value) / GAUGE.max) * 180 - 90;
  }

  // ---------- "similar estimates in testing" line ----------

  function calibrationBand(probability, above, thresholdPct) {
    var index = 0;
    while (index < CALIBRATION.length - 1 && probability >= CALIBRATION[index].upTo) {
      index += 1;
    }
    // At the 10% edge, rounding must never contradict the backend's own decision.
    if (thresholdPct === 10) {
      if (above && index < 2) { index = 2; }
      if (!above && index >= 2) { index = 1; }
    }
    return CALIBRATION[index];
  }

  function calibrationLine(result) {
    var band = calibrationBand(result.probability, result.above_threshold, result.threshold_pct);
    var text = "In testing on historical data (61,503 applicants, using the same 11 fields as " +
      "this form), applicants with estimates in the " + band.label + " range were predicted at " +
      band.predicted + "% on average, and " + band.actual + "% of them actually defaulted (" +
      band.applicants.toLocaleString("en-US") + " applicants). This describes groups, not any " +
      "one applicant.";
    if (band.applicants < 500) {
      text += " This is a small group, so treat it with care.";
    }
    return text;
  }

  // ---------- small DOM helpers ----------

  function byId(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fillSelect(id, values) {
    var select = byId(id);
    select.innerHTML = "";
    var placeholder = el("option", "", "Select...");
    placeholder.value = "";
    select.appendChild(placeholder);
    values.forEach(function (value) {
      var option = el("option", "", value);
      option.value = value;
      select.appendChild(option);
    });
  }

  // ---------- field errors and the scores indicator ----------

  function setFieldError(id, message) {
    var input = byId(id);
    var errorId = id + "-error";
    var box = byId(errorId);
    var describedBy = (input.getAttribute("aria-describedby") || "").split(/\s+/)
      .filter(function (part) { return part && part !== errorId; });
    if (!message) {
      if (box) { box.remove(); }
      input.removeAttribute("aria-invalid");
    } else {
      if (!box) {
        box = el("p", "field-error");
        box.id = errorId;
        input.closest(".field").appendChild(box);
      }
      box.textContent = message;
      input.setAttribute("aria-invalid", "true");
      describedBy.push(errorId);
    }
    if (describedBy.length) {
      input.setAttribute("aria-describedby", describedBy.join(" "));
    } else {
      input.removeAttribute("aria-describedby");
    }
  }

  function clearFieldErrors() {
    NUMBER_RULES.concat(CHOICE_RULES).forEach(function (rule) { setFieldError(rule.id, ""); });
  }

  function scoresEntered() {
    return SCORE_IDS.filter(function (id) { return byId(id).value.trim() !== ""; }).length;
  }

  function updateScoreIndicator() {
    var indicator = byId("score-indicator");
    if (!indicator) { return; }
    var n = scoresEntered();
    var text = "Scores entered: " + n + " of 3. ";
    if (n === 3) {
      text += "All three entered: the estimate has the highest reliability.";
    } else if (n === 0) {
      text += "With none, no risk label is shown.";
    } else {
      text += "A reliability warning will be shown with the result.";
    }
    indicator.textContent = text;
  }

  // ---------- result panel ----------

  function showResult(node) {
    var box = byId("result");
    box.innerHTML = "";
    box.removeAttribute("aria-busy");
    box.appendChild(node);
  }

  function clearResult() {
    var box = byId("result");
    box.innerHTML = "";
    box.removeAttribute("aria-busy");
  }

  function focusResult() {
    var heading = byId("result").querySelector("h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    var narrow = window.matchMedia && window.matchMedia("(max-width: 960px)").matches;
    byId("result").scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: narrow ? "start" : "nearest"
    });
  }

  function showLoading() {
    var box = byId("result");
    box.innerHTML = "";
    box.setAttribute("aria-busy", "true");
    var loading = el("div", "loading");
    loading.appendChild(el("span", "spinner"));
    loading.appendChild(el("span", "", "Estimating..."));
    box.appendChild(loading);
  }

  function buildGauge(result) {
    var thresholdPct = result.threshold_pct;
    var baselinePct = result.base_rate_pct;
    var value = result.probability_pct;
    var label = "Gauge: estimated default probability " + value.toFixed(2) +
      "% on a scale from 0 to " + GAUGE.max + "%. The review threshold is at " +
      thresholdPct + "%.";
    if (value > GAUGE.max) {
      label += " The estimate is beyond the end of the scale.";
    }
    var svg = svgEl("svg", {
      "class": "gauge", viewBox: "0 0 260 150", role: "img", "aria-label": label
    });
    svg.appendChild(svgEl("path", {
      "class": "zone zone-low", d: arcPath(0, thresholdPct, GAUGE.r), fill: "none", "stroke-width": 16
    }));
    svg.appendChild(svgEl("path", {
      "class": "zone zone-high", d: arcPath(thresholdPct, GAUGE.max, GAUGE.r),
      fill: "none", "stroke-width": 16
    }));
    var t1 = polar(thresholdPct, GAUGE.r - 16);
    var t2 = polar(thresholdPct, GAUGE.r + 12);
    svg.appendChild(svgEl("line", {
      "class": "tick-threshold", x1: t1.x.toFixed(2), y1: t1.y.toFixed(2),
      x2: t2.x.toFixed(2), y2: t2.y.toFixed(2)
    }));
    var b1 = polar(baselinePct, GAUGE.r - 12);
    var b2 = polar(baselinePct, GAUGE.r + 8);
    svg.appendChild(svgEl("line", {
      "class": "tick-baseline", x1: b1.x.toFixed(2), y1: b1.y.toFixed(2),
      x2: b2.x.toFixed(2), y2: b2.y.toFixed(2)
    }));
    var labelPoint = polar(thresholdPct, GAUGE.r + 22);
    var thresholdLabel = svgEl("text", {
      "class": "gauge-text", x: labelPoint.x.toFixed(2), y: labelPoint.y.toFixed(2),
      "text-anchor": "end"
    });
    thresholdLabel.textContent = thresholdPct + "%";
    svg.appendChild(thresholdLabel);
    var zero = svgEl("text", {
      "class": "gauge-text", x: GAUGE.cx - GAUGE.r, y: GAUGE.cy + 18, "text-anchor": "middle"
    });
    zero.textContent = "0%";
    svg.appendChild(zero);
    var end = svgEl("text", {
      "class": "gauge-text", x: GAUGE.cx + GAUGE.r, y: GAUGE.cy + 18, "text-anchor": "middle"
    });
    end.textContent = GAUGE.max + "%+";
    svg.appendChild(end);
    var group = svgEl("g", { "class": "needle-group" });
    group.appendChild(svgEl("line", {
      "class": "needle", x1: GAUGE.cx, y1: GAUGE.cy, x2: GAUGE.cx, y2: GAUGE.cy - 76
    }));
    group.appendChild(svgEl("circle", { "class": "hub", cx: GAUGE.cx, cy: GAUGE.cy, r: 7 }));
    svg.appendChild(group);
    return { svg: svg, needle: group };
  }

  function animateNeedle(node, toDeg) {
    function setAngle(deg) {
      node.setAttribute("transform",
        "rotate(" + deg.toFixed(2) + " " + GAUGE.cx + " " + GAUGE.cy + ")");
    }
    if (prefersReducedMotion()) {
      setAngle(toDeg);
      return;
    }
    var fromDeg = -90;
    var start = performance.now();
    var duration = 700;
    setAngle(fromDeg);
    function frame(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      setAngle(fromDeg + (toDeg - fromDeg) * eased);
      if (t < 1) { window.requestAnimationFrame(frame); }
    }
    window.requestAnimationFrame(frame);
  }

  function reliabilityClass(level) {
    return "badge badge-" + String(level).toLowerCase().replace(/[^a-z]+/g, "-");
  }

  function renderOk(result) {
    var above = result.above_threshold === true;
    var card = el("div", "card result-card " + (above ? "above" : "below"));
    card.appendChild(el("h2", "", "Estimated default probability"));
    var gauge = buildGauge(result);
    card.appendChild(gauge.svg);
    card.appendChild(el("p", "result-value", result.probability_pct.toFixed(2) + "%"));
    card.appendChild(el("p", "result-level",
      result.risk_level + " (" + result.threshold_pct + "%)"));
    var legend = el("p", "legend");
    legend.appendChild(el("span", "legend-threshold", "Review threshold " + result.threshold_pct + "%"));
    legend.appendChild(el("span", "legend-baseline", "Historical default rate " + result.base_rate_pct + "%"));
    card.appendChild(legend);
    if (result.probability_pct > GAUGE.max) {
      card.appendChild(el("p", "small", "The gauge ends at " + GAUGE.max +
        "%. The exact estimate is shown above."));
    }
    card.appendChild(el("p", "",
      "For comparison, " + result.base_rate_pct + "% of applicants in the training data defaulted."));
    var reliability = el("p", "reliability-row", "Reliability: ");
    reliability.appendChild(el("span", reliabilityClass(result.reliability), result.reliability));
    card.appendChild(reliability);
    if (result.warning) {
      card.appendChild(el("p", "warning", result.warning));
    }
    if (result.reliability === "High") {
      card.appendChild(el("p", "testing-line", calibrationLine(result)));
    }
    if (result.left_blank && result.left_blank.length > 0) {
      card.appendChild(el("p", "small",
        "Left blank and filled with typical values: " + result.left_blank.join(", ") + "."));
    }
    var meaning = el("div", "meaning");
    meaning.appendChild(el("strong", "", "What this means. "));
    meaning.appendChild(document.createTextNode(above
      ? "The estimate is at or above the review threshold, so this case is flagged for a closer " +
        "look. It does not mean this applicant will default: in testing, most applicants flagged " +
        "at this threshold did not default. A person should make the final decision."
      : "The estimate is below the review threshold. This does not guarantee that the applicant " +
        "will repay: in testing, some applicants below the threshold did default. A person " +
        "should make the final decision."));
    card.appendChild(meaning);
    card.appendChild(el("p", "small", result.note));
    showResult(card);
    animateNeedle(gauge.needle, needleAngle(result.probability_pct));
    focusResult();
  }

  function renderNotice(title, message, note) {
    var box = el("div", "notice");
    box.appendChild(el("h2", "", title));
    box.appendChild(el("p", "", message));
    if (note) { box.appendChild(el("p", "small", note)); }
    showResult(box);
    focusResult();
  }

  function renderErrors(messages, title) {
    var box = el("div", "errors");
    box.appendChild(el("h2", "", title || "Please check the form"));
    var list = el("ul");
    messages.forEach(function (message) { list.appendChild(el("li", "", message)); });
    box.appendChild(list);
    showResult(box);
    focusResult();
  }

  // ---------- loading the dropdown values ----------

  async function loadOptions() {
    var status = byId("status");
    try {
      var response = await fetch("/options");
      if (!response.ok) { throw new Error("HTTP " + response.status); }
      var options = await response.json();
      OPTIONS = { loan_type: options.loan_type, education: options.education };
      fillSelect("loan_type", options.loan_type);
      fillSelect("education", options.education);
      status.textContent = "Connected to the backend. Review threshold: " +
        options.threshold_pct + "%.";
      status.className = "status ok";
      byId("examples").hidden = false;
    } catch (error) {
      status.textContent = "Could not reach the backend. Is the server running?";
      status.className = "status error";
    }
  }

  // ---------- reading the form ----------

  function collectValues() {
    var values = {};
    CHOICE_RULES.forEach(function (rule) {
      var value = byId(rule.id).value;
      values[rule.id] = value === "" ? null : value;
    });
    NUMBER_RULES.forEach(function (rule) {
      var input = byId(rule.id);
      var raw = input.value.trim();
      if (raw === "") {
        values[rule.id] = (input.validity && input.validity.badInput) ? NaN : null;
      } else {
        values[rule.id] = Number(raw);
      }
    });
    return values;
  }

  // ---------- examples ----------

  function loadExample(key) {
    var example = EXAMPLES[key];
    var values = Object.assign({}, BASE_EXAMPLE, {
      ext_source_1: example.scores[0], ext_source_2: example.scores[1],
      ext_source_3: example.scores[2]
    });
    Object.keys(values).forEach(function (id) { byId(id).value = String(values[id]); });
    currentExample = key === "example-a" ? "A" : "B";
    clearFieldErrors();
    clearResult();
    updateScoreIndicator();
    var message = byId("example-message");
    if (!message) {
      message = el("p", "small");
      message.id = "example-message";
      message.setAttribute("role", "status");
      byId("examples").appendChild(message);
    }
    message.textContent = example.name + " loaded. This is an invented applicant, not a real " +
      "person. Click Estimate risk to see the result.";
    byId("predict-button").focus();
  }

  // ---------- session history ----------

  // Keeps a short summary of each estimate for the Analytics page. It never stores the entered
  // amounts, age, education or score values, and a storage problem never affects the result.
  function recordHistory(result, values) {
    try {
      if (!window.SessionHistory) { return; }
      var scores = [1, 2, 3].filter(function (i) { return values["ext_source_" + i] !== null; });
      var record = {
        t: new Date().toISOString(), loanType: values.loan_type, scores: scores,
        example: currentExample, noLabel: !result
      };
      if (result) {
        record.probabilityPct = result.probability_pct;
        record.aboveThreshold = result.above_threshold === true;
        record.reliability = result.reliability;
      }
      window.SessionHistory.add(record);
    } catch (error) { /* the history is optional */ }
  }

  // ---------- submitting ----------

  async function handleSubmit(event) {
    event.preventDefault();
    clearFieldErrors();
    byId("scores-fieldset").classList.remove("needs-attention");
    var values = collectValues();
    var problems = validateValues(values, OPTIONS);
    if (problems.length > 0) {
      problems.forEach(function (problem) { setFieldError(problem.id, problem.message); });
      renderErrors(problems.map(function (problem) { return problem.message; }));
      byId(problems[0].id).focus();
      return;
    }
    var button = byId("predict-button");
    button.disabled = true;
    button.textContent = "Estimating...";
    showLoading();
    try {
      var response;
      try {
        response = await fetch("/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        });
      } catch (networkError) {
        renderErrors(["Something went wrong while contacting the backend. Is the server running?"],
          "Backend not reachable");
        return;
      }
      var result;
      try {
        result = await response.json();
      } catch (parseError) {
        renderErrors(["The server returned an unexpected response (HTTP " + response.status + ")."],
          "Unexpected response");
        return;
      }
      if (response.ok && result.status === "ok") {
        renderOk(result);
        recordHistory(result, values);
      } else if (response.ok && result.status === "insufficient_information") {
        byId("scores-fieldset").classList.add("needs-attention");
        renderNotice("Not enough information", result.message, result.note);
        recordHistory(null, values);
      } else {
        renderErrors(result.errors || ["Unexpected response from the server."]);
      }
    } finally {
      button.disabled = false;
      button.textContent = "Estimate risk";
    }
  }

  // ---------- start-up ----------

  function init() {
    var form = byId("applicant-form");
    var indicator = byId("score-indicator");
    if (indicator) {
      indicator.hidden = false;
      updateScoreIndicator();
    }
    loadOptions();
    form.addEventListener("submit", handleSubmit);
    form.addEventListener("reset", function () {
      currentExample = null;
      clearFieldErrors();
      clearResult();
      byId("scores-fieldset").classList.remove("needs-attention");
      var message = byId("example-message");
      if (message) { message.remove(); }
      window.setTimeout(updateScoreIndicator, 0);
    });
    form.addEventListener("input", function (event) {
      currentExample = null;
      var target = event.target;
      if (target && target.id) { setFieldError(target.id, ""); }
      if (SCORE_IDS.indexOf(target.id) !== -1) {
        updateScoreIndicator();
        byId("scores-fieldset").classList.remove("needs-attention");
      }
    });
    form.addEventListener("change", function (event) {
      currentExample = null;
      if (event.target && event.target.id) { setFieldError(event.target.id, ""); }
    });
    byId("example-a").addEventListener("click", function () { loadExample("example-a"); });
    byId("example-b").addEventListener("click", function () { loadExample("example-b"); });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  // Exposed only so the logic can be tested outside a browser.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      validateValues: validateValues, polar: polar, arcPath: arcPath,
      needleAngle: needleAngle, calibrationBand: calibrationBand,
      calibrationLine: calibrationLine, formatLimit: formatLimit, GAUGE: GAUGE
    };
  }
})();
// Session history shared by the Risk Prediction and Analytics pages.
// It keeps a short summary of each estimate in this browser tab only (sessionStorage), and the
// summary disappears when the tab is closed. It never stores income, loan amount, annuity, age,
// goods price, years employed, education or the score values.
(function (root) {
  "use strict";

  var KEY = "hlra.session.history.v1";
  var MAX_ENTRIES = 100;
  var memory = [];
  var useMemory = false;

  function storage() {
    try {
      var s = root.sessionStorage;
      var probe = KEY + ".probe";
      s.setItem(probe, "1");
      s.removeItem(probe);
      return s;
    } catch (error) {
      return null;
    }
  }

  function isScoreList(list) {
    if (!Array.isArray(list) || list.length > 3) { return false; }
    return list.every(function (n, i) {
      return (n === 1 || n === 2 || n === 3) && list.indexOf(n) === i;
    });
  }

  // Builds a clean record from only the allowed fields; anything else is dropped.
  function cleanRecord(raw) {
    if (!raw || typeof raw !== "object") { return null; }
    if (typeof raw.t !== "string" || Number.isNaN(Date.parse(raw.t))) { return null; }
    if (typeof raw.loanType !== "string" || raw.loanType === "") { return null; }
    if (!isScoreList(raw.scores)) { return null; }
    var record = {
      t: raw.t,
      loanType: raw.loanType.slice(0, 40),
      scores: raw.scores.slice().sort(),
      noLabel: raw.noLabel === true,
      example: (raw.example === "A" || raw.example === "B") ? raw.example : null
    };
    if (record.noLabel) {
      record.probabilityPct = null;
      record.aboveThreshold = null;
      record.reliability = null;
      return record;
    }
    if (typeof raw.probabilityPct !== "number" || !Number.isFinite(raw.probabilityPct) ||
        raw.probabilityPct < 0 || raw.probabilityPct > 100) { return null; }
    if (typeof raw.aboveThreshold !== "boolean") { return null; }
    if (typeof raw.reliability !== "string" || raw.reliability === "") { return null; }
    record.probabilityPct = raw.probabilityPct;
    record.aboveThreshold = raw.aboveThreshold;
    record.reliability = raw.reliability.slice(0, 40);
    return record;
  }

  function load() {
    var s = storage();
    if (!s || useMemory) { return memory.slice(); }
    var text = s.getItem(KEY);
    if (text === null) { return []; }
    try {
      var data = JSON.parse(text);
      if (!Array.isArray(data)) { throw new Error("not a list"); }
      return data.map(cleanRecord).filter(Boolean).slice(-MAX_ENTRIES);
    } catch (error) {
      try { s.removeItem(KEY); } catch (ignored) { /* nothing to do */ }
      return [];
    }
  }

  function save(list) {
    var s = storage();
    if (s) {
      try {
        s.setItem(KEY, JSON.stringify(list));
        useMemory = false;
        return;
      } catch (error) { /* fall through to memory */ }
    }
    memory = list.slice();
    useMemory = true;
  }

  function add(record) {
    var clean = cleanRecord(record);
    if (!clean) { return false; }
    var list = load();
    list.push(clean);
    save(list.slice(-MAX_ENTRIES));
    return true;
  }

  function all() {
    return load();
  }

  function clear() {
    memory = [];
    useMemory = false;
    var s = storage();
    if (s) {
      try { s.removeItem(KEY); } catch (error) { /* nothing to do */ }
    }
  }

  function isPersistent() {
    return storage() !== null;
  }

  var api = { add: add, all: all, clear: clear, isPersistent: isPersistent,
              MAX_ENTRIES: MAX_ENTRIES, KEY: KEY };
  root.SessionHistory = api;
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
})(typeof window !== "undefined" ? window : globalThis);
// Dashboard page: checks that the PDF exists, shows the right view for this browser and
// screen, and shows the file size. The PDF address and the backend are unchanged.
(function () {
  "use strict";

  var PDF_URL = "/dashboard.pdf";
  var NARROW_QUERY = "(max-width: 700px)";

  var MESSAGES = {
    "fallback-unsupported": "Your browser cannot show the PDF inside this page. Use the buttons " +
      "above to open or download it. A preview image is shown below.",
    "fallback-narrow": "On small screens the dashboard is shown as an image. Tap the image or " +
      "use the buttons above to open the full PDF."
  };
  var UNREACHABLE_TITLE = "Could not check the dashboard PDF";
  var UNREACHABLE_TEXT = "The server could not be reached, so the dashboard cannot be shown " +
    "right now. Make sure the app is running and reload this page.";

  var state = { availability: "checking" };

  function formatSize(bytes) {
    if (!(bytes > 0)) { return ""; }
    if (bytes >= 1024 * 1024) { return (bytes / (1024 * 1024)).toFixed(1) + " MB"; }
    return Math.round(bytes / 1024) + " KB";
  }

  function pdfViewerSupported() {
    if (typeof navigator === "undefined") { return false; }
    if (typeof navigator.pdfViewerEnabled === "boolean") { return navigator.pdfViewerEnabled; }
    return !!(navigator.mimeTypes && navigator.mimeTypes["application/pdf"]);
  }

  // availability: "ok", "missing" or "unreachable".
  function chooseView(availability, supported, narrow) {
    if (availability === "missing") { return "missing"; }
    if (availability === "unreachable") { return "unreachable"; }
    if (!supported) { return "fallback-unsupported"; }
    if (narrow) { return "fallback-narrow"; }
    return "viewer";
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setHidden(id, hidden) {
    var node = byId(id);
    if (node) { node.hidden = hidden; }
  }

  function render(view) {
    var showViewer = view === "viewer";
    var showFallback = view.indexOf("fallback") === 0;
    var showNotice = view === "missing" || view === "unreachable";
    setHidden("dash-viewer", !showViewer);
    setHidden("dash-fallback", !showFallback);
    setHidden("dash-missing", !showNotice);
    setHidden("dash-toolbar", showNotice);
    if (showViewer) {
      var frame = byId("dash-frame");
      if (!frame.getAttribute("src")) {
        frame.setAttribute("src", frame.getAttribute("data-src"));
      }
    }
    if (showFallback) {
      byId("dash-fallback-message").textContent = MESSAGES[view];
    }
    if (view === "unreachable") {
      var box = byId("dash-missing");
      box.querySelector("h2").textContent = UNREACHABLE_TITLE;
      box.querySelector("p").textContent = UNREACHABLE_TEXT;
    }
  }

  function showSize(bytes) {
    var label = byId("pdf-size");
    var text = formatSize(bytes);
    if (label && text) {
      label.textContent = "PDF, " + text;
      label.hidden = false;
    }
  }

  function narrowScreen() {
    return !!(window.matchMedia && window.matchMedia(NARROW_QUERY).matches);
  }

  function update() {
    if (state.availability === "checking") { return; }
    render(chooseView(state.availability, pdfViewerSupported(), narrowScreen()));
  }

  async function checkPdf() {
    try {
      var response = await fetch(PDF_URL, { method: "HEAD", cache: "no-store" });
      var type = response.headers.get("content-type") || "";
      if (response.ok && type.indexOf("pdf") !== -1) {
        state.availability = "ok";
        showSize(parseInt(response.headers.get("content-length"), 10));
      } else {
        state.availability = "missing";
      }
    } catch (error) {
      state.availability = "unreachable";
    }
  }

  async function init() {
    if (window.matchMedia) {
      var query = window.matchMedia(NARROW_QUERY);
      if (query.addEventListener) {
        query.addEventListener("change", update);
      } else if (query.addListener) {
        query.addListener(update);
      }
    }
    await checkPdf();
    update();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  // Exposed only so the logic can be tested outside a browser.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { formatSize: formatSize, chooseView: chooseView };
  }
})();
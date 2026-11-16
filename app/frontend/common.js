// Shared behaviour for every page:
// 1. mark the current page in the navigation bar
// 2. open and close the mobile menu
// 3. show whether the Flask backend is reachable (uses the existing /health route)
(function () {
  "use strict";

  function normalise(path) {
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
  }

  function markActiveLink() {
    var current = normalise(window.location.pathname);
    document.querySelectorAll(".site-nav a").forEach(function (link) {
      var target = normalise(new URL(link.href, window.location.origin).pathname);
      if (target === current) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function setupMenu() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) {
      return;
    }
    function setOpen(open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("open"));
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  }

  var STATUS_TEXT = {
    checking: "Checking backend...",
    ok: "Backend online",
    offline: "Backend offline"
  };

  function setStatus(state) {
    var pill = document.getElementById("nav-status");
    if (!pill) {
      return;
    }
    pill.setAttribute("data-state", state);
    pill.textContent = STATUS_TEXT[state];
  }

  async function checkBackend() {
    var timer = null;
    try {
      var controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, 4000);
      var response = await fetch("/health", { cache: "no-store", signal: controller.signal });
      var data = await response.json();
      setStatus(response.ok && data.status === "ok" ? "ok" : "offline");
    } catch (error) {
      setStatus("offline");
    } finally {
      clearTimeout(timer);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    markActiveLink();
    setupMenu();
    setStatus("checking");
    checkBackend();
    setInterval(function () {
      if (!document.hidden) {
        checkBackend();
      }
    }, 30000);
  });
})();
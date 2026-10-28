/* desk.js: universal light/dark mode + the lead-story bridge.
   Mode is shared by every page and paper through localStorage "ks-mode".
   A one-line snippet in each <head> applies a saved "dark" before paint. */
(function () {
  "use strict";
  var KEY = "ks-mode";
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(mode) {
    try { localStorage.setItem(KEY, mode); } catch (e) { /* private mode: applies for this visit */ }
  }
  function apply(mode) {
    if (mode === "dark") root.setAttribute("data-mode", "dark");
    else root.removeAttribute("data-mode");
    var btns = document.querySelectorAll("[data-mode-toggle]");
    for (var i = 0; i < btns.length; i++) {
      var dark = mode === "dark";
      btns[i].setAttribute("aria-pressed", dark ? "true" : "false");
      var lbl = btns[i].querySelector(".lbl");
      if (lbl) lbl.textContent = dark ? "Dark" : "Light";
    }
  }
  apply(read() === "dark" ? "dark" : "light");
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-mode-toggle]") : null;
    if (!t) return;
    var next = root.getAttribute("data-mode") === "dark" ? "light" : "dark";
    save(next);
    apply(next);
  });
  // Another tab (or a paper) changed the mode: follow it.
  window.addEventListener("storage", function (e) {
    if (e.key === KEY) apply(e.newValue === "dark" ? "dark" : "light");
  });

  // ---- Lead story: probability-weighted plausibility bridge ----
  // Figures from "The $3.5 Trillion Question", section 10 ($B).
  var BASE = 1511.5, MARKET = 3538.0;
  var inputs = document.querySelectorAll("[data-bucket]");
  if (!inputs.length) return;
  function fmtB(v) {
    return v >= 1000 ? "$" + (v / 1000).toFixed(2) + "T" : "$" + v.toFixed(1) + "B";
  }
  function el(id) { return document.getElementById(id); }
  function render() {
    var ev = 0;
    for (var i = 0; i < inputs.length; i++) {
      var p = parseFloat(inputs[i].value);
      ev += parseFloat(inputs[i].getAttribute("data-full")) * p / 100;
      var out = el(inputs[i].id + "-out");
      if (out) out.textContent = p + "%";
    }
    var total = BASE + ev, resid = MARKET - total;
    el("pbBase").style.width = (BASE / MARKET * 100) + "%";
    el("pbEv").style.left = (BASE / MARKET * 100) + "%";
    el("pbEv").style.width = (Math.min(ev, MARKET - BASE) / MARKET * 100) + "%";
    el("pbEvOut").textContent = "+" + fmtB(ev);
    el("pbTotalOut").textContent = fmtB(total);
    el("pbResidOut").textContent = resid >= 0 ? fmtB(resid) : "-" + fmtB(-resid);
    el("pbResidLbl").textContent = resid >= 0 ? "the market still asks you to believe" : "your odds put it above the market";
  }
  for (var j = 0; j < inputs.length; j++) inputs[j].addEventListener("input", render);
  var reset = el("pbReset");
  if (reset) reset.addEventListener("click", function () {
    for (var k = 0; k < inputs.length; k++) inputs[k].value = inputs[k].getAttribute("data-default");
    render();
  });
  render();
})();

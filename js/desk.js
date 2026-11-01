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
      btns[i].setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
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

/* panelpop: chart-panel pop-out viewer (site-wide, Nov 2026).
   Clicking a marked panel moves the whole panel (chart, title, caption)
   into a full-screen viewer; closing returns it to its exact place.
   Interactive elements inside a panel keep their own behavior. */
(function () {
  "use strict";
  var overlay = null, stage = null, closeBtn = null, current = null, ph = null, lastFocus = null;
  var INTERACTIVE = 'a,button,input,select,textarea,summary,label,[data-bucket],[role="slider"]';
  function build() {
    overlay = document.createElement('div');
    overlay.className = 'pp-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Expanded panel');
    closeBtn = document.createElement('button');
    closeBtn.className = 'pp-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close expanded panel');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
    stage = document.createElement('div');
    stage.className = 'pp-stage';
    overlay.appendChild(closeBtn);
    overlay.appendChild(stage);
    document.body.appendChild(overlay);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  }
  function refit() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
  function open(panel) {
    if (!overlay) build();
    if (current) return;
    lastFocus = document.activeElement;
    ph = document.createElement('div');
    ph.className = 'pp-ph';
    ph.style.height = panel.offsetHeight + 'px';
    panel.parentNode.insertBefore(ph, panel);
    stage.appendChild(panel);
    current = panel;
    overlay.classList.add('open');
    document.body.classList.add('pp-lock');
    overlay.scrollTop = 0;
    closeBtn.focus();
    setTimeout(refit, 60);
  }
  function close() {
    if (!current) return;
    ph.parentNode.insertBefore(current, ph);
    ph.remove(); ph = null; current = null;
    overlay.classList.remove('open');
    document.body.classList.remove('pp-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    setTimeout(refit, 60);
  }
  document.addEventListener('click', function (e) {
    if (current) return;
    var t = e.target;
    if (!t.closest) return;
    var panel = t.closest('[data-panel-pop]');
    if (!panel) return;
    if (t.closest(INTERACTIVE)) return;
    open(panel);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) { close(); return; }
    if (current) return;
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.hasAttribute && e.target.hasAttribute('data-panel-pop')) {
      e.preventDefault(); open(e.target);
    }
  });
  function dress(scope) {
    var ps = (scope || document).querySelectorAll('[data-panel-pop]');
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (!p.hasAttribute('tabindex')) p.setAttribute('tabindex', '0');
      if (!p.querySelector('.pp-badge')) {
        var b = document.createElement('span');
        b.className = 'pp-badge';
        b.setAttribute('aria-hidden', 'true');
        b.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>';
        p.appendChild(b);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { dress(); });
  else dress();
  window.__panelpop = { open: open, close: close, dress: dress };
})();

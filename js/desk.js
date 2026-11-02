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
   Zoom (rev. 2, Nov 2026): the viewer carries a toolbar with minus,
   plus and Fit controls and a live percentage. 100% means the panel
   rendered at exactly its in-page width. The panel keeps a wide layout
   (up to 1100px; a resize event fires so canvas charts refit at that
   size and stay crisp) and is transform-scaled, origin top centre,
   inside a sizing wrapper whose width and height are set to the scaled
   dimensions, so the overlay scrolls and pans over the true zoomed
   size. On open, a phone-width viewport starts at 150% (or Fit when
   Fit renders larger); a desktop starts at Fit or 125%, whichever
   renders larger. Steps run 100, 125, 150, 200, 250 percent.
   Double-tap toggles Fit and the last percentage. Pinch zoom still
   works on top of the transform. Interactive elements inside a panel
   keep their own behavior. This replaces rev. 1's fixed scale (1.55 on
   phone, 1.35 on desktop), which set the layout width barely wider
   than the phone itself, centred nothing, and showed the reader no
   zoom state or control. */
(function () {
  "use strict";
  var overlay = null, stage = null, wrap = null, tools = null, zLabel = null;
  var closeBtn = null, current = null, ph = null, lastFocus = null;
  var savedStyle = null, resizeTimer = null;
  var W = 0, H = 0, IW = 0, curS = 1;
  var state = "fit", pct = 100, lastPct = 150;
  var STEPS = [100, 125, 150, 200, 250];
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
    tools = document.createElement('div');
    tools.className = 'pp-tools';
    tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', 'Panel zoom');
    var bOut = document.createElement('button');
    bOut.className = 'pp-zbtn';
    bOut.type = 'button';
    bOut.setAttribute('aria-label', 'Zoom out');
    bOut.textContent = '\u2212';
    zLabel = document.createElement('span');
    zLabel.className = 'pp-zlabel';
    zLabel.setAttribute('aria-live', 'polite');
    zLabel.textContent = 'Fit';
    var bIn = document.createElement('button');
    bIn.className = 'pp-zbtn';
    bIn.type = 'button';
    bIn.setAttribute('aria-label', 'Zoom in');
    bIn.textContent = '+';
    var bFit = document.createElement('button');
    bFit.className = 'pp-zbtn pp-zfit';
    bFit.type = 'button';
    bFit.setAttribute('aria-label', 'Fit panel to screen');
    bFit.textContent = 'Fit';
    tools.appendChild(bOut);
    tools.appendChild(zLabel);
    tools.appendChild(bIn);
    tools.appendChild(bFit);
    bOut.addEventListener('click', function () { stepZoom(-1); });
    bIn.addEventListener('click', function () { stepZoom(1); });
    bFit.addEventListener('click', function () { fitZoom(); });
    stage = document.createElement('div');
    stage.className = 'pp-stage';
    wrap = document.createElement('div');
    wrap.className = 'pp-zoomwrap';
    stage.appendChild(wrap);
    overlay.appendChild(closeBtn);
    overlay.appendChild(tools);
    overlay.appendChild(stage);
    document.body.appendChild(overlay);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay || e.target === stage || e.target === wrap) close(); });
    overlay.addEventListener('dblclick', function (e) {
      if (!current) return;
      if (e.target.closest && e.target.closest('.pp-tools,.pp-close')) return;
      if (e.target.closest && e.target.closest(INTERACTIVE)) return;
      if (state === 'fit') { state = 'pct'; pct = lastPct; } else { state = 'fit'; }
      applyZoom();
      centerH();
    });
  }
  function refit() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
  function refitSoon() { setTimeout(refit, 60); setTimeout(refit, 350); }
  function small() { return window.innerWidth <= 720; }
  function availW() {
    var padH = small() ? 16 : 28;
    return Math.max(260, overlay.clientWidth - padH);
  }
  function fitPct() { return IW > 0 ? (availW() / IW) * 100 : 100; }
  function effPct() { return state === 'fit' ? fitPct() : pct; }
  function layoutBase() {
    if (!current) return;
    var avail = availW();
    W = Math.min(1100, Math.max(avail, IW));
    current.style.width = W + 'px';
    current.style.maxWidth = 'none';
    H = current.offsetHeight || current.scrollHeight || 0;
  }
  function applyZoom() {
    if (!current) return;
    var T = state === 'fit' ? availW() : (IW * pct) / 100;
    var s = W > 0 ? T / W : 1;
    if (s > 3) { s = 3; T = W * s; }
    if (s < 0.2) { s = 0.2; T = W * s; }
    curS = s;
    stage.style.width = T + 'px';
    wrap.style.width = T + 'px';
    wrap.style.height = (H * s) + 'px';
    current.style.left = ((T - W) / 2) + 'px';
    current.style.transform = 'scale(' + s + ')';
    zLabel.textContent = state === 'fit' ? 'Fit' : pct + '%';
    refitSoon();
  }
  function centerH() {
    if (!wrap || !overlay) return;
    var wr = wrap.getBoundingClientRect();
    var orr = overlay.getBoundingClientRect();
    var mid = wr.left + wr.width / 2;
    var target = orr.left + overlay.clientWidth / 2;
    overlay.scrollLeft += Math.round(mid - target);
  }
  function stepZoom(dir) {
    if (!current) return;
    var eff = effPct();
    var cand = null;
    for (var i = 0; i < STEPS.length; i++) {
      if (dir > 0 && STEPS[i] > eff + 0.5) { cand = STEPS[i]; break; }
      if (dir < 0 && STEPS[i] < eff - 0.5) cand = STEPS[i];
    }
    if (cand !== null) { state = 'pct'; pct = cand; lastPct = cand; }
    else if (dir > 0 && fitPct() > eff + 0.5) { state = 'fit'; }
    else if (dir < 0 && fitPct() < eff - 0.5) { state = 'fit'; }
    else return;
    applyZoom();
    centerH();
  }
  function fitZoom() {
    if (!current) return;
    state = 'fit';
    applyZoom();
    centerH();
  }
  function open(panel) {
    if (!overlay) build();
    if (current) return;
    lastFocus = document.activeElement;
    savedStyle = panel.getAttribute('style');
    IW = panel.offsetWidth || 354;
    ph = document.createElement('div');
    ph.className = 'pp-ph';
    ph.style.width = IW + 'px';
    ph.style.height = panel.offsetHeight + 'px';
    panel.parentNode.insertBefore(ph, panel);
    wrap.appendChild(panel);
    current = panel;
    panel.style.position = 'absolute';
    panel.style.top = '0';
    panel.style.margin = '0';
    panel.style.transformOrigin = '50% 0';
    overlay.classList.add('open');
    document.body.classList.add('pp-lock');
    layoutBase();
    var basePct = small() ? 150 : 125;
    if (fitPct() >= basePct) { state = 'fit'; }
    else { state = 'pct'; pct = basePct; lastPct = basePct; }
    applyZoom();
    overlay.scrollTop = 0;
    centerH();
    closeBtn.focus();
    refitSoon();
  }
  function close() {
    if (!current) return;
    var panel = current;
    ph.parentNode.insertBefore(panel, ph);
    ph.remove(); ph = null; current = null;
    if (savedStyle === null) panel.removeAttribute('style');
    else panel.setAttribute('style', savedStyle);
    savedStyle = null;
    stage.style.width = '';
    wrap.style.width = '';
    wrap.style.height = '';
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
    if (current) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === '+' || e.key === '=') { stepZoom(1); return; }
      if (e.key === '-' || e.key === '_') { stepZoom(-1); return; }
      if (e.key === '0') { fitZoom(); return; }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.hasAttribute && e.target.hasAttribute('data-panel-pop')) {
      e.preventDefault(); open(e.target);
    }
  });
  window.addEventListener('resize', function () {
    if (!current) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layoutBase(); applyZoom(); }, 120);
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
  window.__panelpop = { open: open, close: close, dress: dress, zoomIn: function () { stepZoom(1); }, zoomOut: function () { stepZoom(-1); }, fit: fitZoom,
    _debug: function () { return { state: state, pct: pct, effPct: Math.round(effPct()), W: W, H: H, IW: IW, s: curS }; } };
})();
/* /panelpop-js */

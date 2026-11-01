/* Photography: The Contact Sheet. Category filter chips, drag-to-scroll
   strips, and the lightbox (scoped to the clicked frame's shoot, keyboard
   navigable). Data: #galleryData, built from the shoot manifest plus each
   post's date and tagged location. No EXIF exists in the source files, so
   the viewer shows no settings line rather than an invented one. */
(function () {
  'use strict';

  var dataEl = document.getElementById('galleryData');
  if (!dataEl) { return; }
  var data = JSON.parse(dataEl.textContent);
  var bySlug = {};
  data.shoots.forEach(function (s) { bySlug[s.slug] = s; });

  /* ---------- filter chips ---------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-cat-group]'));
  var countEl = document.getElementById('showCount');
  var TOTALS = { shoots: 0, frames: 0 };
  var PER = {};
  data.shoots.forEach(function (s) {
    TOTALS.shoots += 1; TOTALS.frames += s.frames.length;
    PER[s.category] = PER[s.category] || { shoots: 0, frames: 0 };
    PER[s.category].shoots += 1; PER[s.category].frames += s.frames.length;
  });
  function applyFilter(cat) {
    chips.forEach(function (c) {
      c.setAttribute('aria-pressed', c.getAttribute('data-filter') === cat ? 'true' : 'false');
    });
    groups.forEach(function (g) {
      g.hidden = !(cat === 'all' || g.getAttribute('data-cat-group') === cat);
    });
    var t = cat === 'all' ? TOTALS : PER[cat];
    if (countEl) {
      countEl.textContent = 'Showing ' + t.shoots + ' of ' + TOTALS.shoots +
        ' shoots \u00B7 ' + t.frames + ' frames';
    }
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () { applyFilter(c.getAttribute('data-filter')); });
  });

  /* ---------- strip drag-to-scroll (mouse); touch scrolls natively --- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-strip]'), function (strip) {
    var down = false, moved = 0, startX = 0, startScroll = 0;
    strip.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) { return; }
      down = true; moved = 0; startX = e.clientX; startScroll = strip.scrollLeft;
      strip.classList.add('dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) { return; }
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      strip.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) { return; }
      down = false;
      strip.classList.remove('dragging');
      if (moved > 8) {
        /* the pointerup click on a frame must not open the viewer */
        strip.dataset.suppress = '1';
        setTimeout(function () { delete strip.dataset.suppress; }, 0);
      }
    });
    strip.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === strip) {
        e.preventDefault();
        var slug = strip.closest('.shoot').id.replace('shoot-', '');
        openLb(slug, 0);
      }
    });
  });

  /* ---------- lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbTitle = document.getElementById('lbTitle');
  var lbMeta = document.getElementById('lbMeta');
  var lbIg = document.getElementById('lbIg');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  var curShoot = null, cur = 0, lastFocus = null;

  function frameAlt(s, f, i) {
    if (f.title) {
      return f.title + ', in ' + s.title + ', frame ' + (i + 1) + ' of ' +
        s.frames.length + '. Photograph by Kevin Sigey.';
    }
    return s.title + ', frame ' + (i + 1) + ' of ' + s.frames.length +
      '. Photograph by Kevin Sigey.';
  }
  function render() {
    var s = curShoot, f = s.frames[cur];
    lbImg.src = f.src;
    lbImg.alt = frameAlt(s, f, cur);
    lbTitle.textContent = f.title || s.title;
    var meta = ['Frame ' + (cur + 1) + ' of ' + s.frames.length];
    if (f.date) { meta.push('Posted ' + f.date); }
    if (f.place) { meta.push(f.place); }
    lbMeta.textContent = meta.join(' \u00B7 ');
    if (f.post) {
      lbIg.style.display = '';
      lbIg.href = f.post;
      lbIg.setAttribute('aria-label', 'View ' + (f.title || s.title) + ' on Instagram');
    } else {
      lbIg.style.display = 'none';
    }
    /* warm the neighbours */
    [cur - 1, cur + 1].forEach(function (j) {
      var k = ((j % s.frames.length) + s.frames.length) % s.frames.length;
      var im = new Image(); im.src = s.frames[k].src;
    });
  }
  function openLb(slug, idx) {
    var s = bySlug[slug];
    if (!s) { return; }
    curShoot = s;
    cur = ((idx % s.frames.length) + s.frames.length) % s.frames.length;
    render();
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    lbClose.focus();
  }
  function closeLb() {
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  function step(d) {
    cur = ((cur + d) % curShoot.frames.length + curShoot.frames.length) % curShoot.frames.length;
    render();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) { return; }
    var strip = t.closest('[data-strip]');
    if (strip && strip.dataset.suppress) { return; }
    var parts = t.getAttribute('data-open').split(':');
    openLb(parts[0], parseInt(parts[1], 10));
  });
  lbClose.addEventListener('click', closeLb);
  lbPrev.addEventListener('click', function () { step(-1); });
  lbNext.addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) { closeLb(); } });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) { return; }
    if (e.key === 'Escape') { closeLb(); }
    else if (e.key === 'ArrowLeft') { step(-1); }
    else if (e.key === 'ArrowRight') { step(1); }
  });
})();

/* Photography rev 2: editorial spreads. Lightbox (scoped to the clicked
   frame's shoot, keyboard navigable) plus a scrollspy for the side section
   guide. Rev 1's lightbox failure, diagnosed: frames were draggable <img>s
   inside a drag-scroll strip, so real clicks with a few px of movement fired
   dragstart and the click event was cancelled. Rev 2 has no drag machinery
   at all, marks every image draggable="false", and blocks dragstart on
   images outright, so still and wobble clicks alike reach the handler.
   Data: #galleryData, built from the shoot manifest plus each post's date
   and tagged location. No EXIF exists in the source files, so the viewer
   shows no settings line rather than an invented one. */
(function () {
  'use strict';

  var dataEl = document.getElementById('galleryData');
  if (!dataEl) { return; }
  var data = JSON.parse(dataEl.textContent);
  var bySlug = {};
  data.shoots.forEach(function (s) { bySlug[s.slug] = s; });

  /* belt and braces: an image drag must never eat a click again */
  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.tagName === 'IMG') { e.preventDefault(); }
  });

  /* ---------- scrollspy for the side guide ---------- */
  var spyLinks = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-spy]'), function (a) {
    spyLinks[a.getAttribute('data-spy')] = a;
  });
  function setCurrent(id) {
    Object.keys(spyLinks).forEach(function (k) {
      if (k === id) { spyLinks[k].setAttribute('aria-current', 'true'); }
      else { spyLinks[k].removeAttribute('aria-current'); }
    });
  }
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { setCurrent(en.target.id); }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    ['fashion', 'editorial', 'portrait'].forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) { spy.observe(sec); }
    });
  } else {
    setCurrent('fashion');
  }

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

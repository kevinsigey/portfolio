#!/usr/bin/env python3
"""TDD checks for Kevin Sigey's portfolio site.

Front page and writing page on the Research Desk system (light by default,
universal dark mode, flat colors, no gradients). The photography page keeps
its current design until it moves to its own site.
"""
import re
import sys
import json
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
failures = []


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name)


class LinkImgParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.bad_links = []
        self.bad_imgs = []
        self.imgs = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "a" and not d.get("href", "").strip():
            self.bad_links.append(self.getpos())
        if tag == "img":
            self.imgs.append(d.get("src", ""))
            if not d.get("alt", "").strip():
                self.bad_imgs.append(self.getpos())


index = (SITE / "index.html").read_text(encoding="utf-8")
writing = (SITE / "writing.html").read_text(encoding="utf-8")
photos = (SITE / "photos.html").read_text(encoding="utf-8")
desk_css = (SITE / "css" / "desk.css").read_text(encoding="utf-8")
desk_js = (SITE / "js" / "desk.js").read_text(encoding="utf-8")

# ---------- 1. files ----------
for rel in ["index.html", "writing.html", "photos.html", "anthropic-ipo.html",
            "spacex-tesla-merger.html", "stablecoin-remittance.html",
            "data-center-energy.html", "css/desk.css", "js/desk.js",
            "css/main.css", "css/photos.css", "js/photos.js",
            "assets/resume.pdf", "assets/papers/tightness-paradox.pdf"]:
    check(f"file exists: {rel}", (SITE / rel).is_file())

# ---------- 2. Research Desk system (Oct 28 redesign) ----------
for page_name, page in [("index", index), ("writing", writing)]:
    check(f"{page_name} uses css/desk.css", "css/desk.css" in page)
    check(f"{page_name} uses js/desk.js", "js/desk.js" in page)
    check(f"{page_name} has viewport meta",
          bool(re.search(r'<meta[^>]+name=["\']viewport["\']', page, re.I)))
    check(f"{page_name} applies saved dark mode before paint",
          'localStorage.getItem("ks-mode")' in page.split("</head>")[0])
    check(f"{page_name} has the universal mode toggle", "data-mode-toggle" in page)
    check(f"{page_name} loads Newsreader + IBM Plex",
          "Newsreader" in page and "IBM+Plex+Sans" in page and "IBM+Plex+Mono" in page)
    for legacy in ["css/main.css", "theme-editorial.css", "js/theme.js",
                   "data-theme=", "Hi, my name is", "rail rail-left"]:
        check(f"{page_name} drops legacy {legacy!r}", legacy not in page)
check("light is the default: :root holds the light paper",
      re.search(r":root\s*\{[^}]*--paper:\s*#f4f1ea", desk_css) is not None)
check("dark mode is html[data-mode=dark] with the shared #0b0d10 ground",
      re.search(r'html\[data-mode="dark"\]\s*\{[^}]*--paper:\s*#0b0d10', desk_css) is not None)
check("mode stored under one universal key", '"ks-mode"' in desk_js)
check("mode follows other tabs and papers", '"storage"' in desk_js)
check("desk.css has no gradients (flat colors only)",
      "gradient" not in desk_css)
check("desk.css balanced braces", desk_css.count("{") == desk_css.count("}"))

# ---------- 3. front page structure ----------
for frag in ['id="lead"', 'id="writing"', 'id="systems"', 'id="receipts"',
             'id="experience"', 'id="photography"', 'id="contact"',
             'class="stat-strip"', 'class="card desk-card"', 'class="paper-list"']:
    check(f"index has {frag}", frag in index)
order = [index.find(f'id="{s}"') for s in
         ["lead", "writing", "systems", "receipts", "experience", "photography", "contact"]]
check("sections in order: lead, writing, systems, receipts, experience, photography, contact",
      order == sorted(order) and -1 not in order)
check("stat strip has at most 4 stats", index.count('class="stat"') <= 4)

# ---------- 4. lead story interactive (SpaceX paper, section 10) ----------
for bucket, full, default in [("bRobo", 1066, 35), ("bOpt", 237, 20), ("bAi", 500, 30),
                              ("bTel", 300, 45), ("bShip", 200, 25)]:
    check(f"bridge slider {bucket} = ${full}B at {default}%",
          f'id="{bucket}" data-bucket data-full="{full}" data-default="{default}"' in index)
check("bridge constants match the paper", "BASE = 1511.5" in desk_js and "MARKET = 3538.0" in desk_js)
check("bridge default EV is the paper's $755.5B", "+$755.5B" in index)
check("bridge has a reset to the paper's odds", 'id="pbReset"' in index)

# ---------- 5. content kept from the previous site ----------
for phrase in ["sigeykevin@gmail.com", "linkedin.com/in/kevin-sigey-72a5501b5",
               "Predictor Hub", "Algo Trade Hub", "Prediction Journal",
               "algo.40-160-91-131.sslip.io/journal",
               "Stablecoin Remittance Monitor", "Synchrony Guardrail Engine",
               "FPL Scout", "github.com/kevinsigey/predictor-hub",
               "github.com/kevinsigey/algo-trade-hub-prod",
               "github.com/kevinsigey/Stable-Coin-Analysis",
               "github.com/kevinsigey/FPL_Optimizer",
               "Snapshot, verified Oct 28, 2026",
               "Busey Bank", "Illinois Business Consulting",
               "Tandon Consulting Club", "Dot Foods", "WOW Payments",
               "150 to 450", "100+ door-to-door",
               "Shipped V16, not the most accurate model",
               "Abandon error is the metric that predicts customer pain.",
               "Proximity tiebreaker made it worse: 90% to 86%",
               "$0 across all five deposit categories",
               "2+ hrs down to 6-13 min per stage",
               "416,159 (+34.3%)", "assets/resume.pdf", "photos.html"]:
    check(f"index content present: {phrase!r}", phrase in index)
for val in ["1.54%", "1.87%", "2.15%", "2.4%"]:
    check(f"Synchrony receipt shows abandon error {val}",
          f'<span class="val">{val}</span>' in index)
check("Synchrony receipt marks V16 as the pick",
      'class="fill pick" style="width: 64%"' in index)
check("Receipts has exactly three cards", index.count('class="card receipt"') == 3)

# ---------- 6. writing ----------
for href in ["anthropic-ipo.html", "spacex-tesla-merger.html", "stablecoin-remittance.html",
             "data-center-energy.html", "assets/papers/tightness-paradox.pdf"]:
    check(f"writing lists {href}", f'href="{href}"' in writing)
check("writing marks itself current in the nav",
      'href="writing.html" aria-current="page"' in writing)
check("front page features the 3 newest papers", index.count('class="paper-row"') == 3)

# ---------- 7. hygiene ----------
emoji_re = re.compile(r"[\U0001F300-\U0001FAFF\U0001F000-\U0001F2FF"
                      r"\u2600-\u27BF\u2B00-\u2BFF]")
for page_name, page in [("index", index), ("writing", writing)]:
    lp = LinkImgParser()
    lp.feed(page)
    check(f"{page_name}: every <a> has a non-empty href", not lp.bad_links)
    check(f"{page_name}: every <img> has alt text", not lp.bad_imgs)
    check(f"no emojis in {page_name}", not emoji_re.findall(page))
    check(f"no lorem in {page_name}", "lorem" not in page.lower())
    check(f"no em-dashes in {page_name}", "\u2014" not in page)
check("no em-dashes in desk.css", "\u2014" not in desk_css)
check("no em-dashes in desk.js", "\u2014" not in desk_js)

# ---------- 8. photos.html: v4 styling, no legacy theme system ----------
for css in ["css/main.css", "css/photos.css"]:
    check(f"photos references {css}", css in photos)
for legacy in ["theme-editorial.css", "theme-darkroom.css",
               "theme-terminal.css", "js/theme.js", "data-theme=",
               "data-set-theme", "ksigey-edition"]:
    check(f"photos does not reference legacy {legacy}", legacy not in photos)
check("photos has viewport meta",
      bool(re.search(r'<meta[^>]+name=["\']viewport["\']', photos, re.I)))

# ---------- 9. photos.html: three categories only ----------
for cat in ["Fashion", "Editorial", "Portrait"]:
    check(f"photos has category section: {cat}",
          f'aria-label="{cat}"' in photos)
for gone in ["San Francisco", "san-francisco", "Fly Kids Community",
             "Beach Days", "On Stage", "Nairobi Editorial"]:
    check(f"photos has no legacy series {gone!r}", gone not in photos)

# ---------- 10. photos.html: manifest parity (files are {src, post}) ----------
manifest = json.loads((SITE / "assets" / "photos" / "manifest.json")
                      .read_text(encoding="utf-8"))
check("manifest has 50 shoots after consolidation", len(manifest) == 50,
      f"found {len(manifest)}")
cats = {m["category"] for m in manifest}
check("manifest categories are exactly Fashion/Editorial/Portrait",
      cats == {"Fashion", "Editorial", "Portrait"}, str(cats))
check("manifest has 3 featured shoots",
      sum(1 for m in manifest if m.get("featured")) == 3)
# Consolidation (2026-10-14): the Whithering / Into the Abyss / Pensive
# trio merged into one autumn-series album; thin single-frame Editorial
# and Portrait albums consolidated into singles collections. The
# one-post-per-shoot rule is DROPPED: merged albums span several posts,
# and each frame keeps its own original Instagram post and title.
for slug, n in [("autumn-series", 3), ("editorial-singles", 18),
                ("portrait-singles", 4)]:
    m = next((x for x in manifest if x["slug"] == slug), None)
    check(f"merged album {slug} exists with {n} frames",
          m is not None and len(m["files"]) == n,
          f"found {len(m['files']) if m else 0}")
    check(f"merged album {slug} has no single post_url",
          m is not None and m.get("post_url") is None)
    check(f"merged album {slug} frames keep per-frame titles",
          m is not None and all("title" in f for f in m["files"]))
    check(f"merged album {slug} frames keep distinct original posts",
          m is not None and len({f["post"] for f in m["files"]}) > 1)
for gone in ["whithering", "into-the-abyss", "pensive",
             "earl-sweatshirt-doechii", "spring-life", "wash-drummer",
             "wash-skaters", "step-team", "2000s-party",
             "studio18-anniversary", "melanin-pt3", "searching", "mayhem",
             "serendipity-experiment", "terrestrial-discovery",
             "nouveau-american-gothic", "photo-vogue",
             "fort-greene-archives", "254-radio", "soho-incident",
             "2024-recap", "birthday-shots", "sun-basking", "kem-shoot",
             "man-in-the-mirror"]:
    check(f"consolidated-away shoot gone: {gone}",
          gone not in {m["slug"] for m in manifest})
# no post may lose photos vs the baseline (321 photos total);
# merges move photos between shoots, never drop them
BASELINE_TOTAL_PHOTOS = 321
total_photos = sum(len(m["files"]) for m in manifest)
check("no photos dropped vs baseline", total_photos == BASELINE_TOTAL_PHOTOS,
      f"found {total_photos}")
check("manifest files are {src, post} objects with optional per-frame title",
      all(isinstance(f, dict) and "src" in f and "post" in f
          and set(f) <= {"src", "post", "title"}
          for m in manifest for f in m["files"]))

photo_srcs = re.findall(r'<img[^>]+src="([^"]+)"', photos)
manifest_files = [f["src"] for m in manifest for f in m["files"]]
thumb_srcs = {f"assets/photos/thumbs/{m['slug']}.jpg" for m in manifest}
check("every manifest file appears as an <img> src or in gallery JSON",
      set(manifest_files) <= set(photo_srcs) | set(
          re.findall(r'"src": "([^"]+)"', photos)),
      str((set(manifest_files) - set(photo_srcs)) -
          set(re.findall(r'"src": "([^"]+)"', photos)))[:200])
check("every <img> src is in the manifest or is a shoot thumbnail",
      set(photo_srcs) <= set(manifest_files) | thumb_srcs,
      str(set(photo_srcs) - set(manifest_files) - thumb_srcs)[:200])
missing = [s for s in manifest_files if not (SITE / s).is_file()]
check("all manifest files exist on disk", not missing, ", ".join(missing[:5]))
check(">= 150 photos total", len(manifest_files) >= 150,
      f"found {len(manifest_files)}")

# ---------- 11. reel: best-of-everything marquee, opens shoot albums ----------
photos_css = (SITE / "css" / "photos.css").read_text(encoding="utf-8")
photos_js = (SITE / "js" / "photos.js").read_text(encoding="utf-8")
check("reel markup present",
      'id="reel"' in photos and 'id="reelTrack"' in photos)
reel_items = re.findall(r'<button[^>]+class="reel-item"[^>]*>', photos)
visible_items = [b for b in reel_items if 'aria-hidden="true"' not in b]
check("reel shows one frame per shoot", len(visible_items) == len(manifest),
      f"found {len(visible_items)} vs {len(manifest)} shoots")
check("every shoot appears in the reel",
      {m["slug"] for m in manifest} ==
      set(re.findall(r'data-shoot="([^"]+)"', "".join(visible_items))))
check("reel has manual arrow controls",
      'id="reelPrev"' in photos and 'id="reelNext"' in photos
      and 'class="reel-arrow' in photos)
check("reel has drag-to-scroll",
      "pointerdown" in photos_js and "dragging" in photos_js)
check("reel auto-scrolls via JS",
      "requestAnimationFrame" in photos_js and "scrollLeft" in photos_js)
check("reel pauses on hover",
      "pointerenter" in photos_js and "pointerleave" in photos_js
      and "hoverPause" in photos_js)
check("reel resumes on touch end",
      "touchend" in photos_js and "touchcancel" in photos_js)
check("reel resumes when scrolled back into view",
      "IntersectionObserver" in photos_js and "inView" in photos_js)
check("reel items open the shoot album, not Instagram",
      all('data-shoot=' in b for b in visible_items)
      and not any('instagram.com' in b for b in visible_items))
check("no Photography section heading on page",
      "<h1" not in photos and "Photography." not in photos)

# ---------- 11b. thumbnails: taller portrait aspect, face-aware ----------
check("shoot-card thumbnails use 3:4 portrait aspect",
      "aspect-ratio: 3 / 4" in photos_css)
missing_thumbs = [m["slug"] for m in manifest
                  if not (SITE / "assets" / "photos" / "thumbs" /
                          (m["slug"] + ".jpg")).is_file()]
check("every shoot has a thumbnail", not missing_thumbs,
      ", ".join(missing_thumbs[:5]))
card_imgs = re.findall(
    r'<button[^>]+class="shoot-card"[^>]*>.*?<img[^>]+src="([^"]+)"',
    photos, re.S)
check("shoot cards use thumbs/ directory",
      all(i.startswith("assets/photos/thumbs/") for i in card_imgs),
      str([i for i in card_imgs
           if not i.startswith("assets/photos/thumbs/")])[:150])
try:
    from PIL import Image as _PIL
    bad_ratio = []
    for m in manifest:
        p = SITE / "assets" / "photos" / "thumbs" / (m["slug"] + ".jpg")
        if p.is_file():
            w, h = _PIL.open(p).size
            if abs(w / h - 0.75) > 0.02:
                bad_ratio.append(m["slug"])
    check("thumbnails are 3:4 portrait", not bad_ratio, str(bad_ratio)[:150])
except ImportError:
    check("thumbnails are 3:4 portrait (PIL unavailable)", False,
          "PIL not installed")

# ---------- 12. lightbox ----------
for frag in ['id="lightbox"', 'role="dialog"', 'id="lbClose"',
             'id="lbPrev"', 'id="lbNext"', 'id="lbImg"', 'id="lbIg"']:
    check(f"lightbox has {frag}", frag in photos)
check("lightbox has explicit IG link, new tab",
      'View full post on Instagram' in photos
      and 'id="lbIg" href="" target="_blank" rel="noopener"' in photos)
check("lightbox keyboard support in photos.js",
      all(k in (SITE / "js" / "photos.js").read_text(encoding="utf-8")
          for k in ["Escape", "ArrowLeft", "ArrowRight"]))
check("lightbox IG link matches the displayed frame",
      "lbIg.href = it.post" in photos_js)
check("album popup hides IG link for multi-post albums",
      "popIg.style.display" in photos_js)
check("frames keep per-frame titles in photos.js",
      "f.title || s.title" in photos_js)

# ---------- 13. IG links are secondary: no photo click goes to Instagram ----------
ig_anchors = re.findall(r'<a[^>]*href="(https://www\.instagram\.com/p/[^"]+)"[^>]*>',
                        photos)
ig_img_wraps = re.findall(
    r'<a[^>]*href="https://www\.instagram\.com/p/[^"]*"[^>]*>\s*<img', photos)
check("no photo <img> is wrapped in an Instagram link", not ig_img_wraps,
      str(ig_img_wraps)[:150])
check("static HTML has no per-photo IG links (JS renders them)",
      not ig_anchors, f"found {len(ig_anchors)} static IG anchors")
gallery_json = json.loads(re.search(
    r'<script type="application/json" id="galleryData">\s*(\{.*?\})\s*</script>',
    photos, re.S).group(1))
gallery_by_slug = {s["slug"]: s for s in gallery_json["shoots"]}
for m in manifest:
    g = gallery_by_slug.get(m["slug"])
    check(f"gallery JSON has shoot {m['slug']}", g is not None)
    if g is None:
        continue
    # Every frame's original post must survive in the gallery JSON;
    # shoot-level post is null for multi-post albums, else one of the
    # frame posts. Per-frame titles ride along for merged albums.
    check(f"gallery JSON keeps every frame post for {m['slug']}",
          [f["post"] for f in g["files"]] ==
          [f["post"] for f in m["files"]])
    check(f"gallery JSON shoot post valid for {m['slug']}",
          g["post"] is None or g["post"] in {f["post"] for f in m["files"]})
    check(f"gallery JSON keeps per-frame titles for {m['slug']}",
          [f.get("title") for f in g["files"]] ==
          [f.get("title") for f in m["files"]])

# ---------- 14. shoot cards open the lightbox directly ----------
for cat in ["fashion", "editorial", "portrait"]:
    check(f"no drawer markup: drawer-{cat}", f'id="drawer-{cat}"' not in photos)
cards = re.findall(r'<button[^>]+class="shoot-card"[^>]*data-shoot="([^"]+)"',
                   photos)
check("shoot card count matches manifest", len(cards) == len(manifest),
      f"{len(cards)} cards vs {len(manifest)} shoots")
check("every card maps to a manifest slug",
      set(cards) == {m["slug"] for m in manifest},
      str(set(cards) ^ {m["slug"] for m in manifest})[:150])
check("cards carry no drawer wiring",
      not any('aria-controls="drawer-' in c for c in
              re.findall(r'<button[^>]+class="shoot-card"[^>]*>', photos)))
check("lightbox has photo counter", 'id="lbCount"' in photos)
check("photos.js referenced", 'js/photos.js' in photos)
check("gallery JSON blob present", 'id="galleryData"' in photos)
check("photos.js has scoped lightbox (no drawer code)",
      'function openLb(list, i)' in photos_js and
      'shoot-drawer' not in photos_js and 'openDrawer' not in photos_js)

# ---------- 15. photos.html: hygiene ----------
pp = LinkImgParser()
pp.feed(photos)
# lbIg href is populated by photos.js at runtime
_js_anchors = 2  # lbIg + albumPopIg
check("photos: every <a> has a non-empty href (except JS-filled)",
      len(pp.bad_links) == _js_anchors, str(pp.bad_links))
# lbImg alt is populated by photos.js at runtime
lines = photos.splitlines()
check("photos: every <img> has alt text (except JS-filled lbImg)",
      all('id="lbImg"' in lines[ln - 1] for ln, _ in pp.bad_imgs),
      str(pp.bad_imgs))
check("no emojis in photos", not emoji_re.findall(photos))
check("no lorem in photos", "lorem" not in photos.lower())
check("no em-dashes in photos", "\u2014" not in photos)
photos_js = (SITE / "js" / "photos.js").read_text(encoding="utf-8")
for label, text in [("photos", photos), ("photos.css", (SITE / "css" / "photos.css").read_text(encoding="utf-8")), ("photos.js", photos_js)]:
    check(f"no em-dashes in {label}", "\u2014" not in text)
    check(f"no emojis in {label}", not emoji_re.findall(text))
check("photos.css has no gradients",
      "linear-gradient" not in (SITE / "css" / "photos.css").read_text(encoding="utf-8")
      and "radial-gradient" not in (SITE / "css" / "photos.css").read_text(encoding="utf-8"))
# near-black palette (Kevin, 2026-10-12): no navy blues on the photos page
# plus the 2026-10-14 neutral direction: no blue/teal anywhere
photos_css = (SITE / "css" / "photos.css").read_text(encoding="utf-8")
check("photos.css has no navy blues",
      "#0a192f" not in photos_css.lower() and "#112240" not in photos_css.lower(),
      "found navy hex in photos.css")
for banned in ["#64ffda", "#57cbff", "#8892b0", "#ccd6f6", "#a8b2d1",
               "#e6f1ff", "#495670", "rgba(100, 255, 218"]:
    check(f"photos.css has no blue/teal {banned}", banned not in photos_css)

# ---------- 12. resume.pdf / papers ----------
pdf = SITE / "assets" / "resume.pdf"
check("assets/resume.pdf is a PDF", pdf.is_file() and pdf.read_bytes()[:5] == b"%PDF-")
tp = SITE / "assets" / "papers" / "tightness-paradox.pdf"
check("assets/papers/tightness-paradox.pdf is a PDF", tp.is_file() and tp.read_bytes()[:5] == b"%PDF-")

print()
if failures:
    print(f"{len(failures)} check(s) FAILED")
    sys.exit(1)
print("ALL CHECKS PASSED")

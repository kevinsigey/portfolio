# Kevin Sigey — Portfolio

Personal portfolio site: a quant who communicates well. Work, Lab (agentic
development), and Photography.

## Structure

- `index.html`: front page on the Research Desk system (lead story with a live
  bridge interactive, writing index, systems, receipts, experience, photography
  strip, contact)
- `writing.html`: every paper, newest first
- `anthropic-ipo.html`, `spacex-tesla-merger.html`, `stablecoin-remittance.html`,
  `data-center-energy.html`: the papers (each carries its own styles for now)
- `css/desk.css`: Research Desk tokens and layout. Light by default;
  `html[data-mode="dark"]` is the dark mode
- `js/desk.js`: the universal light/dark toggle (localStorage `ks-mode`, shared
  by every page and paper) and the lead-story bridge
- `photos.html`, `css/main.css`, `css/photos.css`, `js/main.js`, `js/photos.js`:
  the photography page, unchanged until it moves to its own site
- `assets/photos/`: Kevin's photography; `assets/resume.pdf`: current resume
- `tests/check.py`: TDD suite; `python3 tests/check.py` must pass

## Preview locally

```sh
python3 -m http.server 8931
# http://localhost:8931
```

## Deploy

Push to `main` → GitHub Actions builds the Caddy image, pushes to
`ghcr.io/kevocado/portfolio`, and the `vps` job deploys it on Kevin's VPS.
Required repo secrets/variables: `GHCR_PAT`, `VPS_SSH_KEY`,
`VPS_KNOWN_HOSTS` (secrets) and `VPS_HOST` (variable) — same values as the
other site repos.

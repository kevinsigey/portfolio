#!/usr/bin/env python3
"""Build data/boom-bust.json for the Anthropic IPO paper's drawdown chart.

Run from the repo root:
    pip install yfinance pandas
    python scripts/fetch_boom_bust.py                # live: FRED + Yahoo Finance
    python scripts/fetch_boom_bust.py --source vega  # offline fallback (monthly, 2000-Mar 2010)

Output schema (also what the page embeds as #boom-data):
  {"meta": {...}, "series": [{"id","name","kind","color","points":[[date,value],...], ...}]}
  date is "YYYY-MM" (month-end close) or "YYYY-MM-DD" (exact day).
The page computes drawdowns, troughs and recovery dates itself, so this file only needs prices.
"""
import argparse, csv, datetime as dt, io, json, sys, urllib.request

START, END = "1999-12-01", "2016-12-31"

# Anchors that must exist in the data. They are verified single days from the paper
# (Nasdaq close 10 Mar 2000 and 9 Oct 2002; Amazon peak close Dec 1999). They are merged in,
# so an intramonth peak is never missed by monthly sampling.
SERIES = [
    dict(id="ndx", name="Nasdaq Composite", color="slate", fred="NASDAQCOM",
         must=[["2000-03-10", 5048.62], ["2002-10-09", 1114.11]],
         fallback=[["2000-03-10", 5048.62], ["2002-10-09", 1114.11], ["2015-04-23", 5048.62]],
         fate="Back to its March 2000 close only in April 2015."),
    dict(id="amzn", name="Amazon", color="grey", yf=["AMZN"],
         must=[["1999-12-10", 106.69]],
         fate="Fell 94% and survived: customers kept buying, and it carried $2.1B of long-term debt through the bust until free cash flow turned positive in 2002 ($0.14B)."),
    dict(id="yhoo", name="Yahoo", color="gold", yf=["YHOO", "AABA"],
         must=[],
         fallback=[["2000-01-03", 100.0], ["2001-09", 3.4]],   # index, peak = 100 (paper anchors)
         open_through="2017-06",
         fate="Never regained its peak; the core business sold for $4.48B in 2017."),
    dict(id="msft", name="Microsoft", color="sage", yf=["MSFT"], must=[],
         fate="License cash never depended on internet revenue: a price event, not a solvency event."),
    dict(id="goog", name="Google", color="clay", yf=["GOOGL", "GOOG"], must=[],
         fate="Listed after the bust, profitable; its only deep drawdown was 2008."),
]

def month_label(d):
    return "%04d-%02d" % (d.year, d.month)

def fetch_fred(code):
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + code
    raw = urllib.request.urlopen(url, timeout=30).read().decode()
    rows = [r for r in csv.reader(io.StringIO(raw))][1:]
    out = []
    for d, v in rows:
        if v in (".", ""):
            continue
        out.append((dt.date.fromisoformat(d), float(v)))
    return [(d, v) for d, v in out if START <= d.isoformat() <= END]

def weekly_with_extrema(daily):
    """Thin daily closes to one point per ISO week, always keeping the all-time high and the low."""
    keep, last_week = {}, None
    for d, v in daily:
        keep[d.isocalendar()[:2]] = (d, v)
    pts = list(keep.values())
    hi = max(daily, key=lambda p: p[1]); lo = min(daily, key=lambda p: p[1])
    for p in (hi, lo):
        if p not in pts:
            pts.append(p)
    return sorted(pts)

def fetch_yf(tickers):
    import yfinance as yf
    frames = []
    for t in tickers:
        df = yf.download(t, start=START, end=END, interval="1mo", auto_adjust=False, progress=False)
        if df is not None and len(df):
            col = df["Close"]
            col = col.iloc[:, 0] if hasattr(col, "columns") else col
            frames.append([(i.date(), float(v)) for i, v in col.dropna().items()])
    if not frames:
        return []
    merged = {}
    for f in frames:                       # later tickers fill earlier gaps only
        for d, v in f:
            merged.setdefault(month_label(d), v)
    return sorted(merged.items())

def from_vega():
    from vega_datasets import data
    d = data.stocks()
    res = {}
    for sym, key in (("AMZN", "amzn"), ("MSFT", "msft"), ("GOOG", "goog")):
        x = d[d.symbol == sym].sort_values("date")
        res[key] = [(month_label(r.date), round(float(r.price), 2)) for r in x.itertuples()]
    return res

def build(source):
    vega = from_vega() if source == "vega" else {}
    series, notes = [], []
    for s in SERIES:
        pts, kind, how = [], "monthly", ""
        try:
            if source == "vega":
                if s["id"] in vega:
                    pts, how = vega[s["id"]], "vega_datasets monthly closes (Jan 2000 to Mar 2010)"
            elif s.get("fred"):
                pts = [[d.isoformat(), v] for d, v in weekly_with_extrema(fetch_fred(s["fred"]))]
                kind, how = "weekly", "FRED " + s["fred"] + " daily close, thinned to weekly"
            else:
                pts, how = fetch_yf(s["yf"]), "Yahoo Finance monthly close, " + "/".join(s["yf"])
        except Exception as e:                      # network or package failure: fall back, say so
            notes.append("%s: live fetch failed (%s)" % (s["id"], e))
        pts = [list(p) for p in pts]
        if not pts and s.get("fallback"):
            pts, kind, how = s["fallback"], "anchors", "paper anchors only (no price series retrieved)"
        if not pts:
            notes.append("%s: no data" % s["id"]); continue
        have = {p[0] for p in pts}
        for m in s.get("must", []):
            if m[0] not in have:
                pts.append(m)
        pts.sort(key=lambda p: p[0])
        o = dict(id=s["id"], name=s["name"], color=s["color"], kind=kind, source=how, fate=s["fate"], points=pts)
        if s.get("open_through"):
            o["openThrough"] = s["open_through"]
        series.append(o)
    return dict(meta=dict(asOf=dt.date.today().isoformat(), basis="closing prices, split-adjusted, dividends excluded unless noted",
                          notes=notes), series=series)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["live", "vega"], default="live")
    ap.add_argument("--out", default="data/boom-bust.json")
    a = ap.parse_args()
    out = build(a.source)
    with open(a.out, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print("wrote", a.out, [(s["id"], s["kind"], len(s["points"])) for s in out["series"]], out["meta"]["notes"], file=sys.stderr)

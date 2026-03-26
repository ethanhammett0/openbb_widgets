import asyncio
import re
import time
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

import feedparser
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Fintech News Flow")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pro.openbb.co",
        "https://pro.openbb.dev",
        "http://localhost:1420",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# RSS Feed Registry
# ---------------------------------------------------------------------------
FEEDS: dict[str, list[dict]] = {
    "payments_news": [
        {"name": "Payments Dive",            "url": "https://www.paymentsdive.com/feeds/news/"},
        {"name": "The Paypers",              "url": "https://thepaypers.com/feed/"},
        {"name": "Payments NEXT",            "url": "https://www.paymentsnext.com/feed"},
        {"name": "PaymentsJournal",          "url": "https://www.paymentsjournal.com/feed"},
        {"name": "Payments Cards & Mobile",  "url": "https://www.paymentscardsandmobile.com/feed"},
        {"name": "PYMNTS",                   "url": "https://www.pymnts.com/feed/"},
        {"name": "FF News Paytech",          "url": "https://ffnews.com/category/paytech/feed/"},
        {"name": "Tearsheet Payments",       "url": "https://tearsheet.co/category/payments/feed/"},
    ],
    "payments_infra": [
        {"name": "ACI Worldwide Blog",       "url": "https://www.aciworldwide.com/blog/feed"},
        {"name": "Stripe Blog",              "url": "https://stripe.com/blog/feed"},
        {"name": "Adyen Knowledge Hub",      "url": "https://www.adyen.com/blog/rss.xml"},
        {"name": "Checkout.com Blog",        "url": "https://www.checkout.com/blog/rss.xml"},
        {"name": "Nuvei Blog",               "url": "https://nuvei.com/blog/feed/"},
        {"name": "Spreedly Blog",            "url": "https://www.spreedly.com/blog/rss.xml"},
        {"name": "Dwolla RSS",               "url": "https://www.dwolla.com/updates/feed/"},
        {"name": "Cybersource Blog",         "url": "https://www.cybersource.com/en-us/blog.rss"},
    ],
    "banking": [
        {"name": "Banking Dive",             "url": "https://www.bankingdive.com/feeds/news/"},
        {"name": "Bank Automation News",     "url": "https://bankautomationnews.com/feed"},
        {"name": "Union Bank Blog",          "url": "https://www.ublocal.com/blog/feed"},
        {"name": "Bank Underground",         "url": "https://bankunderground.co.uk/feed"},
        {"name": "Bankwatch",                "url": "https://bankwatch.ca/feed"},
        {"name": "Dieterich Bank Blog",      "url": "https://www.dieterichbank.com/feed"},
        {"name": "Banking Tips",             "url": "https://banqingtips.com/feed"},
        {"name": "Accenture Banking",        "url": "https://bankingblog.accenture.com/feed"},
    ],
    "reg_us": [
        {"name": "CFPB Newsroom",            "url": "https://www.consumerfinance.gov/about-us/newsroom/feed/"},
        {"name": "OCC News Releases",        "url": "https://www.occ.treas.gov/rss/news-releases.xml"},
        {"name": "OCC Bulletins",            "url": "https://www.occ.treas.gov/rss/bulletins.xml"},
        {"name": "OCC Speeches",             "url": "https://www.occ.treas.gov/rss/speeches.xml"},
        {"name": "FDIC Press Releases",      "url": "https://www.fdic.gov/news/press-releases/rss.xml"},
        {"name": "Federal Reserve",          "url": "https://www.federalreserve.gov/feeds/press_all.xml"},
    ],
    "reg_intl": [
        {"name": "FCA News & Warnings",      "url": "https://www.fca.org.uk/news-warnings-rss"},
        {"name": "BIS Press Releases",       "url": "https://www.bis.org/doclist/all_pressrels.rss"},
        {"name": "BIS Research Papers",      "url": "https://www.bis.org/doclist/bis_fsi_publs.rss"},
        {"name": "Bank of England",          "url": "https://www.bankofengland.co.uk/rss/news"},
        {"name": "European Banking Authority","url": "https://www.eba.europa.eu/rss.xml"},
    ],
    "global_fintech": [
        {"name": "Finextra News",            "url": "https://www.finextra.com/rss/news"},
        {"name": "The Fintech Times",        "url": "https://thefintechtimes.com/feed"},
        {"name": "Fintech Singapore",        "url": "https://fintechnews.sg/feed"},
        {"name": "Finance Magnates Fintech", "url": "https://www.financemagnates.com/fintech/feed"},
        {"name": "Australian FinTech",       "url": "https://australianfintech.com.au/feed/"},
        {"name": "TechCrunch Fintech",       "url": "https://techcrunch.com/tag/fintech/feed"},
        {"name": "Techbullion",              "url": "https://techbullion.com/feed"},
        {"name": "eToro Analysis",           "url": "https://www.etoro.com/news-and-analysis/feed/"},
    ],
    "regional_niche": [
        {"name": "RinggitPay Blog",          "url": "https://ringgitpay.biz/feed"},
        {"name": "Payments Afrika",          "url": "https://paymentsafrika.com/feed/"},
        {"name": "Global Fintech & Payments","url": "https://www.globalfintechpayments.com/feed/"},
        {"name": "Panamax Blog",             "url": "https://www.panamaxil.com/blog/feed/"},
        {"name": "Centi Blog",               "url": "https://centi.ch/feed"},
    ],
    "fraud_security": [
        {"name": "BankInfoSecurity",         "url": "https://www.bankinfosecurity.com/rssFeeds.php"},
        {"name": "PCI SSC Blog",             "url": "https://blog.pcisecuritystandards.org/rss.xml"},
        {"name": "The Paypers Fraud",        "url": "https://thepaypers.com/fraud-and-fincrime/feed"},
        {"name": "Finextra Security",        "url": "https://www.finextra.com/rss/security"},
        {"name": "BioCatch Blog",            "url": "https://www.biocatch.com/blog/rss.xml"},
    ],
}

CATEGORY_LABELS = {
    "payments_news":   "Payments News",
    "payments_infra":  "Payments Infrastructure",
    "banking":         "Banking & Automation",
    "reg_us":          "US Regulators",
    "reg_intl":        "International Regulators",
    "global_fintech":  "Global Fintech Innovation",
    "regional_niche":  "Regional & Niche Markets",
    "fraud_security":  "Fraud & Security",
}

ALL_CATEGORIES = list(FEEDS.keys())

# Build a flat set of all source names for the /sources endpoint
ALL_SOURCES: list[str] = sorted({f["name"] for feeds in FEEDS.values() for f in feeds})

# ---------------------------------------------------------------------------
# Cache: { category_key: (timestamp, [articles]) }
# ---------------------------------------------------------------------------
_cache: dict[str, tuple[float, list]] = {}
CACHE_TTL = 300  # 5 minutes — keep feeds fresh

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}


def _parse_date(date_str: str) -> datetime | None:
    """Try to parse an ISO date string into a timezone-aware datetime."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_entry(entry, feed_name: str, feed_meta) -> dict:
    """Parse a feedparser entry into the OpenBB newsfeed schema."""
    pub = entry.get("published", entry.get("updated", ""))
    try:
        t = entry.get("published_parsed") or entry.get("updated_parsed")
        if t:
            pub = time.strftime("%Y-%m-%dT%H:%M:%SZ", t)
    except Exception:
        pass

    summary = entry.get("summary", "")
    summary = re.sub(r"<[^>]+>", "", summary).strip()
    if len(summary) > 400:
        summary = summary[:397] + "…"

    author = entry.get("author", "")
    if not author:
        author = feed_meta.get("title", feed_name)

    article_url = entry.get("link", "")

    # Embed clickable link in body markdown so OpenBB renders it
    body = summary
    if article_url:
        body = f"{summary}\n\n[Read full article →]({article_url})"

    return {
        "title":   entry.get("title", "(No title)"),
        "date":    pub,
        "author":  author,
        "excerpt": summary,
        "body":    body,
        "url":     article_url,  # keep for reference
        "source":  feed_name,    # track source for filtering
    }


async def _fetch_feed_async(client: httpx.AsyncClient, feed: dict) -> list[dict]:
    """Fetch and parse a single RSS feed asynchronously."""
    try:
        resp = await client.get(feed["url"], headers=BROWSER_HEADERS, timeout=8)
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)
        return [
            _parse_entry(e, feed["name"], parsed.feed)
            for e in parsed.entries[:25]
        ]
    except Exception:
        return []


async def _fetch_category_async(category: str) -> list[dict]:
    """Concurrently fetch all feeds in a category (or all categories)."""
    if category == "all":
        feed_list = [f for cat in ALL_CATEGORIES for f in FEEDS[cat]]
    else:
        feed_list = FEEDS.get(category, [])

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_feed_async(client, feed) for feed in feed_list]
        results = await asyncio.gather(*tasks)

    articles = [item for sublist in results for item in sublist]
    articles.sort(key=lambda x: x.get("date", ""), reverse=True)
    return articles[:100]


def _get_articles(category: str) -> list[dict]:
    """Return cached articles, refreshing if stale."""
    now = time.time()
    if category in _cache:
        ts, data = _cache[category]
        if now - ts < CACHE_TTL:
            return data

    articles = asyncio.run(_fetch_category_async(category))
    _cache[category] = (now, articles)
    return articles


def _apply_date_filter(
    articles: list[dict],
    filter_type: str,
    start_date: str | None,
    end_date: str | None,
    trailing_months: int | None,
) -> list[dict]:
    """Filter articles by date based on filter_type."""
    if filter_type == "date_range" and (start_date or end_date):
        start_dt = _parse_date(start_date) if start_date else None
        end_dt = _parse_date(end_date) if end_date else None
        filtered = []
        for a in articles:
            art_dt = _parse_date(a.get("date", ""))
            if art_dt is None:
                continue
            if start_dt and art_dt < start_dt:
                continue
            if end_dt and art_dt > end_dt:
                continue
            filtered.append(a)
        return filtered

    elif filter_type == "trailing" and trailing_months and trailing_months > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=trailing_months * 30)
        filtered = []
        for a in articles:
            art_dt = _parse_date(a.get("date", ""))
            if art_dt is None:
                continue
            if art_dt >= cutoff:
                filtered.append(a)
        return filtered

    return articles  # no filter applied


# ---------------------------------------------------------------------------
# Required OpenBB endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "Fintech News Flow — OpenBB RSS Backend", "port": 7790}


@app.get("/widgets.json")
def get_widgets():
    f = Path(__file__).parent / "widgets.json"
    with open(f, encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/apps.json")
def get_apps():
    f = Path(__file__).parent / "apps.json"
    with open(f, encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# News endpoint
# ---------------------------------------------------------------------------

@app.get("/news")
def get_news(
    category: str = Query("payments_news"),
    filter_type: str = Query("none", description="none | date_range | trailing"),
    start_date: str | None = Query(None, description="YYYY-MM-DD (used when filter_type=date_range)"),
    end_date: str | None = Query(None, description="YYYY-MM-DD (used when filter_type=date_range)"),
    trailing_months: int | None = Query(None, ge=1, le=24, description="# of months back (used when filter_type=trailing)"),
    limit: int = Query(50, ge=10, le=100, description="Max articles to return"),
    source: str = Query("all", description="Filter by source name"),
):
    valid = ALL_CATEGORIES + ["all"]
    if category not in valid:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown category '{category}'. Valid: {valid}"},
        )
    try:
        articles = _get_articles(category)
        articles = _apply_date_filter(articles, filter_type, start_date, end_date, trailing_months)
        # Source filter
        if source and source != "all":
            articles = [a for a in articles if a.get("source", "") == source]
        return articles[:limit]
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ---------------------------------------------------------------------------
# Helper endpoints
# ---------------------------------------------------------------------------

@app.get("/categories")
def get_categories():
    return [{"label": "All Categories", "value": "all"}] + [
        {"label": v, "value": k} for k, v in CATEGORY_LABELS.items()
    ]


@app.get("/sources")
def get_sources():
    """Return all RSS source names for the source filter dropdown."""
    return [{"label": "All Sources", "value": "all"}] + [
        {"label": name, "value": name} for name in ALL_SOURCES
    ]


@app.delete("/cache")
def clear_cache():
    _cache.clear()
    return {"message": "Cache cleared"}

"""
Tab 7: SEC Filings — EDGAR full-text search, company submissions, XBRL financials,
insider transactions, 8-K events, filing timeline, and document viewer.

Uses the free SEC EDGAR APIs (no API key required, just User-Agent header).
Endpoints:
  - efts.sec.gov/LATEST/search-index   → full-text search
  - data.sec.gov/submissions/CIK{}.json → company filing history
  - data.sec.gov/api/xbrl/companyfacts  → structured XBRL financial data
  - data.sec.gov/api/xbrl/companyconcept → single concept time series
  - www.sec.gov/files/company_tickers.json → CIK ↔ ticker mapping
"""
import logging
import os
import re
from datetime import datetime, timedelta
from typing import List, Literal, Optional
from pydantic import BaseModel

import httpx
from cachetools import TTLCache
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)

# ── SEC EDGAR requires a User-Agent identifying the caller ──
SEC_USER_AGENT = os.getenv(
    "SEC_USER_AGENT",
    "FintechTerminal/1.0 (ethanhammett0@gmail.com)"
)
SEC_HEADERS = {
    "User-Agent": SEC_USER_AGENT,
    "Accept-Encoding": "gzip, deflate",
    "Accept": "application/json",
}

# ── Caches ──
_cache_10m = TTLCache(maxsize=128, ttl=600)
_cache_1h = TTLCache(maxsize=64, ttl=3600)
_cache_24h = TTLCache(maxsize=32, ttl=86400)
_cik_map: dict = {}  # ticker → CIK, loaded once


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _sec_get(url: str, params: dict | None = None, timeout: int = 20) -> dict | list:
    """GET from SEC with proper headers and caching-friendly key."""
    key = f"{url}|{params}"
    if key in _cache_10m:
        return _cache_10m[key]
    r = httpx.get(url, params=params, headers=SEC_HEADERS, timeout=timeout, follow_redirects=True)
    r.raise_for_status()
    data = r.json()
    _cache_10m[key] = data
    return data


def _load_cik_map() -> dict:
    """Load ticker → CIK mapping from SEC. Cached 24h."""
    global _cik_map
    if _cik_map:
        return _cik_map
    key = "cik_map"
    if key in _cache_24h:
        _cik_map = _cache_24h[key]
        return _cik_map
    try:
        url = "https://www.sec.gov/files/company_tickers.json"
        r = httpx.get(url, headers=SEC_HEADERS, timeout=20)
        r.raise_for_status()
        raw = r.json()
        mapping = {}
        for entry in raw.values():
            ticker = entry.get("ticker", "").upper()
            cik = str(entry.get("cik_str", ""))
            if ticker and cik:
                mapping[ticker] = cik
        _cik_map = mapping
        _cache_24h[key] = mapping
        logger.info(f"Loaded {len(mapping)} ticker→CIK mappings")
    except Exception as e:
        logger.error(f"Failed to load CIK map: {e}")
        _cik_map = {}
    return _cik_map


def _ticker_to_cik(ticker: str) -> str:
    """Convert ticker to zero-padded 10-digit CIK."""
    m = _load_cik_map()
    cik = m.get(ticker.upper(), "")
    if cik:
        return cik.zfill(10)
    return ""


def _cik_to_ticker(cik: str) -> str:
    """Reverse lookup CIK → ticker."""
    m = _load_cik_map()
    cik_clean = str(int(cik)) if cik else ""
    for t, c in m.items():
        if c == cik_clean:
            return t
    return ""


# ═══════════════════════════════════════════════════════════════════════════
# Dropdown option endpoints
# ═══════════════════════════════════════════════════════════════════════════

FORM_TYPES = [
    "All", "10-K", "10-Q", "8-K", "DEF 14A", "S-1", "S-3", "S-4",
    "SC 13D", "SC 13G", "13F-HR", "4", "3", "5",
    "424B2", "424B4", "6-K", "20-F", "40-F",
    "DEFA14A", "PRE 14A", "PX14A6G",
]

XBRL_CONCEPTS = [
    {"label": "Revenue", "value": "us-gaap/Revenues"},
    {"label": "Net Income", "value": "us-gaap/NetIncomeLoss"},
    {"label": "Total Assets", "value": "us-gaap/Assets"},
    {"label": "Total Liabilities", "value": "us-gaap/Liabilities"},
    {"label": "Stockholders Equity", "value": "us-gaap/StockholdersEquity"},
    {"label": "Operating Income", "value": "us-gaap/OperatingIncomeLoss"},
    {"label": "EPS Basic", "value": "us-gaap/EarningsPerShareBasic"},
    {"label": "EPS Diluted", "value": "us-gaap/EarningsPerShareDiluted"},
    {"label": "Cash & Equivalents", "value": "us-gaap/CashAndCashEquivalentsAtCarryingValue"},
    {"label": "Operating Cash Flow", "value": "us-gaap/NetCashProvidedByOperatingActivities"},
    {"label": "CapEx", "value": "us-gaap/PaymentsToAcquirePropertyPlantAndEquipment"},
    {"label": "Long-Term Debt", "value": "us-gaap/LongTermDebt"},
    {"label": "Goodwill", "value": "us-gaap/Goodwill"},
    {"label": "SGA Expense", "value": "us-gaap/SellingGeneralAndAdministrativeExpense"},
    {"label": "R&D Expense", "value": "us-gaap/ResearchAndDevelopmentExpense"},
    {"label": "Cost of Revenue", "value": "us-gaap/CostOfRevenue"},
    {"label": "Gross Profit", "value": "us-gaap/GrossProfit"},
    {"label": "Shares Outstanding", "value": "us-gaap/CommonStockSharesOutstanding"},
    {"label": "Dividends Per Share", "value": "us-gaap/CommonStockDividendsPerShareDeclared"},
    {"label": "Interest Expense", "value": "us-gaap/InterestExpense"},
]

EVENT_TYPES_8K = [
    {"label": "All Events", "value": "all"},
    {"label": "1.01 — Entry into Material Agreement", "value": "1.01"},
    {"label": "1.02 — Termination of Material Agreement", "value": "1.02"},
    {"label": "2.01 — Completion of Acquisition", "value": "2.01"},
    {"label": "2.02 — Results of Operations (Earnings)", "value": "2.02"},
    {"label": "2.05 — Costs of Restructuring", "value": "2.05"},
    {"label": "2.06 — Material Impairment", "value": "2.06"},
    {"label": "3.01 — Delisting Notice", "value": "3.01"},
    {"label": "4.01 — Auditor Changes", "value": "4.01"},
    {"label": "4.02 — Non-Reliance on Financials", "value": "4.02"},
    {"label": "5.02 — Officer/Director Changes", "value": "5.02"},
    {"label": "5.03 — Amendment to Articles/Bylaws", "value": "5.03"},
    {"label": "5.07 — Shareholder Vote Results", "value": "5.07"},
    {"label": "7.01 — Regulation FD Disclosure", "value": "7.01"},
    {"label": "8.01 — Other Events", "value": "8.01"},
    {"label": "9.01 — Financial Statements & Exhibits", "value": "9.01"},
]


@router.get("/sec_form_types")
def sec_form_types():
    """Dropdown: SEC form types."""
    return [{"label": f, "value": f} for f in FORM_TYPES]


@router.get("/sec_xbrl_concepts")
def sec_xbrl_concepts():
    """Dropdown: XBRL financial concepts."""
    return XBRL_CONCEPTS


@router.get("/sec_8k_events")
def sec_8k_events():
    """Dropdown: 8-K event item types."""
    return EVENT_TYPES_8K


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.1 — EDGAR Full-Text Search
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_filing_search")
def sec_filing_search(
    q: str = Query("", description="Search query (keywords, company, ticker)"),
    forms: str = Query("All", description="Form type filter"),
    start_date: str = Query(None, description="Start date YYYY-MM-DD"),
    end_date: str = Query(None, description="End date YYYY-MM-DD"),
    limit: int = Query(40, ge=10, le=100),
):
    """Full-text search across all EDGAR filings since 2001."""
    if not q.strip():
        return []

    params = {
        "q": q.strip(),
        "from": 0,
        "size": limit,
    }

    if forms and forms != "All":
        params["forms"] = forms

    if start_date or end_date:
        params["dateRange"] = "custom"
        if start_date:
            params["startdt"] = start_date
        if end_date:
            params["enddt"] = end_date

    try:
        url = "https://efts.sec.gov/LATEST/search-index"
        data = _sec_get(url, params=params, timeout=25)

        hits = data.get("hits", {}).get("hits", [])
        total = data.get("hits", {}).get("total", {})
        total_count = total.get("value", 0) if isinstance(total, dict) else total

        rows = []
        for h in hits:
            src = h.get("_source", {})
            file_date = src.get("file_date", "")
            period = src.get("period_of_report", "")
            entity = src.get("entity_name", "")
            form = src.get("form_type", "")
            cik = str(src.get("entity_id", ""))
            accession = src.get("file_num", "")

            # Build filing URL
            file_path = src.get("file_path", "")
            filing_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{file_path}" if file_path else ""

            # Try to get ticker from CIK
            ticker = _cik_to_ticker(cik) if cik else ""

            rows.append({
                "ticker": ticker,
                "entity_name": entity,
                "form_type": form,
                "filed_date": file_date,
                "period_of_report": period,
                "cik": cik,
                "filing_url": filing_url,
                "description": src.get("file_description", ""),
            })

        return rows

    except Exception as e:
        logger.error(f"sec_filing_search error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.2 — Company Filing History
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_company_filings")
def sec_company_filings(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    forms: str = Query("All", description="Filter by form type"),
    limit: int = Query(50, ge=10, le=200),
):
    """Recent filings for a specific company from EDGAR submissions API."""
    cik = _ticker_to_cik(symbol)
    if not cik:
        return []

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)

        company_name = data.get("name", symbol)
        sic = data.get("sic", "")
        sic_desc = data.get("sicDescription", "")
        exchanges = data.get("exchanges", [])
        exchange = exchanges[0] if exchanges else ""

        recent = data.get("filings", {}).get("recent", {})
        if not recent:
            return []

        form_list = recent.get("form", [])
        date_list = recent.get("filingDate", [])
        accession_list = recent.get("accessionNumber", [])
        primary_doc_list = recent.get("primaryDocument", [])
        desc_list = recent.get("primaryDocDescription", [])
        period_list = recent.get("reportDate", [])
        accept_list = recent.get("acceptanceDateTime", [])
        act_list = recent.get("act", [])
        size_list = recent.get("size", [])

        rows = []
        for i in range(min(len(form_list), 500)):
            form = form_list[i] if i < len(form_list) else ""

            if forms != "All" and form != forms:
                continue

            accession = accession_list[i] if i < len(accession_list) else ""
            accession_clean = accession.replace("-", "")
            primary_doc = primary_doc_list[i] if i < len(primary_doc_list) else ""
            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/{primary_doc}"
                if accession and primary_doc else ""
            )
            index_url = (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/"
                if accession else ""
            )

            filed = date_list[i] if i < len(date_list) else ""
            period = period_list[i] if i < len(period_list) else ""
            desc = desc_list[i] if i < len(desc_list) else ""
            accepted = accept_list[i] if i < len(accept_list) else ""
            size = size_list[i] if i < len(size_list) else 0

            # Convert size to human readable
            size_kb = round(size / 1024, 1) if size else 0

            rows.append({
                "form_type": form,
                "filed_date": filed,
                "period_of_report": period,
                "description": desc,
                "accepted": accepted[:19] if accepted else "",
                "size_kb": size_kb,
                "accession": accession,
                "filing_url": filing_url,
                "index_url": index_url,
            })

            if len(rows) >= limit:
                break

        return rows

    except Exception as e:
        logger.error(f"sec_company_filings error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.3 — Company Filing Metrics (KPI bar)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_filing_metrics")
def sec_filing_metrics(
    symbol: str = Query("PYPL", description="Ticker symbol"),
):
    """Quick-look KPI metrics: latest 10-K, 10-Q dates, total filings, SIC."""
    cik = _ticker_to_cik(symbol)
    if not cik:
        return [
            {"label": "Company", "value": symbol, "subvalue": "CIK not found"},
        ]

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)

        company_name = data.get("name", symbol)
        sic = data.get("sic", "")
        sic_desc = data.get("sicDescription", "")
        state = data.get("stateOfIncorporation", "")
        fiscal_end = data.get("fiscalYearEnd", "")

        recent = data.get("filings", {}).get("recent", {})
        form_list = recent.get("form", [])
        date_list = recent.get("filingDate", [])

        total_filings = len(form_list)

        # Find latest 10-K and 10-Q
        latest_10k = ""
        latest_10q = ""
        latest_8k = ""
        form4_count = 0
        for i, f in enumerate(form_list):
            d = date_list[i] if i < len(date_list) else ""
            if f == "10-K" and not latest_10k:
                latest_10k = d
            elif f == "10-Q" and not latest_10q:
                latest_10q = d
            elif f == "8-K" and not latest_8k:
                latest_8k = d
            elif f == "4":
                form4_count += 1

        return [
            {"label": "Company", "value": company_name, "subvalue": f"CIK: {int(cik)}"},
            {"label": "SIC Code", "value": sic, "subvalue": sic_desc},
            {"label": "Total Filings", "value": str(total_filings), "subvalue": "Recent history"},
            {"label": "Latest 10-K", "value": latest_10k or "N/A", "subvalue": "Annual report"},
            {"label": "Latest 10-Q", "value": latest_10q or "N/A", "subvalue": "Quarterly report"},
            {"label": "Latest 8-K", "value": latest_8k or "N/A", "subvalue": "Material event"},
            {"label": "Insider Filings (Form 4)", "value": str(form4_count), "subvalue": "In recent history"},
            {"label": "State / FYE", "value": f"{state}", "subvalue": f"FYE: {fiscal_end}"},
        ]

    except Exception as e:
        logger.error(f"sec_filing_metrics error: {e}")
        return [{"label": "Error", "value": str(e)}]


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.4 — XBRL Financial Facts (Structured Financials)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_xbrl_facts")
def sec_xbrl_facts(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    concept: str = Query("us-gaap/Revenues", description="XBRL concept"),
    unit_filter: str = Query("USD", description="Unit filter"),
):
    """
    Structured XBRL financial data for a single concept over time.
    Uses the companyconcept API for clean time series.
    """
    cik = _ticker_to_cik(symbol)
    if not cik:
        return []

    try:
        # Parse taxonomy and concept name
        parts = concept.split("/")
        taxonomy = parts[0] if len(parts) == 2 else "us-gaap"
        concept_name = parts[1] if len(parts) == 2 else concept

        url = f"https://data.sec.gov/api/xbrl/companyconcept/CIK{cik}/{taxonomy}/{concept_name}.json"
        data = _sec_get(url, timeout=25)

        entity_name = data.get("entityName", symbol)
        units = data.get("units", {})

        rows = []
        for unit_key, entries in units.items():
            if unit_filter and unit_filter.upper() not in unit_key.upper():
                # Check for shares too
                if unit_filter.upper() == "SHARES" and "shares" not in unit_key.lower():
                    continue
                elif unit_filter.upper() == "USD" and "usd" not in unit_key.lower():
                    continue

            for e in entries:
                form = e.get("form", "")
                # Focus on 10-K and 10-Q for clean data
                if form not in ("10-K", "10-Q", "10-K/A", "10-Q/A"):
                    continue

                val = e.get("val", 0)
                filed = e.get("filed", "")
                end_date = e.get("end", "")
                start_date = e.get("start", "")
                fy = e.get("fy", "")
                fp = e.get("fp", "")
                accn = e.get("accn", "")

                # Determine if annual or quarterly
                period_type = "Annual" if form in ("10-K", "10-K/A") else "Quarterly"

                rows.append({
                    "period_end": end_date,
                    "period_start": start_date or "",
                    "fiscal_year": fy,
                    "fiscal_period": fp,
                    "form": form,
                    "period_type": period_type,
                    "value": val,
                    "unit": unit_key,
                    "filed_date": filed,
                    "accession": accn,
                })

        # Sort by period end date descending
        rows.sort(key=lambda r: r.get("period_end", ""), reverse=True)

        # Deduplicate — keep latest filing per period
        seen = set()
        deduped = []
        for r in rows:
            key = (r["period_end"], r["fiscal_period"])
            if key not in seen:
                seen.add(key)
                deduped.append(r)

        return deduped

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            logger.warning(f"XBRL concept {concept} not found for {symbol}")
            return []
        raise
    except Exception as e:
        logger.error(f"sec_xbrl_facts error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.5 — XBRL Concept Chart (Time Series Visualization)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_xbrl_chart")
def sec_xbrl_chart(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    concept: str = Query("us-gaap/Revenues", description="XBRL concept"),
    period_type: str = Query("Annual", description="Annual or Quarterly"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
):
    """Plotly bar chart of a financial concept over time."""
    import plotly.graph_objects as go
    import json as json_mod

    # Reuse the facts endpoint logic
    facts = sec_xbrl_facts(symbol=symbol, concept=concept, unit_filter="USD")

    # Filter by period type
    if period_type == "Annual":
        facts = [f for f in facts if f["period_type"] == "Annual"]
    elif period_type == "Quarterly":
        facts = [f for f in facts if f["period_type"] == "Quarterly"]

    # Sort chronologically
    facts.sort(key=lambda r: r.get("period_end", ""))

    if raw or not facts:
        return facts

    dates = [f["period_end"] for f in facts]
    values = [f["value"] for f in facts]
    labels = [f"{f['fiscal_year']} {f['fiscal_period']}" for f in facts]

    # Determine concept label
    concept_label = concept.split("/")[-1] if "/" in concept else concept
    # Insert spaces before capitals
    concept_label = re.sub(r'([a-z])([A-Z])', r'\1 \2', concept_label)

    colors = ["#2196F3" if v >= 0 else "#EF5350" for v in values]

    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=dates,
        y=values,
        text=labels,
        marker_color=colors,
        hovertemplate="<b>%{text}</b><br>Period End: %{x}<br>Value: %{y:,.0f}<extra></extra>",
    ))

    fig.update_layout(
        template="plotly_dark" if theme == "dark" else "plotly_white",
        xaxis_title="Period End",
        yaxis_title=concept_label,
        yaxis_tickformat=",",
        margin=dict(l=60, r=20, t=10, b=40),
        showlegend=False,
    )

    return JSONResponse(content=json_mod.loads(fig.to_json()))


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.6 — Insider Transactions (Form 4)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_insider_transactions")
def sec_insider_transactions(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    limit: int = Query(50, ge=10, le=200),
):
    """
    Insider transactions from Form 4 filings via EDGAR submissions.
    Parses the recent filings to extract Form 4 entries.
    """
    cik = _ticker_to_cik(symbol)
    if not cik:
        return []

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)

        recent = data.get("filings", {}).get("recent", {})
        form_list = recent.get("form", [])
        date_list = recent.get("filingDate", [])
        accession_list = recent.get("accessionNumber", [])
        primary_doc_list = recent.get("primaryDocument", [])
        desc_list = recent.get("primaryDocDescription", [])
        accept_list = recent.get("acceptanceDateTime", [])
        owner_list = recent.get("items", [])  # Items field for 8-K items

        rows = []
        for i in range(len(form_list)):
            form = form_list[i]
            if form not in ("4", "3", "5", "4/A", "3/A", "5/A"):
                continue

            filed = date_list[i] if i < len(date_list) else ""
            accession = accession_list[i] if i < len(accession_list) else ""
            accession_clean = accession.replace("-", "")
            primary_doc = primary_doc_list[i] if i < len(primary_doc_list) else ""
            desc = desc_list[i] if i < len(desc_list) else ""
            accepted = accept_list[i] if i < len(accept_list) else ""

            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/{primary_doc}"
                if accession and primary_doc else ""
            )

            form_label = {
                "3": "Initial Ownership",
                "3/A": "Initial Ownership (Amended)",
                "4": "Change in Ownership",
                "4/A": "Change in Ownership (Amended)",
                "5": "Annual Ownership",
                "5/A": "Annual Ownership (Amended)",
            }.get(form, form)

            rows.append({
                "form": form,
                "form_description": form_label,
                "filed_date": filed,
                "accepted": accepted[:19] if accepted else "",
                "description": desc,
                "accession": accession,
                "filing_url": filing_url,
            })

            if len(rows) >= limit:
                break

        return rows

    except Exception as e:
        logger.error(f"sec_insider_transactions error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.7 — Recent 8-K Events
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_8k_filings")
def sec_8k_filings(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    event_type: str = Query("all", description="8-K item type filter"),
    limit: int = Query(30, ge=5, le=100),
):
    """Recent 8-K material event filings for a company."""
    cik = _ticker_to_cik(symbol)
    if not cik:
        return []

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)

        recent = data.get("filings", {}).get("recent", {})
        form_list = recent.get("form", [])
        date_list = recent.get("filingDate", [])
        accession_list = recent.get("accessionNumber", [])
        primary_doc_list = recent.get("primaryDocument", [])
        desc_list = recent.get("primaryDocDescription", [])
        items_list = recent.get("items", [])
        accept_list = recent.get("acceptanceDateTime", [])
        size_list = recent.get("size", [])

        rows = []
        for i in range(len(form_list)):
            form = form_list[i]
            if form not in ("8-K", "8-K/A"):
                continue

            items = items_list[i] if i < len(items_list) else ""

            # Filter by event type
            if event_type != "all" and items:
                if event_type not in items:
                    continue

            filed = date_list[i] if i < len(date_list) else ""
            accession = accession_list[i] if i < len(accession_list) else ""
            accession_clean = accession.replace("-", "")
            primary_doc = primary_doc_list[i] if i < len(primary_doc_list) else ""
            desc = desc_list[i] if i < len(desc_list) else ""
            accepted = accept_list[i] if i < len(accept_list) else ""
            size = size_list[i] if i < len(size_list) else 0

            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/{primary_doc}"
                if accession and primary_doc else ""
            )

            rows.append({
                "form_type": form,
                "filed_date": filed,
                "items": items,
                "description": desc,
                "accepted": accepted[:19] if accepted else "",
                "size_kb": round(size / 1024, 1) if size else 0,
                "accession": accession,
                "filing_url": filing_url,
            })

            if len(rows) >= limit:
                break

        return rows

    except Exception as e:
        logger.error(f"sec_8k_filings error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.8 — Filing Activity Timeline Chart
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_filing_timeline")
def sec_filing_timeline(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    lookback_years: int = Query(3, ge=1, le=10),
    theme: str = Query("dark"),
    raw: bool = Query(False),
):
    """Plotly timeline showing filing activity by form type over time."""
    import plotly.graph_objects as go
    import json as json_mod
    from collections import Counter

    cik = _ticker_to_cik(symbol)
    if not cik:
        if raw:
            return []
        fig = go.Figure()
        fig.update_layout(template="plotly_dark" if theme == "dark" else "plotly_white")
        return JSONResponse(content=json_mod.loads(fig.to_json()))

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)

        recent = data.get("filings", {}).get("recent", {})
        form_list = recent.get("form", [])
        date_list = recent.get("filingDate", [])

        cutoff = (datetime.now() - timedelta(days=lookback_years * 365)).strftime("%Y-%m-%d")

        # Key form types to track
        key_forms = {"10-K", "10-Q", "8-K", "4", "SC 13D", "SC 13G", "S-1", "DEF 14A"}

        raw_data = []
        monthly = {}  # (YYYY-MM, form) → count
        for i in range(len(form_list)):
            filed = date_list[i] if i < len(date_list) else ""
            form = form_list[i] if i < len(form_list) else ""

            if filed < cutoff:
                continue

            month = filed[:7]  # YYYY-MM
            category = form if form in key_forms else "Other"

            raw_data.append({"date": filed, "form": form, "category": category, "month": month})
            k = (month, category)
            monthly[k] = monthly.get(k, 0) + 1

        if raw:
            return raw_data

        # Build traces per category
        months_set = sorted({k[0] for k in monthly})
        categories = sorted({k[1] for k in monthly})

        color_map = {
            "10-K": "#4CAF50", "10-Q": "#2196F3", "8-K": "#FF9800",
            "4": "#9C27B0", "SC 13D": "#E91E63", "SC 13G": "#00BCD4",
            "S-1": "#F44336", "DEF 14A": "#795548", "Other": "#607D8B",
        }

        fig = go.Figure()
        for cat in categories:
            y_vals = [monthly.get((m, cat), 0) for m in months_set]
            fig.add_trace(go.Bar(
                x=months_set,
                y=y_vals,
                name=cat,
                marker_color=color_map.get(cat, "#607D8B"),
            ))

        fig.update_layout(
            barmode="stack",
            template="plotly_dark" if theme == "dark" else "plotly_white",
            xaxis_title="Month",
            yaxis_title="Filing Count",
            margin=dict(l=50, r=20, t=10, b=40),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        )

        return JSONResponse(content=json_mod.loads(fig.to_json()))

    except Exception as e:
        logger.error(f"sec_filing_timeline error: {e}")
        fig = go.Figure()
        fig.update_layout(template="plotly_dark" if theme == "dark" else "plotly_white")
        return JSONResponse(content=json_mod.loads(fig.to_json()))


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.9 — XBRL Multi-Concept Snapshot (Company Financials at a Glance)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_financial_snapshot")
def sec_financial_snapshot(
    symbol: str = Query("PYPL", description="Ticker symbol"),
):
    """
    Pull the latest values for key financial concepts from XBRL companyfacts.
    Bloomberg-style snapshot of the most recent annual/quarterly data.
    """
    cik = _ticker_to_cik(symbol)
    if not cik:
        return []

    key_concepts = [
        ("Revenues", "us-gaap", "Revenue"),
        ("NetIncomeLoss", "us-gaap", "Net Income"),
        ("Assets", "us-gaap", "Total Assets"),
        ("Liabilities", "us-gaap", "Total Liabilities"),
        ("StockholdersEquity", "us-gaap", "Equity"),
        ("OperatingIncomeLoss", "us-gaap", "Operating Income"),
        ("EarningsPerShareDiluted", "us-gaap", "EPS (Diluted)"),
        ("CashAndCashEquivalentsAtCarryingValue", "us-gaap", "Cash & Equiv"),
        ("NetCashProvidedByOperatingActivities", "us-gaap", "Op. Cash Flow"),
        ("LongTermDebt", "us-gaap", "LT Debt"),
        ("GrossProfit", "us-gaap", "Gross Profit"),
        ("CommonStockSharesOutstanding", "us-gaap", "Shares Out"),
        ("ResearchAndDevelopmentExpense", "us-gaap", "R&D Expense"),
    ]

    try:
        url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
        data = _sec_get(url, timeout=30)
        facts = data.get("facts", {})

        rows = []
        for concept_name, taxonomy, label in key_concepts:
            tax_facts = facts.get(taxonomy, {})
            concept_data = tax_facts.get(concept_name, {})
            units = concept_data.get("units", {})

            # Try USD first, then shares, then pure
            for unit_key in ["USD", "shares", "pure"]:
                entries = units.get(unit_key, [])
                if not entries:
                    continue

                # Filter to 10-K and 10-Q
                annual = [e for e in entries if e.get("form") in ("10-K", "10-K/A")]
                quarterly = [e for e in entries if e.get("form") in ("10-Q", "10-Q/A")]

                latest_annual = max(annual, key=lambda x: x.get("end", ""), default=None)
                latest_quarterly = max(quarterly, key=lambda x: x.get("end", ""), default=None)

                annual_val = latest_annual.get("val", None) if latest_annual else None
                annual_period = latest_annual.get("end", "") if latest_annual else ""
                quarterly_val = latest_quarterly.get("val", None) if latest_quarterly else None
                quarterly_period = latest_quarterly.get("end", "") if latest_quarterly else ""

                # Format large numbers
                def _fmt(v, u):
                    if v is None:
                        return "N/A"
                    if u == "USD":
                        if abs(v) >= 1e9:
                            return f"${v/1e9:,.2f}B"
                        elif abs(v) >= 1e6:
                            return f"${v/1e6:,.1f}M"
                        else:
                            return f"${v:,.0f}"
                    elif u == "shares":
                        if abs(v) >= 1e9:
                            return f"{v/1e9:,.2f}B"
                        elif abs(v) >= 1e6:
                            return f"{v/1e6:,.1f}M"
                        else:
                            return f"{v:,.0f}"
                    else:
                        return f"{v:,.4f}" if isinstance(v, float) else f"{v:,}"

                rows.append({
                    "metric": label,
                    "latest_annual": _fmt(annual_val, unit_key),
                    "annual_period": annual_period,
                    "latest_quarterly": _fmt(quarterly_val, unit_key),
                    "quarterly_period": quarterly_period,
                    "raw_annual": annual_val,
                    "raw_quarterly": quarterly_val,
                    "unit": unit_key,
                })
                break  # Found data for this concept

        return rows

    except Exception as e:
        logger.error(f"sec_financial_snapshot error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.10 — SEC Universe Filing Scan (Multi-Ticker)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_universe_filings")
def sec_universe_filings(
    sub_sector: str = Query("All", description="Sub-sector filter"),
    forms: str = Query("10-K", description="Form type filter"),
    days_back: int = Query(30, ge=1, le=365),
):
    """
    Scan the fintech universe for recent filings of a given type.
    Useful for: 'who filed a 10-K in the last 30 days?'
    """
    from universe import get_all_tickers, get_sub_sector_tickers, get_ticker_sub_sector

    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    cutoff = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    rows = []
    for t in tickers:
        cik = _ticker_to_cik(t)
        if not cik:
            continue
        try:
            url = f"https://data.sec.gov/submissions/CIK{cik}.json"
            data = _sec_get(url, timeout=20)
            recent = data.get("filings", {}).get("recent", {})
            form_list = recent.get("form", [])
            date_list = recent.get("filingDate", [])
            desc_list = recent.get("primaryDocDescription", [])
            accession_list = recent.get("accessionNumber", [])
            primary_doc_list = recent.get("primaryDocument", [])

            for i in range(min(len(form_list), 100)):
                form = form_list[i]
                filed = date_list[i] if i < len(date_list) else ""

                if filed < cutoff:
                    break  # Dates are in descending order

                if forms != "All" and form != forms:
                    continue

                accession = accession_list[i] if i < len(accession_list) else ""
                accession_clean = accession.replace("-", "")
                primary_doc = primary_doc_list[i] if i < len(primary_doc_list) else ""
                desc = desc_list[i] if i < len(desc_list) else ""

                filing_url = (
                    f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/{primary_doc}"
                    if accession and primary_doc else ""
                )

                rows.append({
                    "ticker": t,
                    "sub_sector": get_ticker_sub_sector(t),
                    "form_type": form,
                    "filed_date": filed,
                    "description": desc,
                    "filing_url": filing_url,
                })

        except Exception as e:
            logger.warning(f"sec_universe_filings skip {t}: {e}")
            continue

    rows.sort(key=lambda r: r.get("filed_date", ""), reverse=True)
    return rows


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.11 — 13F Institutional Holdings
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_13f_holders")
def sec_13f_holders(
    symbol: str = Query("PYPL", description="Ticker symbol"),
):
    """
    Search for recent 13F-HR filings that mention a ticker.
    Uses EDGAR full-text search to find institutional holders.
    """
    if not symbol.strip():
        return []

    try:
        params = {
            "q": f'"{symbol}"',
            "forms": "13F-HR",
            "dateRange": "custom",
            "startdt": (datetime.now() - timedelta(days=120)).strftime("%Y-%m-%d"),
            "enddt": datetime.now().strftime("%Y-%m-%d"),
            "from": 0,
            "size": 50,
        }

        url = "https://efts.sec.gov/LATEST/search-index"
        data = _sec_get(url, params=params, timeout=25)

        hits = data.get("hits", {}).get("hits", [])
        rows = []
        seen_entities = set()

        for h in hits:
            src = h.get("_source", {})
            entity = src.get("entity_name", "")

            if entity in seen_entities:
                continue
            seen_entities.add(entity)

            cik = str(src.get("entity_id", ""))
            filed = src.get("file_date", "")
            period = src.get("period_of_report", "")
            file_path = src.get("file_path", "")
            filing_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{file_path}" if file_path else ""

            rows.append({
                "institution": entity,
                "cik": cik,
                "filed_date": filed,
                "period_of_report": period,
                "filing_url": filing_url,
            })

        return rows

    except Exception as e:
        logger.error(f"sec_13f_holders error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.12 — Proxy & Governance Filings (DEF 14A, DEFA14A)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sec_proxy_filings")
def sec_proxy_filings(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    limit: int = Query(20, ge=5, le=50),
):
    """Proxy and governance-related filings for a company."""
    cik = _ticker_to_cik(symbol)
    if not cik:
        return []

    proxy_forms = {"DEF 14A", "DEFA14A", "PRE 14A", "DEF 14C", "PX14A6G", "DEFC14A"}

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)

        recent = data.get("filings", {}).get("recent", {})
        form_list = recent.get("form", [])
        date_list = recent.get("filingDate", [])
        accession_list = recent.get("accessionNumber", [])
        primary_doc_list = recent.get("primaryDocument", [])
        desc_list = recent.get("primaryDocDescription", [])

        rows = []
        for i in range(len(form_list)):
            form = form_list[i]
            if form not in proxy_forms:
                continue

            filed = date_list[i] if i < len(date_list) else ""
            accession = accession_list[i] if i < len(accession_list) else ""
            accession_clean = accession.replace("-", "")
            primary_doc = primary_doc_list[i] if i < len(primary_doc_list) else ""
            desc = desc_list[i] if i < len(desc_list) else ""

            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/{primary_doc}"
                if accession and primary_doc else ""
            )

            rows.append({
                "form_type": form,
                "filed_date": filed,
                "description": desc,
                "accession": accession,
                "filing_url": filing_url,
            })

            if len(rows) >= limit:
                break

        return rows

    except Exception as e:
        logger.error(f"sec_proxy_filings error: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Widget 7.13 — Inline SEC Filing Viewer
# Fetches, parses, and returns filing text as markdown for in-terminal reading.
# ═══════════════════════════════════════════════════════════════════════════

# Section extraction patterns — maps section names to regex anchors
_SECTION_PATTERNS = {
    "mda": [
        r"(?i)item\s*7[^a-z].*?management.{0,40}discussion",
        r"(?i)management.{0,20}discussion.{0,20}analysis",
    ],
    "risk": [
        r"(?i)item\s*1a[^a-z].*?risk\s*factor",
        r"(?i)risk\s*factors",
    ],
    "financials": [
        r"(?i)item\s*8[^a-z].*?financial\s*statement",
        r"(?i)consolidated\s*statements?\s*of\s*(operations|income|earnings)",
    ],
    "business": [
        r"(?i)item\s*1[^a-z].*?business",
        r"(?i)^business$",
    ],
}

_NEXT_SECTION_PATTERN = r"(?i)item\s*\d+[a-z]?\."


def _html_to_markdown(html_text: str, max_chars: int = 60000) -> str:
    """
    Strip HTML from a filing and convert to clean readable markdown.
    Handles SEC's HTML structure: removes scripts, styles, tables-as-layout,
    preserves paragraph breaks and headings.
    """
    import re
    # Remove script/style blocks entirely
    text = re.sub(r"<script[^>]*>.*?</script>", "", html_text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Convert common block elements to newlines
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>|</div>|</tr>|</li>", "\n", text, flags=re.IGNORECASE)
    # Convert headings
    text = re.sub(r"<h[1-3][^>]*>(.*?)</h[1-3]>", r"\n## \1\n", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<h[4-6][^>]*>(.*?)</h[4-6]>", r"\n### \1\n", text, flags=re.DOTALL | re.IGNORECASE)
    # Strip all remaining tags
    text = re.sub(r"<[^>]+>", "", text)
    # Decode common HTML entities
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&nbsp;", " ").replace("&#160;", " ").replace("&quot;", '"')
    text = text.replace("&#8212;", "—").replace("&#8211;", "–").replace("&#8216;", "'")
    text = text.replace("&#8217;", "'").replace("&#8220;", '"').replace("&#8221;", '"')
    # Collapse excessive whitespace / blank lines
    text = re.sub(r"\r", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    text = text.strip()
    # Truncate with note if over limit
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n\n---\n*Showing first {max_chars:,} characters. Filing continues beyond this point.*"
    return text


def _extract_section(text: str, section: str) -> str:
    """
    Extract a specific section from a filing's cleaned text.
    Falls back to full text if section not found.
    """
    import re
    if section == "full" or section not in _SECTION_PATTERNS:
        return text

    patterns = _SECTION_PATTERNS[section]
    start_pos = None
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            start_pos = m.start()
            break

    if start_pos is None:
        return f"*Section '{section}' not found in this filing. Showing full text below.*\n\n" + text

    # Find the next major section to bound the extraction
    end_pos = len(text)
    next_section_start = start_pos + 200  # Skip past the found header itself
    for next_pat in [_NEXT_SECTION_PATTERN]:
        m2 = re.search(next_pat, text[next_section_start:])
        if m2:
            candidate_end = next_section_start + m2.start()
            # Only use if it's a meaningful distance away (>1000 chars)
            if candidate_end - start_pos > 1000:
                end_pos = candidate_end
                break

    return text[start_pos:end_pos].strip()


@router.get("/sec_filing_viewer")
def sec_filing_viewer(
    symbol: str = Query("PYPL", description="Ticker symbol"),
    form_type: str = Query("10-K", description="Filing type: 10-K | 10-Q | 8-K | DEF 14A"),
    section: str = Query("full", description="full | mda | risk | financials | business"),
    max_chars: int = Query(60000, ge=5000, le=150000, description="Max characters to return"),
):
    """
    Widget 7.13 — Inline SEC Filing Viewer.
    Fetches the most recent filing of the specified type, converts HTML to
    clean markdown, optionally extracts a named section, and returns as a
    markdown string for in-terminal display.
    """
    import re

    cik = _ticker_to_cik(symbol)
    if not cik:
        return f"# ⚠️ Ticker Not Found\n\nCould not find CIK for `{symbol}`. Verify the ticker is correct and listed on US exchanges."

    try:
        # Step 1: Get company filings list
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)
        company_name = data.get("name", symbol)

        recent = data.get("filings", {}).get("recent", {})
        form_list      = recent.get("form", [])
        date_list      = recent.get("filingDate", [])
        accession_list = recent.get("accessionNumber", [])
        primary_doc_list = recent.get("primaryDocument", [])

        # Step 2: Find the most recent matching filing
        target_forms = {form_type}
        # 10-Q searches also accept 10-Q/A; 10-K accepts 10-K/A
        if form_type in ("10-K", "10-Q"):
            target_forms.add(f"{form_type}/A")

        filing_found = None
        for i in range(len(form_list)):
            if form_list[i] in target_forms:
                accession = accession_list[i] if i < len(accession_list) else ""
                accession_clean = accession.replace("-", "")
                primary_doc = primary_doc_list[i] if i < len(primary_doc_list) else ""
                filed_date = date_list[i] if i < len(date_list) else ""
                if accession and primary_doc:
                    filing_found = {
                        "accession": accession,
                        "accession_clean": accession_clean,
                        "primary_doc": primary_doc,
                        "filed_date": filed_date,
                        "form_type": form_list[i],
                    }
                    break

        if not filing_found:
            return f"# No {form_type} Found\n\n`{symbol}` ({company_name}) has no recent `{form_type}` filing available in EDGAR."

        # Step 3: Fetch the primary document HTML
        cik_int = int(cik)
        doc_url = (
            f"https://www.sec.gov/Archives/edgar/data/{cik_int}/"
            f"{filing_found['accession_clean']}/{filing_found['primary_doc']}"
        )

        # Use a direct httpx fetch (not _sec_get cache key, since docs are large)
        doc_key = f"filing_doc_{filing_found['accession_clean']}_{section}"
        if doc_key in _cache_1h:
            return _cache_1h[doc_key]

        r = httpx.get(doc_url, headers=SEC_HEADERS, timeout=45, follow_redirects=True)
        r.raise_for_status()
        raw_html = r.text

        # Step 4: Convert to markdown
        clean_text = _html_to_markdown(raw_html, max_chars=max_chars * 2)  # Pre-truncation has margin

        # Step 5: Extract section if requested
        extracted = _extract_section(clean_text, section)
        if len(extracted) > max_chars:
            extracted = extracted[:max_chars] + f"\n\n---\n*Truncated at {max_chars:,} characters.*"

        # Step 6: Build header
        section_labels = {
            "full": "Full Filing",
            "mda": "Management Discussion & Analysis (Item 7)",
            "risk": "Risk Factors (Item 1A)",
            "financials": "Financial Statements (Item 8)",
            "business": "Business Description (Item 1)",
        }
        section_label = section_labels.get(section, section.upper())

        header = (
            f"# {company_name} — {filing_found['form_type']}\n"
            f"**Filed:** {filing_found['filed_date']}  |  "
            f"**Section:** {section_label}  |  "
            f"**Source:** [EDGAR]({doc_url})\n\n---\n\n"
        )
        result = header + extracted

        _cache_1h[doc_key] = result
        return result

    except httpx.HTTPStatusError as e:
        logger.error(f"sec_filing_viewer HTTP error: {e}")
        return f"# Filing Unavailable\n\nFailed to fetch filing from EDGAR (HTTP {e.response.status_code}). The document may have been moved or be temporarily unavailable."
    except Exception as e:
        logger.error(f"sec_filing_viewer error: {e}")
        return f"# Error Loading Filing\n\n`{e}`"


# ─────────────────────────────────────────────────────────────────────────────
# Widget 7.14 — SEC Filing Options Dropdown (cascading, filtered)
# ─────────────────────────────────────────────────────────────────────────────

# All form types the options endpoint will consider
_FILING_FORM_TYPES = [
    "10-K", "10-Q", "8-K", "DEF 14A", "S-1",
    "10-K/A", "10-Q/A", "8-K/A",
]


@router.get("/sec_filing_options")
def sec_filing_options(
    symbol: str = Query("PYPL"),
    forms: str = Query("All", description="Comma-separated form types or 'All'"),
    start_date: str = Query(None, description="YYYY-MM-DD earliest filing date"),
    end_date: str = Query(None, description="YYYY-MM-DD latest filing date"),
):
    """Cascading dropdown: returns filings filtered by form type and date range."""
    cik = _ticker_to_cik(symbol)
    if not cik:
        return []

    # Parse form filter
    if forms and forms.strip().lower() != "all":
        allowed_forms = {f.strip() for f in forms.split(",") if f.strip()}
    else:
        allowed_forms = set(_FILING_FORM_TYPES)

    try:
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        data = _sec_get(url, timeout=25)
        recent = data.get("filings", {}).get("recent", {})
        form_list = recent.get("form", [])
        date_list = recent.get("filingDate", [])
        accession_list = recent.get("accessionNumber", [])
        primary_doc_list = recent.get("primaryDocument", [])

        options = []
        for i in range(min(len(form_list), 200)):
            form = form_list[i] if i < len(form_list) else ""
            filed = date_list[i] if i < len(date_list) else ""
            accession = accession_list[i] if i < len(accession_list) else ""
            accession_clean = accession.replace("-", "")
            primary_doc = primary_doc_list[i] if i < len(primary_doc_list) else ""

            # Form type filter
            if form not in allowed_forms:
                continue

            # Date range filter
            if start_date and filed < start_date:
                continue
            if end_date and filed > end_date:
                continue

            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_clean}/{primary_doc}"
                if accession and primary_doc else ""
            )
            if not filing_url:
                continue

            options.append({
                "label": f"{form} — {filed}",
                "value": filing_url,
                "extraInfo": {
                    "description": f"Filed {filed}",
                    "rightOfDescription": form,
                }
            })

            if len(options) >= 50:
                break

        return options
    except Exception as e:
        logger.error(f"sec_filing_options error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Widget 7.15 — SEC Filing Document Viewer (multi_file_viewer)
#
# Pattern from OpenBB canonical example (backends-for-openbb/whitepapers):
#   - GET  /sec_filing_options  → populates left panel (fileSelector)
#   - POST /sec_filing_document → receives selected URL(s), returns base64 PDF
#
# The fileSelector param sends selected values as a typed POST body.
# Field name in the body MUST match paramName in widgets.json ("filing").
# Response MUST be a JSON array with Content-Type: application/json.
# ─────────────────────────────────────────────────────────────────────────────

# ── Pydantic models matching canonical OpenBB multi_file_viewer pattern ──

class FilingRequest(BaseModel):
    filing: List[str]

class _DataFormat(BaseModel):
    data_type: Literal["pdf"] = "pdf"
    filename: str

class _DataContent(BaseModel):
    content: str
    data_format: _DataFormat

class _DataError(BaseModel):
    error_type: Literal["not_found"] = "not_found"
    content: str


@router.post("/sec_filing_document")
async def sec_filing_document(
    request: FilingRequest,
) -> List[_DataContent | _DataError]:
    """
    multi_file_viewer POST endpoint — canonical pattern.
    Receives selected filing URL(s) from the fileSelector param,
    fetches each from EDGAR, converts HTML→PDF via pdfkit,
    and returns base64-encoded PDF array.

    The number of results returned MUST match the number of filenames requested.
    """
    import base64
    from fastapi.responses import JSONResponse

    filing_urls = [u.strip() for u in request.filing if u and u.strip()]
    logger.info(f"sec_filing_document POST: {len(filing_urls)} filing(s): {filing_urls}")

    if not filing_urls:
        return JSONResponse(content=[])

    # ── wkhtmltopdf config ──
    try:
        import pdfkit
        config = pdfkit.configuration(wkhtmltopdf=r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe")
    except Exception as e:
        logger.error(f"pdfkit config error: {e}")
        # Must return one error per requested file
        errors = [_DataError(content=f"PDF conversion unavailable: {e}").model_dump() for _ in filing_urls]
        return JSONResponse(content=errors)

    results = []
    for url in filing_urls:
        filename = url.split("/")[-1] if "/" in url else "filing.htm"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "htm"
        pdf_filename = filename.rsplit(".", 1)[0] + ".pdf" if "." in filename else filename + ".pdf"

        try:
            logger.info(f"Fetching: {url}")
            r = httpx.get(url, headers=SEC_HEADERS, timeout=60, follow_redirects=True)
            r.raise_for_status()

            if ext == "pdf":
                pdf_bytes = r.content
                logger.info(f"PDF passthrough: {len(pdf_bytes)} bytes")
            else:
                # Limit HTML size to prevent wkhtmltopdf timeout on massive filings
                html_text = r.text
                if len(html_text) > 5_000_000:  # >5MB HTML = likely to timeout
                    logger.warning(f"Large filing ({len(html_text)} bytes), truncating for PDF conversion")
                    # Take first 5MB to avoid wkhtmltopdf hanging
                    html_text = html_text[:5_000_000] + "\n</body></html>"

                logger.info(f"Converting {len(html_text)} byte HTML → PDF")
                pdf_bytes = pdfkit.from_string(
                    html_text, False,
                    options={
                        "quiet": "",
                        "encoding": "UTF-8",
                        "load-error-handling": "ignore",
                        "load-media-error-handling": "ignore",
                        "no-stop-slow-scripts": "",
                        "javascript-delay": "1000",
                        "page-size": "Letter",
                        "margin-top": "10mm",
                        "margin-bottom": "10mm",
                        "margin-left": "10mm",
                        "margin-right": "10mm",
                        "disable-external-links": "",
                        "no-images": "",
                    },
                    configuration=config,
                )
                logger.info(f"Converted to PDF: {len(pdf_bytes)} bytes")

            item = _DataContent(
                content=base64.b64encode(pdf_bytes).decode("utf-8"),
                data_format=_DataFormat(filename=pdf_filename),
            )
            results.append(item.model_dump())

        except Exception as e:
            logger.error(f"Error processing {url}: {e}")
            item = _DataError(content=f"Failed to load {filename}: {e}")
            results.append(item.model_dump())

    logger.info(f"Returning {len(results)} result(s)")
    return JSONResponse(content=results)

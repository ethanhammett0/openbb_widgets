"""Utility endpoints — dropdowns for symbols, sub-sectors, pairs, factors, cap tiers."""
import logging
from fastapi import APIRouter, Query
import data_providers as dp
from universe import get_ticker_options, get_sub_sector_options, get_pair_options, get_factor_options, get_all_tickers

router = APIRouter()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Universal Stock Search — queries Polygon for ANY US stock
# ─────────────────────────────────────────────────────────────────────────────

# Exchange display name mapping
EXCHANGE_MAP = {
    "XNYS": "NYSE", "XNAS": "NASDAQ", "XASE": "AMEX", "ARCX": "ARCA",
    "BATS": "BATS", "IEXG": "IEX", "XCHI": "CHX", "XPHL": "PHLX",
}

@router.get("/stock_search")
def stock_search(query: str = Query("", description="Search query for tickers")):
    """
    Advanced dropdown options endpoint — searches Polygon for any US stock.
    Returns the advanced dropdown format with label, value, and extraInfo.
    If query is empty, returns the fintech universe tickers as defaults.
    """
    if not query or len(query.strip()) < 1:
        # Return fintech universe as default options
        universe_tickers = get_all_tickers()
        results = []
        for t in universe_tickers:
            try:
                details = dp.get_ticker_details(t)
                name = details.get("name", t)
                exchange = EXCHANGE_MAP.get(details.get("primary_exchange", ""), "US")
                sic = details.get("sic_description", "")
                results.append({
                    "label": f"{t} — {name}",
                    "value": t,
                    "extraInfo": {
                        "description": sic or "Fintech Universe",
                        "rightOfDescription": exchange,
                    }
                })
            except Exception:
                results.append({
                    "label": t,
                    "value": t,
                    "extraInfo": {
                        "description": "Fintech Universe",
                        "rightOfDescription": "US",
                    }
                })
        return results

    # Search Polygon for any stock
    raw = dp.search_tickers(query.strip(), limit=30)
    results = []
    for item in raw:
        ticker = item.get("ticker", "")
        name = item.get("name", ticker)
        exchange = EXCHANGE_MAP.get(item.get("primary_exchange", ""), "US")
        ticker_type = item.get("type", "").replace("CS", "Common Stock").replace("ETF", "ETF").replace("ADRC", "ADR")
        results.append({
            "label": f"{ticker} — {name}",
            "value": ticker,
            "extraInfo": {
                "description": ticker_type or "Equity",
                "rightOfDescription": exchange,
            }
        })
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Return Window Options — for dynamic watchlist column selection
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/period_options")
def period_options():
    """
    Hierarchical period selector — thinkorswim-style.
    Day/Month/Year categories with sub-ranges, multi-select enabled.
    Uses extraInfo.rightOfDescription to show the category grouping.
    """
    return [
        # ── Day ──
        {"label": "1 Day",    "value": "1D",   "extraInfo": {"description": "Intraday / overnight change",     "rightOfDescription": "Day"}},
        {"label": "7 Days",   "value": "7D",   "extraInfo": {"description": "Weekly window",                   "rightOfDescription": "Day"}},
        {"label": "30 Days",  "value": "30D",  "extraInfo": {"description": "~1 month calendar days",          "rightOfDescription": "Day"}},
        {"label": "60 Days",  "value": "60D",  "extraInfo": {"description": "~2 month calendar days",          "rightOfDescription": "Day"}},
        {"label": "90 Days",  "value": "90D",  "extraInfo": {"description": "Quarterly calendar days",         "rightOfDescription": "Day"}},
        {"label": "180 Days", "value": "180D", "extraInfo": {"description": "Half-year calendar days",         "rightOfDescription": "Day"}},
        # ── Month ──
        {"label": "1 Month",  "value": "1M",   "extraInfo": {"description": "1 trading month (~21 days)",      "rightOfDescription": "Month"}},
        {"label": "3 Months", "value": "3M",   "extraInfo": {"description": "Quarterly",                       "rightOfDescription": "Month"}},
        {"label": "6 Months", "value": "6M",   "extraInfo": {"description": "Semi-annual",                     "rightOfDescription": "Month"}},
        {"label": "9 Months", "value": "9M",   "extraInfo": {"description": "Three-quarter year",              "rightOfDescription": "Month"}},
        {"label": "12 Months","value": "12M",  "extraInfo": {"description": "Trailing twelve months",          "rightOfDescription": "Month"}},
        # ── Year ──
        {"label": "1 Year",   "value": "1Y",   "extraInfo": {"description": "Annual",                          "rightOfDescription": "Year"}},
        {"label": "2 Years",  "value": "2Y",   "extraInfo": {"description": "Two-year lookback",               "rightOfDescription": "Year"}},
        {"label": "3 Years",  "value": "3Y",   "extraInfo": {"description": "Three-year lookback",             "rightOfDescription": "Year"}},
        {"label": "5 Years",  "value": "5Y",   "extraInfo": {"description": "Five-year lookback",              "rightOfDescription": "Year"}},
        {"label": "10 Years", "value": "10Y",  "extraInfo": {"description": "Decade lookback",                 "rightOfDescription": "Year"}},
        # ── YTD ──
        {"label": "Year to Date", "value": "YTD", "extraInfo": {"description": "Jan 1 to today",               "rightOfDescription": "YTD"}},
    ]


@router.get("/return_windows")
def return_windows():
    """Alias — same as /period_options for backward compatibility."""
    return period_options()


# ─────────────────────────────────────────────────────────────────────────────
# Technical Indicator Options
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/indicator_options")
def indicator_options():
    """Options endpoint — technical indicator choices."""
    return [
        {"label": "RSI (14)", "value": "rsi_14", "extraInfo": {"description": "Relative Strength Index", "rightOfDescription": "Momentum"}},
        {"label": "RSI (7)", "value": "rsi_7", "extraInfo": {"description": "Short-term RSI", "rightOfDescription": "Momentum"}},
        {"label": "RSI (21)", "value": "rsi_21", "extraInfo": {"description": "Long-term RSI", "rightOfDescription": "Momentum"}},
        {"label": "MACD (12,26,9)", "value": "macd_std", "extraInfo": {"description": "Moving Average Convergence Divergence", "rightOfDescription": "Trend"}},
        {"label": "SMA (20)", "value": "sma_20", "extraInfo": {"description": "Simple Moving Average 20-day", "rightOfDescription": "Trend"}},
        {"label": "SMA (50)", "value": "sma_50", "extraInfo": {"description": "Simple Moving Average 50-day", "rightOfDescription": "Trend"}},
        {"label": "SMA (200)", "value": "sma_200", "extraInfo": {"description": "Simple Moving Average 200-day", "rightOfDescription": "Trend"}},
        {"label": "EMA (12)", "value": "ema_12", "extraInfo": {"description": "Exponential Moving Average 12-day", "rightOfDescription": "Trend"}},
        {"label": "EMA (26)", "value": "ema_26", "extraInfo": {"description": "Exponential Moving Average 26-day", "rightOfDescription": "Trend"}},
        {"label": "Bollinger Bands (20,2)", "value": "bbands_20", "extraInfo": {"description": "Bollinger Bands 20-day, 2σ", "rightOfDescription": "Volatility"}},
        {"label": "ATR (14)", "value": "atr_14", "extraInfo": {"description": "Average True Range 14-day", "rightOfDescription": "Volatility"}},
        {"label": "VWAP", "value": "vwap", "extraInfo": {"description": "Volume-Weighted Average Price", "rightOfDescription": "Volume"}},
        {"label": "OBV", "value": "obv", "extraInfo": {"description": "On-Balance Volume", "rightOfDescription": "Volume"}},
        {"label": "Stochastic (14,3)", "value": "stoch_14", "extraInfo": {"description": "Stochastic Oscillator %K/%D", "rightOfDescription": "Momentum"}},
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Legacy endpoints (still used by some widgets)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/symbols")
def symbols():
    return get_ticker_options()

@router.get("/sub_sectors")
def sub_sectors():
    return get_sub_sector_options()

@router.get("/pairs")
def pairs():
    return get_pair_options()

@router.get("/factors")
def factors():
    return get_factor_options()

@router.get("/cap_tiers")
def cap_tiers():
    """Dynamic cap tier options derived from Polygon market cap data."""
    tiers = {"All": 0, "Large (>$10B)": 0, "Mid ($2-10B)": 0, "Small (<$2B)": 0}
    for t in get_all_tickers():
        try:
            details = dp.get_ticker_details(t)
            mc = details.get("market_cap", 0) or 0
            if mc >= 10_000_000_000:
                tiers["Large (>$10B)"] += 1
            elif mc >= 2_000_000_000:
                tiers["Mid ($2-10B)"] += 1
            else:
                tiers["Small (<$2B)"] += 1
        except Exception:
            pass
    return [{"label": f"{k} ({v})" if k != "All" else "All", "value": k} for k, v in tiers.items()]

@router.get("/event_types")
def event_types():
    """Options endpoint — returns event type options for corporate actions calendar."""
    return [
        {"label": "Dividends", "value": "dividends"},
        {"label": "Splits", "value": "splits"},
        {"label": "Earnings", "value": "earnings"},
    ]

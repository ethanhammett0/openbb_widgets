"""
Data Providers — Polygon/Massive.com, CoinGecko, Ken French
In-memory caching with TTL to avoid excessive API calls.
"""
import os
import io
import zipfile
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
import numpy as np
import pandas as pd
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cache setup — 5-minute default, 24-hour for slow-changing data
# ---------------------------------------------------------------------------
_cache_5m = TTLCache(maxsize=64, ttl=300)
_cache_1h = TTLCache(maxsize=48, ttl=3600)
_cache_24h = TTLCache(maxsize=16, ttl=86400)

POLYGON_KEY = os.getenv("massive_api_key", "")
POLYGON_BASE = "https://api.polygon.io"
COINGECKO_KEY = os.getenv("COINGECKO_API_KEY", "")
COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# ═══════════════════════════════════════════════════════════════════════════
# Polygon / Massive.com  Provider
# ═══════════════════════════════════════════════════════════════════════════

def _polygon_get(path: str, params: dict | None = None) -> dict:
    """Low-level Polygon REST GET with API key injection."""
    params = params or {}
    params["apiKey"] = POLYGON_KEY
    url = f"{POLYGON_BASE}{path}"
    r = httpx.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def get_snapshot_all() -> list[dict]:
    """Snapshot of all US tickers — returns list of ticker dicts."""
    key = "snapshot_all"
    if key in _cache_5m:
        return _cache_5m[key]
    data = _polygon_get("/v2/snapshot/locale/us/markets/stocks/tickers")
    tickers = data.get("tickers", [])
    _cache_5m[key] = tickers
    return tickers


def get_snapshot_ticker(ticker: str) -> dict:
    """Snapshot for a single ticker."""
    key = f"snap_{ticker}"
    if key in _cache_5m:
        return _cache_5m[key]
    data = _polygon_get(f"/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}")
    result = data.get("ticker", {})
    _cache_5m[key] = result
    return result


def get_snapshot_gainers() -> list[dict]:
    key = "snap_gainers"
    if key in _cache_5m:
        return _cache_5m[key]
    data = _polygon_get("/v2/snapshot/locale/us/markets/stocks/gainers")
    tickers = data.get("tickers", [])
    _cache_5m[key] = tickers
    return tickers


def get_snapshot_losers() -> list[dict]:
    key = "snap_losers"
    if key in _cache_5m:
        return _cache_5m[key]
    data = _polygon_get("/v2/snapshot/locale/us/markets/stocks/losers")
    tickers = data.get("tickers", [])
    _cache_5m[key] = tickers
    return tickers


def get_aggregates(
    ticker: str,
    from_date: str,
    to_date: str,
    timespan: str = "day",
    multiplier: int = 1,
    limit: int = 5000,
) -> pd.DataFrame:
    """
    Get OHLCV aggregate bars.
    Returns DataFrame with columns: date, open, high, low, close, volume, vwap.
    """
    key = f"agg_{ticker}_{from_date}_{to_date}_{timespan}_{multiplier}"
    if key in _cache_1h:
        return _cache_1h[key]

    data = _polygon_get(
        f"/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from_date}/{to_date}",
        {"adjusted": "true", "sort": "asc", "limit": limit},
    )
    results = data.get("results", [])
    if not results:
        df = pd.DataFrame(columns=["date", "open", "high", "low", "close", "volume", "vwap"])
        return df

    df = pd.DataFrame(results)
    df["date"] = pd.to_datetime(df["t"], unit="ms").dt.strftime("%Y-%m-%d")
    df = df.rename(columns={"o": "open", "h": "high", "l": "low", "c": "close", "v": "volume", "vw": "vwap"})
    df = df[["date", "open", "high", "low", "close", "volume", "vwap"]].copy()
    _cache_1h[key] = df
    return df


def get_daily_returns(ticker: str, from_date: str, to_date: str) -> pd.Series:
    """Get daily percentage returns for a ticker. Always returns DatetimeIndex."""
    df = get_aggregates(ticker, from_date, to_date)
    if df.empty:
        return pd.Series(dtype=float)
    df = df.set_index("date")
    df.index = pd.to_datetime(df.index)
    returns = df["close"].pct_change().dropna()
    returns.name = ticker
    return returns


def get_multi_daily_returns(tickers: list[str], from_date: str, to_date: str) -> pd.DataFrame:
    """Get daily returns DataFrame for multiple tickers."""
    series_list = []
    for t in tickers:
        try:
            s = get_daily_returns(t, from_date, to_date)
            if not s.empty:
                series_list.append(s)
        except Exception as e:
            logger.warning(f"Failed to get returns for {t}: {e}")
    if not series_list:
        return pd.DataFrame()
    df = pd.concat(series_list, axis=1)
    df.index = pd.to_datetime(df.index)
    return df


def get_sma(ticker: str, window: int = 50, timespan: str = "day", limit: int = 3) -> list[dict]:
    """SMA indicator from Polygon. Only fetches last 3 values to save memory."""
    key = f"sma_{ticker}_{window}_{timespan}"
    if key in _cache_1h:
        return _cache_1h[key]
    data = _polygon_get(
        f"/v1/indicators/sma/{ticker}",
        {"timespan": timespan, "window": window, "series_type": "close", "order": "desc", "limit": limit},
    )
    results = data.get("results", {}).get("values", [])
    _cache_1h[key] = results
    return results


def get_rsi(ticker: str, window: int = 14, timespan: str = "day", limit: int = 5) -> list[dict]:
    """RSI indicator from Polygon. Only fetches last 5 values."""
    key = f"rsi_{ticker}_{window}_{timespan}"
    if key in _cache_1h:
        return _cache_1h[key]
    data = _polygon_get(
        f"/v1/indicators/rsi/{ticker}",
        {"timespan": timespan, "window": window, "series_type": "close", "order": "desc", "limit": limit},
    )
    results = data.get("results", {}).get("values", [])
    _cache_1h[key] = results
    return results


def get_macd(ticker: str, timespan: str = "day", limit: int = 5) -> list[dict]:
    """MACD indicator from Polygon. Only fetches last 5 values."""
    key = f"macd_{ticker}_{timespan}"
    if key in _cache_1h:
        return _cache_1h[key]
    data = _polygon_get(
        f"/v1/indicators/macd/{ticker}",
        {
            "timespan": timespan,
            "short_window": 12,
            "long_window": 26,
            "signal_window": 9,
            "series_type": "close",
            "order": "desc",
            "limit": limit,
        },
    )
    results = data.get("results", {}).get("values", [])
    _cache_1h[key] = results
    return results


def get_dividends(ticker: str, limit: int = 100) -> list[dict]:
    """Get dividend data from Polygon."""
    key = f"div_{ticker}"
    if key in _cache_24h:
        return _cache_24h[key]
    data = _polygon_get(f"/v3/reference/dividends", {"ticker": ticker, "limit": limit, "order": "desc"})
    results = data.get("results", [])
    _cache_24h[key] = results
    return results


def get_splits(ticker: str, limit: int = 100) -> list[dict]:
    """Get stock split data from Polygon."""
    key = f"split_{ticker}"
    if key in _cache_24h:
        return _cache_24h[key]
    data = _polygon_get(f"/v3/reference/splits", {"ticker": ticker, "limit": limit, "order": "desc"})
    results = data.get("results", [])
    _cache_24h[key] = results
    return results


def get_ticker_details(ticker: str) -> dict:
    """Get reference data for a ticker."""
    key = f"details_{ticker}"
    if key in _cache_24h:
        return _cache_24h[key]
    data = _polygon_get(f"/v3/reference/tickers/{ticker}")
    result = data.get("results", {})
    _cache_24h[key] = result
    return result


def get_ipos(from_date: str | None = None, to_date: str | None = None) -> list[dict]:
    """Get IPO listing data from Polygon."""
    key = f"ipos_{from_date}_{to_date}"
    if key in _cache_24h:
        return _cache_24h[key]
    params = {"limit": 1000, "order": "desc"}
    if from_date:
        params["listing_date.gte"] = from_date
    if to_date:
        params["listing_date.lte"] = to_date
    data = _polygon_get("/v3/reference/tickers", params)
    results = data.get("results", [])
    _cache_24h[key] = results
    return results


# ═══════════════════════════════════════════════════════════════════════════
# CoinGecko Provider
# ═══════════════════════════════════════════════════════════════════════════

def get_crypto_prices(ids: list[str] | None = None) -> list[dict]:
    """
    Get crypto prices + 24h change from CoinGecko.
    Returns list of metric-tile dicts.
    """
    if ids is None:
        ids = ["bitcoin", "ethereum", "solana"]
    ids_str = ",".join(ids)
    key = f"crypto_{ids_str}"
    if key in _cache_5m:
        return _cache_5m[key]
    try:
        r = httpx.get(
            f"{COINGECKO_BASE}/simple/price",
            params={
                "ids": ids_str,
                "vs_currencies": "usd",
                "include_24hr_change": "true",
                "x_cg_demo_api_key": COINGECKO_KEY,
            },
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        results = []
        name_map = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL"}
        for cid in ids:
            info = data.get(cid, {})
            price = info.get("usd", 0)
            change = info.get("usd_24h_change", 0)
            results.append({
                "id": cid,
                "symbol": name_map.get(cid, cid.upper()),
                "price": price,
                "change_24h": round(change, 2) if change else 0,
            })
        _cache_5m[key] = results
        return results
    except Exception as e:
        logger.warning(f"CoinGecko error: {e}")
        return [{"id": cid, "symbol": cid[:3].upper(), "price": 0, "change_24h": 0} for cid in ids]


def get_crypto_daily_returns(days: int = 365) -> pd.DataFrame:
    """
    Get daily returns for BTC and ETH from CoinGecko market_chart endpoint.
    Returns DataFrame with 'BTC' and 'ETH' return columns.
    """
    key = f"crypto_returns_{days}"
    if key in _cache_24h:
        return _cache_24h[key]
    frames = {}
    for cid, sym in [("bitcoin", "BTC"), ("ethereum", "ETH")]:
        try:
            r = httpx.get(
                f"{COINGECKO_BASE}/coins/{cid}/market_chart",
                params={
                    "vs_currency": "usd",
                    "days": days,
                    "interval": "daily",
                    "x_cg_demo_api_key": COINGECKO_KEY,
                },
                timeout=30,
            )
            r.raise_for_status()
            prices = r.json().get("prices", [])
            if prices:
                df = pd.DataFrame(prices, columns=["timestamp", "price"])
                df["date"] = pd.to_datetime(df["timestamp"], unit="ms").dt.normalize()
                df = df.set_index("date")
                frames[sym] = df["price"].pct_change().dropna()
        except Exception as e:
            logger.warning(f"CoinGecko market_chart error for {cid}: {e}")
    if not frames:
        return pd.DataFrame()
    result = pd.DataFrame(frames)
    _cache_24h[key] = result
    return result


# ═══════════════════════════════════════════════════════════════════════════
# Ken French Data Library Provider
# ═══════════════════════════════════════════════════════════════════════════

FRENCH_FACTORS_URL = (
    "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_5_Factors_2x3_daily_CSV.zip"
)
FRENCH_MOM_URL = (
    "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Momentum_Factor_daily_CSV.zip"
)
FRENCH_STREV_URL = (
    "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_ST_Reversal_Factor_daily_CSV.zip"
)


def _parse_french_zip(url: str) -> pd.DataFrame:
    """Download and parse a Ken French CSV zip — robust single-table parser."""
    r = httpx.get(url, timeout=30, follow_redirects=True)
    r.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        csv_name = [n for n in zf.namelist() if n.lower().endswith(".csv")][0]
        raw = zf.open(csv_name).read().decode("utf-8", errors="ignore")

    # Find data rows: lines that start with a digit and have 8-char date field
    data_rows = []
    for line in raw.strip().split("\n"):
        s = line.strip()
        if s and s[0].isdigit():
            parts = [p.strip() for p in s.split(",")]
            if len(parts[0]) == 8 and len(parts) >= 2:
                data_rows.append(parts)

    if not data_rows:
        return pd.DataFrame()

    ncols = len(data_rows[0])
    df = pd.DataFrame(data_rows)
    df.iloc[:, 0] = pd.to_datetime(df.iloc[:, 0], format="%Y%m%d", errors="coerce")
    for col in range(1, ncols):
        df.iloc[:, col] = pd.to_numeric(df.iloc[:, col], errors="coerce")
    df = df.dropna(subset=[0])
    df = df.set_index(0)
    df.index.name = "date"
    # Convert from percent to decimal
    df = df / 100.0
    return df


def get_french_factors() -> pd.DataFrame:
    """
    Get daily Fama-French factors: Mkt-RF, SMB, HML, Mom, ST-Rev.
    Uses direct ZIP download (pandas_datareader has memory issues).
    Returns DataFrame indexed by DatetimeIndex, values in decimal.
    """
    key = "french_factors"
    if key in _cache_24h:
        return _cache_24h[key]

    try:
        # 5-factor file: date, Mkt-RF, SMB, HML, RMW, CMA, RF
        ff5 = _parse_french_zip(FRENCH_FACTORS_URL)
        if ff5.empty:
            raise ValueError("5-factor file empty")
        ff5.columns = ["Mkt-RF", "SMB", "HML", "RMW", "CMA", "RF"][:len(ff5.columns)]
        result = ff5[["Mkt-RF", "SMB", "HML"]].copy()

        # Momentum file: date, Mom
        try:
            mom = _parse_french_zip(FRENCH_MOM_URL)
            if not mom.empty:
                mom.columns = ["Mom"] + [f"extra_{i}" for i in range(len(mom.columns)-1)]
                result = result.join(mom[["Mom"]], how="inner")
        except Exception as e:
            logger.warning(f"Momentum factor download failed: {e}")
            result["Mom"] = 0.0

        # ST-Rev file: date, ST-Rev
        try:
            strev = _parse_french_zip(FRENCH_STREV_URL)
            if not strev.empty:
                strev.columns = ["ST-Rev"] + [f"extra_{i}" for i in range(len(strev.columns)-1)]
                result = result.join(strev[["ST-Rev"]], how="inner")
        except Exception as e:
            logger.warning(f"ST-Rev factor download failed: {e}")
            result["ST-Rev"] = 0.0

        result = result.dropna()
        result.index = pd.to_datetime(result.index)
        # Trim to 2020+ to save memory (was 1963+, ~15K rows → ~1.5K)
        result = result.loc["2020-01-01":]
        _cache_24h[key] = result
        logger.info(f"French factors loaded: {result.shape}, {result.index[0]} to {result.index[-1]}")
        return result

    except Exception as e:
        logger.error(f"French data download failed: {e}")
        # Return zero-filled placeholder
        dates = pd.bdate_range(start="2020-01-01", end=datetime.now().strftime("%Y-%m-%d"))
        result = pd.DataFrame(0.0, index=dates, columns=["Mkt-RF", "SMB", "HML", "Mom", "ST-Rev"])
        _cache_24h[key] = result
        return result

"""TradingView UDF (Universal Data Feed) endpoints for advanced_charting widget."""
import logging
from datetime import datetime
from fastapi import APIRouter, Query
import data_providers as dp

router = APIRouter(prefix="/udf")
logger = logging.getLogger(__name__)

EXCHANGE_MAP = {
    "XNYS": "NYSE", "XNAS": "NASDAQ", "XASE": "AMEX", "ARCX": "ARCA",
    "BATS": "BATS", "IEXG": "IEX",
}

RESOLUTION_TO_TIMESPAN = {
    "1": ("minute", 1), "5": ("minute", 5), "15": ("minute", 15),
    "30": ("minute", 30), "60": ("hour", 1),
    "D": ("day", 1), "W": ("week", 1), "M": ("month", 1),
}


@router.get("/config")
async def get_config():
    """UDF configuration endpoint."""
    return {
        "supported_resolutions": ["1", "5", "15", "30", "60", "D", "W", "M"],
        "supports_group_request": False,
        "supports_marks": False,
        "supports_search": True,
        "supports_timescale_marks": False,
        "supports_time": True,
        "exchanges": [
            {"value": "", "name": "All Exchanges", "desc": ""},
            {"value": "NYSE", "name": "NYSE", "desc": "New York Stock Exchange"},
            {"value": "NASDAQ", "name": "NASDAQ", "desc": "NASDAQ Stock Exchange"},
            {"value": "AMEX", "name": "AMEX", "desc": "American Stock Exchange"},
        ],
        "symbols_types": [
            {"name": "All types", "value": ""},
            {"name": "Stocks", "value": "stock"},
            {"name": "ETF", "value": "etf"},
        ],
    }


@router.get("/search")
async def search_symbols(
    query: str = Query("", description="Search query"),
    type: str = Query("", description="Symbol type"),
    exchange: str = Query("", description="Exchange"),
    limit: int = Query(30, description="Limit of results"),
):
    """UDF symbol search endpoint — searches Polygon for any US stock."""
    if not query:
        return []

    raw = dp.search_tickers(query, limit=limit)
    results = []
    for item in raw:
        ticker = item.get("ticker", "")
        name = item.get("name", ticker)
        exchange_code = EXCHANGE_MAP.get(item.get("primary_exchange", ""), "US")
        ticker_type = "stock"
        if item.get("type", "") == "ETF":
            ticker_type = "etf"

        if type and ticker_type != type:
            continue
        if exchange and exchange_code != exchange:
            continue

        results.append({
            "symbol": ticker,
            "full_name": f"{exchange_code}:{ticker}",
            "description": name,
            "exchange": exchange_code,
            "type": ticker_type,
        })
    return results[:limit]


@router.get("/symbols")
async def get_symbol_info(symbol: str = Query(..., description="Symbol to get info for")):
    """UDF symbol info endpoint."""
    # Strip exchange prefix if present (e.g., "NASDAQ:AAPL" -> "AAPL")
    clean_symbol = symbol.split(":")[-1].upper()
    try:
        details = dp.get_ticker_details(clean_symbol)
        name = details.get("name", clean_symbol)
        exchange = EXCHANGE_MAP.get(details.get("primary_exchange", ""), "US")
        ticker_type = "stock"
        if details.get("type", "") == "ETF":
            ticker_type = "etf"
    except Exception:
        name = clean_symbol
        exchange = "US"
        ticker_type = "stock"

    return {
        "name": clean_symbol,
        "full_name": f"{exchange}:{clean_symbol}",
        "description": name,
        "type": ticker_type,
        "exchange": exchange,
        "listed_exchange": exchange,
        "pricescale": 100,
        "minmov": 1,
        "volume_precision": 0,
        "has_intraday": True,
        "has_daily": True,
        "has_weekly_and_monthly": True,
        "supported_resolutions": ["1", "5", "15", "30", "60", "D", "W", "M"],
        "session": "0930-1600",
        "timezone": "America/New_York",
        "data_status": "streaming",
    }


@router.get("/history")
async def get_history(
    symbol: str = Query(..., description="Symbol"),
    resolution: str = Query(..., description="Resolution"),
    from_time: int = Query(..., alias="from", description="From timestamp"),
    to_time: int = Query(..., alias="to", description="To timestamp"),
):
    """UDF historical data endpoint — fetches OHLCV from Polygon."""
    clean_symbol = symbol.split(":")[-1].upper()
    from_date = datetime.utcfromtimestamp(from_time).strftime("%Y-%m-%d")
    to_date = datetime.utcfromtimestamp(to_time).strftime("%Y-%m-%d")

    timespan, multiplier = RESOLUTION_TO_TIMESPAN.get(resolution, ("day", 1))

    try:
        df = dp.get_aggregates(
            clean_symbol, from_date, to_date,
            timespan=timespan, multiplier=multiplier, limit=50000,
        )

        if df.empty:
            return {"s": "no_data"}

        # Convert dates to Unix timestamps
        timestamps = (pd.to_datetime(df["date"]).astype("int64") // 10**9).tolist()

        return {
            "s": "ok",
            "t": timestamps,
            "o": df["open"].tolist(),
            "h": df["high"].tolist(),
            "l": df["low"].tolist(),
            "c": df["close"].tolist(),
            "v": df["volume"].tolist(),
        }
    except Exception as e:
        logger.error(f"UDF history error for {clean_symbol}: {e}")
        return {"s": "error", "errmsg": str(e)}


@router.get("/time")
async def get_server_time():
    """UDF server time endpoint."""
    return int(datetime.now().timestamp())


# Need pandas for timestamp conversion
import pandas as pd

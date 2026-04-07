"""Tab 1: Morning Pulse — Pre-market movers, macro returns monitor, alerts."""
import logging
import json
import pandas as pd
from datetime import datetime, timedelta

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import plotly.graph_objects as go
from plotly.subplots import make_subplots

import data_providers as dp
from universe import (
    get_all_tickers, get_ticker_sub_sector, get_sub_sector_tickers,
    CRYPTO_IDS, DEFAULT_PAIRS, UNIVERSE,
)
from theme import (
    fmt_price, fmt_pct, fmt_volume, fmt_zscore, fmt_mktcap,
    flag_pct, flag_zscore,
    bbg_color_pct, chart_layout, TRACE_COLORS,
    period_to_dates, period_to_trading_days, period_label,
    parse_period_param,
    BBG_GREEN, BBG_RED, BBG_AMBER, BBG_NEUTRAL,
)

# Helper for multi-select parameters
def _parse_multi(param: str, all_values: list) -> list:
    """Parse comma-separated multi-select params. Return all_values if empty or 'all'."""
    if not param or param.strip().lower() == "all":
        return all_values
    return [v.strip() for v in param.split(",") if v.strip()]

router = APIRouter()
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Options endpoints
# ─────────────────────────────────────────────────────────────────────────────

# Canonical macro instrument catalog — asset-class grouped, human-readable
MACRO_INSTRUMENT_CATALOG = [
    # Crypto
    {
        "label": "Bitcoin (BTC)",
        "value": "crypto:bitcoin",
        "extraInfo": {
            "description": "Largest cryptocurrency — risk-on sentiment proxy",
            "rightOfDescription": "Crypto"
        }
    },
    {
        "label": "Ethereum (ETH)",
        "value": "crypto:ethereum",
        "extraInfo": {
            "description": "Smart contract platform — risk-on / DeFi proxy",
            "rightOfDescription": "Crypto"
        }
    },
    {
        "label": "Solana (SOL)",
        "value": "crypto:solana",
        "extraInfo": {
            "description": "High-throughput Layer 1 blockchain",
            "rightOfDescription": "Crypto"
        }
    },
    # Rates
    {
        "label": "Duration Risk (TLT)",
        "value": "equity:TLT",
        "extraInfo": {
            "description": "iShares 20+ Year Treasury ETF — long-duration rate sensitivity",
            "rightOfDescription": "Rates"
        }
    },
    # Credit
    {
        "label": "IG Credit Spreads (LQD)",
        "value": "equity:LQD",
        "extraInfo": {
            "description": "iShares IG Corporate Bond ETF — investment grade credit cycle",
            "rightOfDescription": "Credit"
        }
    },
    {
        "label": "High Yield Spreads (HYG)",
        "value": "equity:HYG",
        "extraInfo": {
            "description": "iShares HY Corporate Bond ETF — risk-off / credit stress indicator",
            "rightOfDescription": "Credit"
        }
    },
    # Sector ETFs
    {
        "label": "Financials Benchmark (XLF)",
        "value": "equity:XLF",
        "extraInfo": {
            "description": "SPDR Financial Select Sector ETF — broad financial sector benchmark",
            "rightOfDescription": "Sector ETF"
        }
    },
    {
        "label": "Fintech Payments (IPAY)",
        "value": "equity:IPAY",
        "extraInfo": {
            "description": "ETF Managers Payments ETF — payments sub-sector benchmark",
            "rightOfDescription": "Sector ETF"
        }
    },
    {
        "label": "Global Fintech (FINX)",
        "value": "equity:FINX",
        "extraInfo": {
            "description": "Global X Fintech ETF — diversified fintech benchmark",
            "rightOfDescription": "Sector ETF"
        }
    },
    {
        "label": "Disruptive Innovation (ARKF)",
        "value": "equity:ARKF",
        "extraInfo": {
            "description": "ARK Fintech Innovation ETF — high-growth / innovation proxy",
            "rightOfDescription": "Sector ETF"
        }
    },
]

# Default selection: all instruments
DEFAULT_INSTRUMENTS = [item["value"] for item in MACRO_INSTRUMENT_CATALOG]

# Asset class display labels
ASSET_CLASS_LABELS = {
    "crypto": "Crypto",
    "equity": "Equity/ETF",
}

CRYPTO_ID_MAP = {
    "crypto:bitcoin":  ("Bitcoin (BTC)",       "bitcoin",  "Crypto"),
    "crypto:ethereum": ("Ethereum (ETH)",       "ethereum", "Crypto"),
    "crypto:solana":   ("Solana (SOL)",         "solana",   "Crypto"),
}

EQUITY_LABEL_MAP = {
    "equity:TLT":  ("Duration Risk (TLT)",          "Rates"),
    "equity:LQD":  ("IG Credit Spreads (LQD)",       "Credit"),
    "equity:HYG":  ("High Yield Spreads (HYG)",      "Credit"),
    "equity:XLF":  ("Financials Benchmark (XLF)",    "Sector ETF"),
    "equity:IPAY": ("Fintech Payments (IPAY)",       "Sector ETF"),
    "equity:FINX": ("Global Fintech (FINX)",         "Sector ETF"),
    "equity:ARKF": ("Disruptive Innovation (ARKF)",  "Sector ETF"),
}


@router.get("/macro_instruments")
def macro_instruments():
    """Options endpoint — returns human-readable instrument catalog for macro monitor."""
    return MACRO_INSTRUMENT_CATALOG


# ─────────────────────────────────────────────────────────────────────────────
# Widget 1.3 — Macro Returns Monitor (replaces static metric tiles)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/macro_inputs")
def macro_inputs(
    instruments: str = Query(
        ",".join(DEFAULT_INSTRUMENTS),
        description="Comma-separated instrument values from /macro_instruments"
    ),
    period: str = Query("1D", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
):
    """
    Widget 1.3 — Macro Returns Monitor.
    Returns a table of selected instruments with price and period return.
    Returns raw numeric values (not formatted strings).
    """
    period_unit, period_value = parse_period_param(period)
    start_date, end_date = period_to_dates(period_unit, period_value)
    p_label = period_label(period_unit, period_value)

    selected = [s.strip() for s in instruments.split(",") if s.strip()]
    if not selected:
        selected = DEFAULT_INSTRUMENTS

    rows = []

    for instrument_key in selected:
        try:
            if instrument_key in CRYPTO_ID_MAP:
                display_name, cg_id, asset_class = CRYPTO_ID_MAP[instrument_key]
                # Current price from snapshot
                price, _ = dp.get_crypto_current_price(cg_id)
                # Period return from historical range
                ret_pct = dp.get_crypto_period_return(cg_id, start_date, end_date)

                rows.append({
                    "instrument": display_name,
                    "asset_class": asset_class,
                    "price": round(price, 2) if price else None,
                    "return_pct": round(ret_pct, 2) if ret_pct is not None else None,
                    "period": p_label,
                })

            elif instrument_key in EQUITY_LABEL_MAP:
                display_name, asset_class = EQUITY_LABEL_MAP[instrument_key]
                ticker = instrument_key.split(":")[1]
                price, ret_pct = dp.get_equity_period_return(ticker, start_date, end_date)

                rows.append({
                    "instrument": display_name,
                    "asset_class": asset_class,
                    "price": round(price, 2) if price else None,
                    "return_pct": round(ret_pct, 2) if ret_pct is not None else None,
                    "period": p_label,
                })

        except Exception as e:
            logger.warning(f"macro_inputs error for {instrument_key}: {e}")

    # Sort: Crypto first, then by asset class, then alphabetical
    order = {"Crypto": 0, "Rates": 1, "Credit": 2, "Sector ETF": 3}
    rows.sort(key=lambda r: (order.get(r["asset_class"], 9), r["instrument"]))
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Widget 1.1 — Universe Pre-Market Movers
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/universe_movers")
def universe_movers(
    sub_sector: str = Query("All"),
    min_mktcap_b: float = Query(0.0, ge=0.0, le=2000.0, description="Min market cap in $B"),
    max_mktcap_b: float = Query(2000.0, ge=0.0, le=2000.0, description="Max market cap in $B"),
):
    """Widget 1.1 — Universe Pre-Market Movers Table. Returns raw numeric values."""
    try:
        universe_tickers = set(get_all_tickers())
        if sub_sector != "All":
            universe_tickers = set(get_sub_sector_tickers(sub_sector))

        all_snaps = dp.get_snapshot_all()
        rows = []

        for snap in all_snaps:
            ticker = snap.get("ticker", "")
            if ticker not in universe_tickers:
                continue

            # Market cap filter — fetch details only if a non-default filter is applied
            mktcap = None
            if min_mktcap_b > 0 or max_mktcap_b < 2000.0:
                try:
                    details = dp.get_ticker_details(ticker)
                    mktcap = details.get("market_cap", 0) or 0
                    min_val = min_mktcap_b * 1_000_000_000
                    max_val = max_mktcap_b * 1_000_000_000
                    if mktcap < min_val or mktcap > max_val:
                        continue
                except Exception:
                    pass  # Skip filtering if details unavailable

            day = snap.get("day", {})
            last_price = day.get("c", 0) or snap.get("lastTrade", {}).get("p", 0)
            volume = day.get("v", 0)
            pct_change = snap.get("todaysChangePerc", 0) or 0

            rows.append({
                "ticker": ticker,
                "sub_sector": get_ticker_sub_sector(ticker),
                "last_price": round(last_price, 2),
                "pct_change": round(pct_change, 2),
                "volume": int(volume) if volume else 0,
                "mktcap": fmt_mktcap(mktcap) if mktcap else None,
            })

        rows.sort(
            key=lambda r: abs(r["pct_change"]),
            reverse=True,
        )
        return rows
    except Exception as e:
        logger.error(f"universe_movers error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Widget 1.2 — Fintech Gainers / Losers
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/gainers_losers")
def gainers_losers(
    sub_sector: str = Query("All"),
    count: int = Query(10, ge=5, le=25),
    period: str = Query("1D", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
):
    """Widget 1.2 — Fintech Gainers / Losers with configurable period return. Returns raw numeric values."""
    try:
        period_unit, period_value = parse_period_param(period)

        if sub_sector != "All":
            universe_tickers = set(get_sub_sector_tickers(sub_sector))
        else:
            universe_tickers = set(get_all_tickers())

        p_label = period_label(period_unit, period_value)
        # For 1D, use snapshot (fast). For multi-period, use aggregates.
        use_snapshot = (period_unit == "days" and period_value == 1)

        all_snaps = dp.get_snapshot_all()
        fintech_snaps = []

        for snap in all_snaps:
            ticker = snap.get("ticker", "")
            if ticker not in universe_tickers:
                continue

            day = snap.get("day", {})
            prev = snap.get("prevDay", {})
            volume = day.get("v", 0)
            prev_close = prev.get("c", 0)
            current_price = day.get("c", 0) or snap.get("lastTrade", {}).get("p", 0)

            if use_snapshot:
                pct = snap.get("todaysChangePerc", 0) or 0
            else:
                # Calculate period return from aggregates
                start_date, end_date = period_to_dates(period_unit, period_value)
                try:
                    _, pct = dp.get_equity_period_return(ticker, start_date, end_date)
                    pct = pct or 0
                except Exception:
                    pct = snap.get("todaysChangePerc", 0) or 0

            fintech_snaps.append({
                "ticker": ticker,
                "sub_sector": get_ticker_sub_sector(ticker),
                "pct_change_raw": round(pct, 2),
                "pct_change": round(pct, 2),
                "volume": int(volume) if volume else 0,
                "prev_close": round(prev_close, 2),
                "current_price": round(current_price, 2),
                "period": p_label,
                "direction": "",
            })

        fintech_snaps.sort(key=lambda x: x["pct_change_raw"], reverse=True)
        gainers = fintech_snaps[:count]
        losers = fintech_snaps[-count:][::-1]

        rows = []
        for g in gainers:
            g["direction"] = "Gainer"
            rows.append(g)
        for l_item in losers:
            l_item["direction"] = "Loser"
            rows.append(l_item)

        # Keep pct_change_raw for sorting (frontend hides via hide: true)
        return rows

    except Exception as e:
        logger.error(f"gainers_losers error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Widget 1.4 — Spread Drift Alerts
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/spread_drift_alerts")
def spread_drift_alerts(z_threshold: float = Query(1.5, ge=0.5, le=3.0)):
    """Widget 1.4 — Relative Value Spread Drift Alerts. Returns raw numeric values."""
    from pairs_engine import kalman_hedge_ratio
    today = datetime.now().strftime("%Y-%m-%d")
    from_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

    rows = []
    for stock_a, stock_b in DEFAULT_PAIRS:
        try:
            df_a = dp.get_aggregates(stock_a, from_date, today)
            df_b = dp.get_aggregates(stock_b, from_date, today)
            if df_a.empty or df_b.empty:
                continue
            prices_a = df_a.set_index("date")["close"]
            prices_b = df_b.set_index("date")["close"]
            prices_a.index = pd.to_datetime(prices_a.index)
            prices_b.index = pd.to_datetime(prices_b.index)
            result = kalman_hedge_ratio(prices_a, prices_b)
            if result.empty:
                continue
            latest = result.iloc[-1]
            z = latest.get("z_score", 0)
            if abs(z) >= z_threshold:
                mean_spread = result["spread"].rolling(60).mean().iloc[-1]

                rows.append({
                    "pair": f"{stock_a} / {stock_b}",
                    "z_score": round(z, 2),
                    "spread": round(latest['spread'], 4),
                    "mean_60d": round(mean_spread, 4) if not pd.isna(mean_spread) else None,
                    "hedge_ratio": round(latest.get('hedge_ratio', 0), 4),
                })
        except Exception as e:
            logger.debug(f"Spread drift error for {stock_a}/{stock_b}: {e}")

    rows.sort(key=lambda r: abs(r["z_score"]), reverse=True)
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Widget 1.5 — Technical Signal Alerts
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/technical_alerts")
def technical_alerts(
    sub_sector: str = Query("All"),
    signal_types: str = Query("all", description="all | rsi | macd | sma (comma-separated)"),
    rsi_overbought: float = Query(70, ge=50, le=95, description="RSI overbought threshold"),
    rsi_oversold: float = Query(30, ge=5, le=50, description="RSI oversold threshold"),
):
    """Widget 1.5 — Technical Signal Alert Feed with configurable thresholds."""
    from technicals import scan_universe

    tickers = None
    if sub_sector != "All":
        tickers = get_sub_sector_tickers(sub_sector)

    # Parse signal types
    sig_types = None
    if signal_types and signal_types.strip().lower() != "all":
        sig_types = [s.strip().lower() for s in signal_types.split(",") if s.strip()]

    return scan_universe(
        tickers=tickers,
        signal_types=sig_types,
        rsi_overbought=rsi_overbought,
        rsi_oversold=rsi_oversold,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Widget 1.6 — Corporate Actions Calendar (redesigned)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/corporate_actions_calendar")
def corporate_actions_calendar(
    start_date: str = Query(None, description="YYYY-MM-DD — start of calendar window (defaults to today)"),
    end_date: str = Query(None, description="YYYY-MM-DD — end of calendar window (defaults to +30 days)"),
    event_types: str = Query("all", description="all | dividends | splits | earnings"),
    sub_sector: str = Query("All"),
):
    """
    Widget 1.6 — Corporate Actions Calendar.
    Full date-range picker, event-type filter, sub-sector filter.
    Returns raw numeric values and structured signal fields.
    """
    today = datetime.now()
    start_str = start_date or today.strftime("%Y-%m-%d")
    end_str = end_date or (today + timedelta(days=30)).strftime("%Y-%m-%d")

    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    include_divs     = event_types in ("all", "dividends")
    include_splits   = event_types in ("all", "splits")
    include_earnings = event_types in ("all", "earnings")

    rows = []

    for ticker in tickers:
        sector = get_ticker_sub_sector(ticker)

        if include_divs:
            try:
                divs = dp.get_dividends(ticker)
                for d in divs:
                    ex_date = d.get("ex_dividend_date", "")
                    pay_date = d.get("pay_date", "")
                    cash_amt = d.get("cash_amount", 0) or 0
                    if ex_date and start_str <= ex_date <= end_str:
                        # Annualized yield requires current price
                        try:
                            snap = dp.get_snapshot_ticker(ticker)
                            price = snap.get("day", {}).get("c", 0) or snap.get("lastTrade", {}).get("p", 0)
                            annual_yield = (cash_amt * 4 / price * 100) if price and cash_amt else None
                        except Exception:
                            annual_yield = None

                        rows.append({
                            "ticker": ticker,
                            "sub_sector": sector,
                            "event_type": "Dividend",
                            "event_date": ex_date,
                            "pay_date": pay_date or None,
                            "detail": round(cash_amt, 2),
                            "yield_ann": round(annual_yield, 2) if annual_yield else None,
                            "signal": "Dividend",
                        })
            except Exception:
                pass

        if include_splits:
            try:
                splits = dp.get_splits(ticker)
                for s in splits:
                    exec_date = s.get("execution_date", "")
                    if exec_date and start_str <= exec_date <= end_str:
                        split_from = s.get("split_from", 1)
                        split_to   = s.get("split_to", 1)
                        rows.append({
                            "ticker": ticker,
                            "sub_sector": sector,
                            "event_type": "Split",
                            "event_date": exec_date,
                            "pay_date": None,
                            "detail": f"{split_from}:{split_to}",
                            "yield_ann": None,
                            "signal": "Split",
                        })
            except Exception:
                pass

        if include_earnings:
            try:
                earnings_data = dp.get_earnings_calendar(ticker, start_str, end_str)
                for e in earnings_data:
                    report_date = e.get("period_of_report_date", "") or e.get("filing_date", "")
                    if report_date and start_str <= report_date <= end_str:
                        period = e.get("fiscal_period", "")
                        rows.append({
                            "ticker": ticker,
                            "sub_sector": sector,
                            "event_type": "Earnings",
                            "event_date": report_date,
                            "pay_date": None,
                            "detail": period,
                            "yield_ann": None,
                            "signal": "Earnings",
                        })
            except Exception:
                pass

    rows.sort(key=lambda r: r["event_date"])
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Widget 1.7 — Stock Chart with SMA overlays
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stock_chart")
def stock_chart(
    symbols: str = Query("PYPL", description="Comma-separated ticker(s), max 5"),
    period: str = Query("3M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    chart_type: str = Query("candlestick", description="candlestick | line"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
):
    """Widget 1.7 — Stock Price Chart with SMA overlays (50/200)."""
    try:
        period_unit, period_value = parse_period_param(period)

        # Parse symbols and cap at 5
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        symbol_list = symbol_list[:5]

        if not symbol_list:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

        # Get date range
        start_date, end_date = period_to_dates(period_unit, period_value)

        # Single symbol — candlestick or line with SMAs
        if len(symbol_list) == 1:
            ticker = symbol_list[0]
            try:
                df = dp.get_aggregates(ticker, start_date, end_date)
                if df.empty:
                    return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

                if raw:
                    ohlcv = df[["date", "open", "high", "low", "close", "volume"]].copy()
                    return ohlcv.to_dict(orient="records")

                # Build candlestick/line chart
                if chart_type == "candlestick":
                    fig = make_subplots(specs=[[{"secondary_y": False}]])

                    # Candlestick
                    fig.add_trace(go.Candlestick(
                        x=df["date"], open=df["open"], high=df["high"],
                        low=df["low"], close=df["close"],
                        name=ticker,
                    ))

                    # SMA 50
                    sma50 = df["close"].rolling(window=50).mean()
                    fig.add_trace(go.Scatter(
                        x=df["date"], y=sma50, mode="lines",
                        name="SMA(50)", line=dict(color="rgba(255,193,7,0.8)", width=1.5),
                    ))

                    # SMA 200
                    sma200 = df["close"].rolling(window=200).mean()
                    fig.add_trace(go.Scatter(
                        x=df["date"], y=sma200, mode="lines",
                        name="SMA(200)", line=dict(color="rgba(244,67,54,0.8)", width=1.5),
                    ))

                    fig.update_layout(**chart_layout(theme, yaxis_title=f"{ticker} Price"))
                    return JSONResponse(content=json.loads(fig.to_json()))

                else:  # line chart
                    fig = go.Figure()

                    # Close price
                    fig.add_trace(go.Scatter(
                        x=df["date"], y=df["close"], mode="lines",
                        name=ticker, line=dict(width=2),
                    ))

                    # SMA 50
                    sma50 = df["close"].rolling(window=50).mean()
                    fig.add_trace(go.Scatter(
                        x=df["date"], y=sma50, mode="lines",
                        name="SMA(50)", line=dict(color="rgba(255,193,7,0.8)", width=1.5, dash="dash"),
                    ))

                    # SMA 200
                    sma200 = df["close"].rolling(window=200).mean()
                    fig.add_trace(go.Scatter(
                        x=df["date"], y=sma200, mode="lines",
                        name="SMA(200)", line=dict(color="rgba(244,67,54,0.8)", width=1.5, dash="dash"),
                    ))

                    fig.update_layout(**chart_layout(theme, yaxis_title=f"{ticker} Price"))
                    return JSONResponse(content=json.loads(fig.to_json()))

            except Exception as e:
                logger.error(f"stock_chart error for {ticker}: {e}")
                return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

        # Multiple symbols — normalized line chart
        else:
            fig = go.Figure()
            raw_data = []

            for idx, ticker in enumerate(symbol_list):
                try:
                    df = dp.get_aggregates(ticker, start_date, end_date)
                    if df.empty:
                        continue

                    # Normalize to 100 at start
                    first_price = df.iloc[0]["close"]
                    normalized = (df["close"] / first_price * 100).values

                    if raw:
                        for i, row in df.iterrows():
                            raw_data.append({
                                "date": row["date"],
                                "ticker": ticker,
                                "close": round(row["close"], 2),
                            })
                    else:
                        fig.add_trace(go.Scatter(
                            x=df["date"], y=normalized,
                            mode="lines", name=ticker,
                            line=dict(color=TRACE_COLORS[idx % len(TRACE_COLORS)], width=2),
                        ))

                except Exception as e:
                    logger.debug(f"stock_chart error for {ticker}: {e}")

            if raw:
                return raw_data

            fig.update_layout(**chart_layout(theme, yaxis_title="Normalized Price (100=start)"))
            return JSONResponse(content=json.loads(fig.to_json()))

    except Exception as e:
        logger.error(f"stock_chart error: {e}")
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

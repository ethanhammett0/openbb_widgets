"""Tab 1: Morning Pulse — Pre-market movers, macro inputs, alerts."""
import json
import logging
import pandas as pd
from datetime import datetime, timedelta

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

import data_providers as dp
from universe import (
    get_all_tickers, get_ticker_sub_sector, get_sub_sector_tickers,
    MACRO_TICKERS, CRYPTO_IDS, DEFAULT_PAIRS, UNIVERSE,
)
from theme import fmt_price, fmt_pct, fmt_volume, fmt_zscore, flag_pct

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/universe_movers")
def universe_movers(sub_sector: str = Query("All"), cap_tier: str = Query("All")):
    """Widget 1.1 — Universe Pre-Market Movers Table."""
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

            # Cap tier filtering via Polygon market cap
            if cap_tier != "All":
                try:
                    details = dp.get_ticker_details(ticker)
                    mc = details.get("market_cap", 0) or 0
                    if cap_tier == "Large (>$10B)" and mc < 10_000_000_000:
                        continue
                    elif cap_tier == "Mid ($2-10B)" and (mc < 2_000_000_000 or mc >= 10_000_000_000):
                        continue
                    elif cap_tier == "Small (<$2B)" and mc >= 2_000_000_000:
                        continue
                except Exception:
                    pass

            day = snap.get("day", {})
            last_price = day.get("c", 0) or snap.get("lastTrade", {}).get("p", 0)
            volume = day.get("v", 0)
            pct_change = snap.get("todaysChangePerc", 0) or 0
            abs_pct = abs(pct_change)
            flag = "🔴" if abs_pct > 3 else ("🟡" if abs_pct > 1.5 else "")

            rows.append({
                "ticker": ticker,
                "sub_sector": get_ticker_sub_sector(ticker),
                "last_price": fmt_price(last_price),
                "pct_change": fmt_pct(pct_change),
                "volume": fmt_volume(volume),
                "flag": flag,
            })

        rows.sort(key=lambda r: abs(float(r["pct_change"].replace("+","").replace("%","")) if r["pct_change"] != "0.00%" else 0), reverse=True)
        return rows
    except Exception as e:
        logger.error(f"universe_movers error: {e}")
        return []


@router.get("/gainers_losers")
def gainers_losers(sub_sector: str = Query("All"), count: int = Query(10, ge=5, le=25)):
    """Widget 1.2 — Fintech Gainers / Losers."""
    try:
        if sub_sector != "All":
            universe_tickers = set(get_sub_sector_tickers(sub_sector))
        else:
            universe_tickers = set(get_all_tickers())
        all_snaps = dp.get_snapshot_all()

        fintech_snaps = []
        for snap in all_snaps:
            ticker = snap.get("ticker", "")
            if ticker in universe_tickers:
                pct = snap.get("todaysChangePerc", 0) or 0
                day = snap.get("day", {})
                prev = snap.get("prevDay", {})
                volume = day.get("v", 0)
                prev_close = prev.get("c", 0)
                current_price = day.get("c", 0) or snap.get("lastTrade", {}).get("p", 0)
                fintech_snaps.append({
                    "ticker": ticker,
                    "sub_sector": get_ticker_sub_sector(ticker),
                    "pct_change": round(pct, 2),
                    "pct_change_fmt": fmt_pct(pct),
                    "volume": fmt_volume(volume),
                    "prev_close": fmt_price(prev_close),
                    "current_price": fmt_price(current_price),
                    "direction": "",
                })

        fintech_snaps.sort(key=lambda x: x["pct_change"], reverse=True)
        gainers = fintech_snaps[:count]
        losers = fintech_snaps[-count:][::-1]

        rows = []
        for g in gainers:
            g["direction"] = "Gainer"
            rows.append(g)
        for l_item in losers:
            l_item["direction"] = "Loser"
            rows.append(l_item)
        return rows
    except Exception as e:
        logger.error(f"gainers_losers error: {e}")
        return []


@router.get("/macro_inputs")
def macro_inputs():
    """Widget 1.3 — Macro Factor Inputs Panel (metric tiles)."""
    tiles = []
    try:
        crypto = dp.get_crypto_prices(CRYPTO_IDS)
        for c in crypto:
            change = c.get("change_24h", 0)
            flag = ""
            if c["symbol"] == "BTC" and abs(change) > 5:
                flag = " ⚠️"
            tiles.append({
                "label": f"{c['symbol']}{flag}",
                "value": fmt_price(c['price']),
                "delta": fmt_pct(change),
            })
    except Exception as e:
        logger.warning(f"CoinGecko error in macro_inputs: {e}")

    for ticker in MACRO_TICKERS:
        try:
            snap = dp.get_snapshot_ticker(ticker)
            day = snap.get("day", {})
            prev = snap.get("prevDay", {})
            price = day.get("c", 0) or snap.get("lastTrade", {}).get("p", 0)
            prev_c = prev.get("c", 0)
            pct = ((price - prev_c) / prev_c * 100) if prev_c else 0
            flag = ""
            if ticker == "TLT" and abs(pct) > 1:
                flag = " ⚠️"
            tiles.append({
                "label": f"{ticker}{flag}",
                "value": fmt_price(price),
                "delta": fmt_pct(pct),
            })
        except Exception as e:
            logger.warning(f"Snapshot error for {ticker}: {e}")

    return tiles


@router.get("/spread_drift_alerts")
def spread_drift_alerts(z_threshold: float = Query(1.5, ge=0.5, le=3.0)):
    """Widget 1.4 — Relative Value Spread Drift Alerts."""
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
                    "z_score": fmt_zscore(z),
                    "spread": f"{latest['spread']:.4f}",
                    "mean_60d": f"{mean_spread:.4f}" if not pd.isna(mean_spread) else "—",
                    "flag": "🔴" if abs(z) >= 2 else "🟡",
                })
        except Exception as e:
            logger.debug(f"Spread drift error for {stock_a}/{stock_b}: {e}")

    rows.sort(key=lambda r: abs(float(r["z_score"])), reverse=True)
    return rows


@router.get("/technical_alerts")
def technical_alerts(sub_sector: str = Query("All")):
    """Widget 1.5 — Technical Signal Alert Feed."""
    from technicals import scan_universe
    if sub_sector != "All":
        tickers = get_sub_sector_tickers(sub_sector)
        return scan_universe(tickers=tickers)
    return scan_universe()


@router.get("/corporate_actions_calendar")
def corporate_actions_calendar(days_ahead: int = Query(30, ge=7, le=90)):
    """Widget 1.6 — Corporate Actions Calendar."""
    today = datetime.now()
    future = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")
    rows = []

    for ticker in get_all_tickers():
        try:
            divs = dp.get_dividends(ticker)
            for d in divs:
                ex_date = d.get("ex_dividend_date", "")
                if ex_date and today_str <= ex_date <= future:
                    rows.append({
                        "ticker": ticker,
                        "sub_sector": get_ticker_sub_sector(ticker),
                        "type": "Dividend",
                        "date": ex_date,
                        "detail": fmt_price(d.get('cash_amount', 0)),
                    })
        except Exception:
            pass
        try:
            splits = dp.get_splits(ticker)
            for s in splits:
                exec_date = s.get("execution_date", "")
                if exec_date and today_str <= exec_date <= future:
                    rows.append({
                        "ticker": ticker,
                        "sub_sector": get_ticker_sub_sector(ticker),
                        "type": "Split",
                        "date": exec_date,
                        "detail": f"{s.get('split_from', 1)}:{s.get('split_to', 1)}",
                    })
        except Exception:
            pass

    rows.sort(key=lambda r: r["date"])
    return rows

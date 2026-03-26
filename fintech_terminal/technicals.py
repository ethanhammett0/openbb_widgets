"""
Technical Indicators Scanner
Scans universe for RSI extremes, MACD crossovers, SMA crosses.
"""
import logging
from typing import Optional

import data_providers as dp
from universe import get_all_tickers, get_ticker_sub_sector

logger = logging.getLogger(__name__)


def scan_universe(tickers: list[str] | None = None) -> list[dict]:
    """
    Scan all universe tickers for technical signals.
    Returns list of alert dicts for Widget 1.5.
    """
    if tickers is None:
        tickers = get_all_tickers()

    alerts = []

    for ticker in tickers:
        sub_sector = get_ticker_sub_sector(ticker)

        # ── RSI Check ──
        try:
            rsi_data = dp.get_rsi(ticker, window=14, limit=5)
            if rsi_data:
                latest_rsi = rsi_data[0].get("value", 50)
                if latest_rsi is not None:
                    if latest_rsi > 70:
                        alerts.append({
                            "ticker": ticker,
                            "sub_sector": sub_sector,
                            "signal_type": "RSI Overbought",
                            "signal_value": round(latest_rsi, 1),
                            "direction": "Bearish",
                            "flag": "🔴",
                        })
                    elif latest_rsi < 30:
                        alerts.append({
                            "ticker": ticker,
                            "sub_sector": sub_sector,
                            "signal_type": "RSI Oversold",
                            "signal_value": round(latest_rsi, 1),
                            "direction": "Bullish",
                            "flag": "🔴",
                        })
        except Exception as e:
            logger.debug(f"RSI scan failed for {ticker}: {e}")

        # ── MACD Crossover Check ──
        try:
            macd_data = dp.get_macd(ticker, limit=5)
            if len(macd_data) >= 2:
                curr = macd_data[0]
                prev = macd_data[1]
                curr_hist = curr.get("histogram", 0) or 0
                prev_hist = prev.get("histogram", 0) or 0
                if prev_hist < 0 and curr_hist >= 0:
                    alerts.append({
                        "ticker": ticker,
                        "sub_sector": sub_sector,
                        "signal_type": "MACD Bullish Cross",
                        "signal_value": round(curr_hist, 4),
                        "direction": "Bullish",
                        "flag": "🟡",
                    })
                elif prev_hist > 0 and curr_hist <= 0:
                    alerts.append({
                        "ticker": ticker,
                        "sub_sector": sub_sector,
                        "signal_type": "MACD Bearish Cross",
                        "signal_value": round(curr_hist, 4),
                        "direction": "Bearish",
                        "flag": "🟡",
                    })
        except Exception as e:
            logger.debug(f"MACD scan failed for {ticker}: {e}")

        # ── SMA 50/200 Cross Check ──
        try:
            sma50 = dp.get_sma(ticker, window=50, limit=3)
            sma200 = dp.get_sma(ticker, window=200, limit=3)
            if sma50 and sma200 and len(sma50) >= 2 and len(sma200) >= 2:
                curr_50 = sma50[0].get("value", 0)
                prev_50 = sma50[1].get("value", 0)
                curr_200 = sma200[0].get("value", 0)
                prev_200 = sma200[1].get("value", 0)

                # Golden Cross: 50 crosses above 200
                if prev_50 and prev_200 and curr_50 and curr_200:
                    if prev_50 < prev_200 and curr_50 >= curr_200:
                        alerts.append({
                            "ticker": ticker,
                            "sub_sector": sub_sector,
                            "signal_type": "Golden Cross (50/200 SMA)",
                            "signal_value": round(curr_50, 2),
                            "direction": "Bullish",
                            "flag": "🟡",
                        })
                    elif prev_50 > prev_200 and curr_50 <= curr_200:
                        alerts.append({
                            "ticker": ticker,
                            "sub_sector": sub_sector,
                            "signal_type": "Death Cross (50/200 SMA)",
                            "signal_value": round(curr_50, 2),
                            "direction": "Bearish",
                            "flag": "🟡",
                        })
        except Exception as e:
            logger.debug(f"SMA scan failed for {ticker}: {e}")

    # Sort by flag priority (red first, then yellow)
    flag_order = {"🔴": 0, "🟡": 1}
    alerts.sort(key=lambda x: flag_order.get(x.get("flag", ""), 2))

    return alerts

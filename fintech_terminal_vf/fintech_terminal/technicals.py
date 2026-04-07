"""
Technical Indicators Scanner
Scans universe for RSI extremes, MACD crossovers, SMA crosses.
"""
import logging
from typing import Optional

import data_providers as dp
from universe import get_all_tickers, get_ticker_sub_sector

logger = logging.getLogger(__name__)


def scan_universe(
    tickers: list[str] | None = None,
    signal_types: list[str] | None = None,
    rsi_overbought: float = 70,
    rsi_oversold: float = 30,
) -> list[dict]:
    """
    Scan universe tickers for technical signals.

    Args:
        tickers: List of tickers to scan (default: all universe)
        signal_types: Filter to specific signal types. Options: "rsi", "macd", "sma". Default: all.
        rsi_overbought: RSI level considered overbought (default: 70)
        rsi_oversold: RSI level considered oversold (default: 30)
    """
    if tickers is None:
        tickers = get_all_tickers()

    include_rsi = signal_types is None or "rsi" in signal_types
    include_macd = signal_types is None or "macd" in signal_types
    include_sma = signal_types is None or "sma" in signal_types

    alerts = []

    for ticker in tickers:
        sub_sector = get_ticker_sub_sector(ticker)

        # ── RSI Check ──
        if include_rsi:
            try:
                rsi_data = dp.get_rsi(ticker, window=14, limit=5)
                if rsi_data:
                    latest_rsi = rsi_data[0].get("value", 50)
                    if latest_rsi is not None:
                        if latest_rsi > rsi_overbought:
                            alerts.append({
                                "ticker": ticker,
                                "sub_sector": sub_sector,
                                "signal_type": "RSI Overbought",
                                "signal_value": round(latest_rsi, 1),
                                "threshold": rsi_overbought,
                                "direction": "Bearish",
                                "signal": "Overbought",
                                "signal_detail": f"RSI(14) = {latest_rsi:.1f} > {rsi_overbought} threshold",
                            })
                        elif latest_rsi < rsi_oversold:
                            alerts.append({
                                "ticker": ticker,
                                "sub_sector": sub_sector,
                                "signal_type": "RSI Oversold",
                                "signal_value": round(latest_rsi, 1),
                                "threshold": rsi_oversold,
                                "direction": "Bullish",
                                "signal": "Oversold",
                                "signal_detail": f"RSI(14) = {latest_rsi:.1f} < {rsi_oversold} threshold",
                            })
            except Exception as e:
                logger.debug(f"RSI scan failed for {ticker}: {e}")

        # ── MACD Crossover Check ──
        if include_macd:
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
                            "threshold": 0,
                            "direction": "Bullish",
                            "signal": "MACD Cross",
                            "signal_detail": f"MACD histogram crossed above 0 (prev={prev_hist:.4f}, curr={curr_hist:.4f})",
                        })
                    elif prev_hist > 0 and curr_hist <= 0:
                        alerts.append({
                            "ticker": ticker,
                            "sub_sector": sub_sector,
                            "signal_type": "MACD Bearish Cross",
                            "signal_value": round(curr_hist, 4),
                            "threshold": 0,
                            "direction": "Bearish",
                            "signal": "MACD Cross",
                            "signal_detail": f"MACD histogram crossed below 0 (prev={prev_hist:.4f}, curr={curr_hist:.4f})",
                        })
            except Exception as e:
                logger.debug(f"MACD scan failed for {ticker}: {e}")

        # ── SMA 50/200 Cross Check ──
        if include_sma:
            try:
                sma50 = dp.get_sma(ticker, window=50, limit=3)
                sma200 = dp.get_sma(ticker, window=200, limit=3)
                if sma50 and sma200 and len(sma50) >= 2 and len(sma200) >= 2:
                    curr_50 = sma50[0].get("value", 0)
                    prev_50 = sma50[1].get("value", 0)
                    curr_200 = sma200[0].get("value", 0)
                    prev_200 = sma200[1].get("value", 0)

                    if prev_50 and prev_200 and curr_50 and curr_200:
                        if prev_50 < prev_200 and curr_50 >= curr_200:
                            alerts.append({
                                "ticker": ticker,
                                "sub_sector": sub_sector,
                                "signal_type": "Golden Cross (50/200 SMA)",
                                "signal_value": round(curr_50, 2),
                                "threshold": round(curr_200, 2),
                                "direction": "Bullish",
                                "signal": "Golden Cross",
                                "signal_detail": f"SMA(50)={curr_50:.2f} crossed above SMA(200)={curr_200:.2f}",
                            })
                        elif prev_50 > prev_200 and curr_50 <= curr_200:
                            alerts.append({
                                "ticker": ticker,
                                "sub_sector": sub_sector,
                                "signal_type": "Death Cross (50/200 SMA)",
                                "signal_value": round(curr_50, 2),
                                "threshold": round(curr_200, 2),
                                "direction": "Bearish",
                                "signal": "Death Cross",
                                "signal_detail": f"SMA(50)={curr_50:.2f} crossed below SMA(200)={curr_200:.2f}",
                            })
            except Exception as e:
                logger.debug(f"SMA scan failed for {ticker}: {e}")

    # Sort by direction (Bearish first as more actionable), then ticker
    dir_order = {"Bearish": 0, "Bullish": 1}
    alerts.sort(key=lambda x: (dir_order.get(x.get("direction", ""), 2), x.get("ticker", "")))

    return alerts

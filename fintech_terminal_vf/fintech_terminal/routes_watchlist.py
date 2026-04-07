"""Advanced Returns Watchlist — dynamic return windows, sparklines, hover cards with news/SEC data."""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
import pandas as pd
import data_providers as dp
from universe import get_all_tickers, get_ticker_sub_sector

router = APIRouter()
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Window parsing utility
# ─────────────────────────────────────────────────────────────────────────────

def _window_to_dates(window: str) -> tuple[str, str]:
    """Convert a window code (1D, 5D, 1W, 1M, 3M, 6M, 1Y, YTD) to (start, end) dates."""
    today = datetime.now()
    end = today.strftime("%Y-%m-%d")

    if window == "YTD":
        start = datetime(today.year, 1, 1).strftime("%Y-%m-%d")
    elif window.endswith("D"):
        days = int(window[:-1])
        start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    elif window.endswith("W"):
        weeks = int(window[:-1])
        start = (today - timedelta(weeks=weeks)).strftime("%Y-%m-%d")
    elif window.endswith("M"):
        months = int(window[:-1])
        start = (today - timedelta(days=int(months * 30.44))).strftime("%Y-%m-%d")
    elif window.endswith("Y"):
        years = int(window[:-1])
        start = (today - timedelta(days=int(years * 365.25))).strftime("%Y-%m-%d")
    else:
        start = (today - timedelta(days=30)).strftime("%Y-%m-%d")

    return start, end


# ─────────────────────────────────────────────────────────────────────────────
# Returns Watchlist
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/returns_watchlist")
def returns_watchlist(
    symbols: str = Query("AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,META,V,MA,PYPL",
                         description="Comma-separated tickers"),
    windows: str = Query("1D,5D,1M,3M,YTD",
                         description="Comma-separated return windows (1D,5D,1W,2W,1M,3M,6M,1Y,YTD)"),
):
    """
    Advanced returns watchlist with dynamic return window columns.
    Each row contains: ticker, price, volume, market cap, and one column per selected window.
    Also includes a 30-day price sparkline and hover card data with news/fundamentals.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    window_list = [w.strip().upper() for w in windows.split(",") if w.strip()]

    if not symbol_list:
        symbol_list = get_all_tickers()[:20]
    if not window_list:
        window_list = ["1D", "5D", "1M", "3M", "YTD"]

    rows = []

    for ticker in symbol_list:
        try:
            # Get current snapshot
            snap = dp.get_snapshot_ticker(ticker)
            day = snap.get("day", {})
            prev = snap.get("prevDay", {})
            current_price = day.get("c", 0) or snap.get("lastTrade", {}).get("p", 0)
            volume = day.get("v", 0)
            today_change = snap.get("todaysChangePerc", 0) or 0

            # Get ticker details for hover card
            try:
                details = dp.get_ticker_details(ticker)
                company_name = details.get("name", ticker)
                market_cap = details.get("market_cap", 0) or 0
                sic_desc = details.get("sic_description", "")
                exchange = details.get("primary_exchange", "")
            except Exception:
                company_name = ticker
                market_cap = 0
                sic_desc = ""
                exchange = ""

            # Format market cap
            if market_cap >= 1e12:
                mktcap_str = f"${market_cap/1e12:.1f}T"
            elif market_cap >= 1e9:
                mktcap_str = f"${market_cap/1e9:.1f}B"
            elif market_cap >= 1e6:
                mktcap_str = f"${market_cap/1e6:.0f}M"
            else:
                mktcap_str = "—"

            # Build row with return for each window
            row = {
                "ticker": {
                    "value": ticker,
                    "description": f"{company_name}\n\n**Sector:** {sic_desc}\n**Market Cap:** {mktcap_str}\n**Exchange:** {exchange}",
                },
                "company": company_name,
                "price": round(current_price, 2) if current_price else None,
                "volume": int(volume) if volume else 0,
                "mktcap_raw": market_cap,
                "mktcap": mktcap_str,
            }

            # Calculate return for each selected window
            for window in window_list:
                try:
                    if window == "1D":
                        ret = round(today_change, 2)
                    else:
                        start, end = _window_to_dates(window)
                        _, ret = dp.get_equity_period_return(ticker, start, end)
                        ret = round(ret, 2) if ret is not None else None
                except Exception:
                    ret = None
                row[f"ret_{window}"] = ret

            # Build 30-day price sparkline
            try:
                spark_start = (datetime.now() - timedelta(days=40)).strftime("%Y-%m-%d")
                spark_end = datetime.now().strftime("%Y-%m-%d")
                spark_df = dp.get_aggregates(ticker, spark_start, spark_end)
                if not spark_df.empty:
                    row["price_sparkline"] = spark_df["close"].tail(30).tolist()
                else:
                    row["price_sparkline"] = []
            except Exception:
                row["price_sparkline"] = []

            # RSI for signal context
            try:
                rsi_data = dp.get_rsi(ticker, window=14, limit=1)
                if rsi_data:
                    rsi_val = rsi_data[0].get("value")
                    row["rsi_14"] = round(rsi_val, 1) if rsi_val else None
                else:
                    row["rsi_14"] = None
            except Exception:
                row["rsi_14"] = None

            rows.append(row)

        except Exception as e:
            logger.warning(f"Watchlist error for {ticker}: {e}")

    # Sort by market cap descending
    rows.sort(key=lambda r: r.get("mktcap_raw", 0), reverse=True)
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Advanced Technical Dashboard — single-stock multi-indicator deep dive
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/technical_dashboard")
def technical_dashboard(
    symbol: str = Query("AAPL", description="Stock ticker"),
    indicators: str = Query("rsi_14,macd_std,sma_50,sma_200,bbands_20,atr_14",
                            description="Comma-separated indicator IDs"),
    period: str = Query("6M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    custom_start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    custom_end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """
    Advanced technical indicator dashboard for a single stock.
    Returns OHLCV + all selected overlay/oscillator indicators in a single payload.
    Designed for table display with sparklines and signal interpretation.
    """
    from theme import parse_period_param, period_to_dates
    period_unit, period_value = parse_period_param(period)

    if custom_range and custom_start_date and custom_end_date:
        start_date, end_date = custom_start_date, custom_end_date
    else:
        start_date, end_date = period_to_dates(period_unit, period_value)
    ind_list = [i.strip().lower() for i in indicators.split(",") if i.strip()]

    try:
        df = dp.get_aggregates(symbol.upper(), start_date, end_date)
        if df.empty:
            return []

        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        close = df["close"]
        high = df["high"]
        low = df["low"]
        volume = df["volume"]

        results = []

        # ── RSI variants ──
        for ind in ind_list:
            if ind.startswith("rsi_"):
                period = int(ind.split("_")[1])
                delta = close.diff()
                gain = delta.where(delta > 0, 0).rolling(window=period).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
                rs = gain / loss.replace(0, float("nan"))
                rsi = 100 - (100 / (1 + rs))
                current = rsi.iloc[-1] if not rsi.empty else None

                zone = "Neutral"
                signal = "—"
                if current and current > 70:
                    zone = "Overbought"
                    signal = "Bearish — consider reducing"
                elif current and current < 30:
                    zone = "Oversold"
                    signal = "Bullish — potential reversal"
                elif current and current > 60:
                    zone = "Bullish Momentum"
                    signal = "Trending higher"
                elif current and current < 40:
                    zone = "Bearish Momentum"
                    signal = "Trending lower"

                # Divergence check
                price_trend = "up" if close.iloc[-1] > close.iloc[-10] else "down" if len(close) > 10 else "flat"
                rsi_trend = "up" if rsi.iloc[-1] > rsi.iloc[-10] else "down" if len(rsi) > 10 else "flat"
                divergence = ""
                if price_trend == "up" and rsi_trend == "down":
                    divergence = "Bearish Divergence detected"
                elif price_trend == "down" and rsi_trend == "up":
                    divergence = "Bullish Divergence detected"

                results.append({
                    "indicator": f"RSI ({period})",
                    "category": "Momentum",
                    "current_value": round(current, 1) if current else None,
                    "signal": signal,
                    "zone": zone,
                    "detail": f"RSI({period}) = {current:.1f}. {divergence}".strip() if current else "N/A",
                    "sparkline": rsi.tail(30).round(1).tolist(),
                    "upper_band": 70,
                    "lower_band": 30,
                })

        # ── MACD ──
        if "macd_std" in ind_list:
            ema12 = close.ewm(span=12).mean()
            ema26 = close.ewm(span=26).mean()
            macd_line = ema12 - ema26
            signal_line = macd_line.ewm(span=9).mean()
            histogram = macd_line - signal_line

            curr_hist = histogram.iloc[-1] if not histogram.empty else 0
            prev_hist = histogram.iloc[-2] if len(histogram) > 1 else 0
            curr_macd = macd_line.iloc[-1] if not macd_line.empty else 0

            if prev_hist < 0 and curr_hist >= 0:
                sig = "Bullish Crossover — MACD histogram turned positive"
            elif prev_hist > 0 and curr_hist <= 0:
                sig = "Bearish Crossover — MACD histogram turned negative"
            elif curr_hist > 0 and curr_hist > prev_hist:
                sig = "Bullish Momentum Increasing"
            elif curr_hist < 0 and curr_hist < prev_hist:
                sig = "Bearish Momentum Increasing"
            else:
                sig = "Neutral"

            results.append({
                "indicator": "MACD (12,26,9)",
                "category": "Trend",
                "current_value": round(curr_macd, 4) if curr_macd else None,
                "signal": sig,
                "zone": "Bullish" if curr_hist > 0 else "Bearish",
                "detail": f"MACD={curr_macd:.4f}, Hist={curr_hist:.4f}, Signal={signal_line.iloc[-1]:.4f}",
                "sparkline": histogram.tail(30).round(4).tolist(),
                "upper_band": None,
                "lower_band": None,
            })

        # ── SMA variants ──
        for ind in ind_list:
            if ind.startswith("sma_"):
                period = int(ind.split("_")[1])
                sma = close.rolling(window=period).mean()
                current_sma = sma.iloc[-1] if not sma.empty else None
                current_price = close.iloc[-1]

                if current_sma:
                    pct_from = ((current_price - current_sma) / current_sma) * 100
                    if current_price > current_sma:
                        sig = f"Price {pct_from:.1f}% above SMA({period}) — Bullish"
                    else:
                        sig = f"Price {abs(pct_from):.1f}% below SMA({period}) — Bearish"
                else:
                    sig = "Insufficient data"
                    pct_from = 0

                results.append({
                    "indicator": f"SMA ({period})",
                    "category": "Trend",
                    "current_value": round(current_sma, 2) if current_sma else None,
                    "signal": sig,
                    "zone": "Above" if current_price > (current_sma or 0) else "Below",
                    "detail": f"SMA({period})=${current_sma:.2f}, Price=${current_price:.2f}, Δ={pct_from:.1f}%" if current_sma else "N/A",
                    "sparkline": sma.tail(30).round(2).tolist(),
                    "upper_band": None,
                    "lower_band": None,
                })

        # ── EMA variants ──
        for ind in ind_list:
            if ind.startswith("ema_"):
                period = int(ind.split("_")[1])
                ema = close.ewm(span=period).mean()
                current_ema = ema.iloc[-1] if not ema.empty else None
                current_price = close.iloc[-1]

                if current_ema:
                    pct_from = ((current_price - current_ema) / current_ema) * 100
                    sig = f"Price {pct_from:+.1f}% from EMA({period})"
                else:
                    sig = "Insufficient data"

                results.append({
                    "indicator": f"EMA ({period})",
                    "category": "Trend",
                    "current_value": round(current_ema, 2) if current_ema else None,
                    "signal": sig,
                    "zone": "Above" if current_price > (current_ema or 0) else "Below",
                    "detail": f"EMA({period})=${current_ema:.2f}" if current_ema else "N/A",
                    "sparkline": ema.tail(30).round(2).tolist(),
                    "upper_band": None,
                    "lower_band": None,
                })

        # ── Bollinger Bands ──
        if "bbands_20" in ind_list:
            sma20 = close.rolling(window=20).mean()
            std20 = close.rolling(window=20).std()
            upper = sma20 + 2 * std20
            lower = sma20 - 2 * std20
            width = ((upper - lower) / sma20 * 100) if sma20.iloc[-1] else None
            current_price = close.iloc[-1]

            if current_price > upper.iloc[-1]:
                sig = "Price ABOVE upper band — Overbought / Breakout"
                zone = "Above Upper"
            elif current_price < lower.iloc[-1]:
                sig = "Price BELOW lower band — Oversold / Breakdown"
                zone = "Below Lower"
            elif current_price > sma20.iloc[-1]:
                sig = "Price in upper half of bands — Bullish bias"
                zone = "Upper Half"
            else:
                sig = "Price in lower half of bands — Bearish bias"
                zone = "Lower Half"

            bandwidth = width.iloc[-1] if width is not None and not pd.isna(width.iloc[-1]) else None

            results.append({
                "indicator": "Bollinger Bands (20,2)",
                "category": "Volatility",
                "current_value": round(bandwidth, 2) if bandwidth else None,
                "signal": sig,
                "zone": zone,
                "detail": f"Upper=${upper.iloc[-1]:.2f}, Mid=${sma20.iloc[-1]:.2f}, Lower=${lower.iloc[-1]:.2f}, Width={bandwidth:.1f}%" if bandwidth else "N/A",
                "sparkline": close.tail(30).round(2).tolist(),
                "upper_band": round(upper.iloc[-1], 2) if not pd.isna(upper.iloc[-1]) else None,
                "lower_band": round(lower.iloc[-1], 2) if not pd.isna(lower.iloc[-1]) else None,
            })

        # ── ATR ──
        if "atr_14" in ind_list:
            tr = pd.concat([
                high - low,
                (high - close.shift()).abs(),
                (low - close.shift()).abs(),
            ], axis=1).max(axis=1)
            atr = tr.rolling(window=14).mean()
            current_atr = atr.iloc[-1] if not atr.empty else None
            current_price = close.iloc[-1]
            atr_pct = (current_atr / current_price * 100) if current_price and current_atr else None

            if atr_pct and atr_pct > 4:
                sig = "High Volatility — wide stops recommended"
            elif atr_pct and atr_pct > 2:
                sig = "Moderate Volatility — normal conditions"
            else:
                sig = "Low Volatility — tight range, breakout potential"

            results.append({
                "indicator": "ATR (14)",
                "category": "Volatility",
                "current_value": round(current_atr, 2) if current_atr else None,
                "signal": sig,
                "zone": f"{atr_pct:.1f}% of price" if atr_pct else "—",
                "detail": f"ATR(14)=${current_atr:.2f} ({atr_pct:.1f}% of price)" if current_atr else "N/A",
                "sparkline": atr.tail(30).round(2).tolist(),
                "upper_band": None,
                "lower_band": None,
            })

        # ── VWAP ──
        if "vwap" in ind_list and "vwap" in df.columns:
            current_vwap = df["vwap"].iloc[-1] if not df["vwap"].empty else None
            current_price = close.iloc[-1]

            if current_vwap and current_price:
                pct_from = ((current_price - current_vwap) / current_vwap) * 100
                sig = f"Price {pct_from:+.1f}% from VWAP"
            else:
                sig = "VWAP unavailable"

            results.append({
                "indicator": "VWAP",
                "category": "Volume",
                "current_value": round(current_vwap, 2) if current_vwap else None,
                "signal": sig,
                "zone": "Above" if current_price > (current_vwap or 0) else "Below",
                "detail": f"VWAP=${current_vwap:.2f}, Price=${current_price:.2f}" if current_vwap else "N/A",
                "sparkline": df["vwap"].tail(30).round(2).tolist() if "vwap" in df.columns else [],
                "upper_band": None,
                "lower_band": None,
            })

        # ── OBV ──
        if "obv" in ind_list:
            obv = (volume * close.diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))).cumsum()
            obv_sma = obv.rolling(window=20).mean()
            current_obv = obv.iloc[-1] if not obv.empty else None

            if current_obv and not obv_sma.empty:
                if current_obv > obv_sma.iloc[-1]:
                    sig = "OBV above 20-day avg — Buying pressure"
                else:
                    sig = "OBV below 20-day avg — Selling pressure"
            else:
                sig = "—"

            results.append({
                "indicator": "OBV",
                "category": "Volume",
                "current_value": int(current_obv) if current_obv else None,
                "signal": sig,
                "zone": "Accumulation" if current_obv and obv_sma.iloc[-1] and current_obv > obv_sma.iloc[-1] else "Distribution",
                "detail": f"OBV={int(current_obv):,}" if current_obv else "N/A",
                "sparkline": obv.tail(30).tolist(),
                "upper_band": None,
                "lower_band": None,
            })

        # ── Stochastic ──
        if "stoch_14" in ind_list:
            low_14 = low.rolling(window=14).min()
            high_14 = high.rolling(window=14).max()
            k_pct = ((close - low_14) / (high_14 - low_14) * 100)
            d_pct = k_pct.rolling(window=3).mean()

            curr_k = k_pct.iloc[-1] if not k_pct.empty else None
            curr_d = d_pct.iloc[-1] if not d_pct.empty else None

            if curr_k and curr_k > 80:
                sig = "Overbought — %K above 80"
                zone = "Overbought"
            elif curr_k and curr_k < 20:
                sig = "Oversold — %K below 20"
                zone = "Oversold"
            elif curr_k and curr_d and curr_k > curr_d:
                sig = "Bullish — %K above %D"
                zone = "Bullish"
            else:
                sig = "Bearish — %K below %D"
                zone = "Bearish"

            results.append({
                "indicator": "Stochastic (14,3)",
                "category": "Momentum",
                "current_value": round(curr_k, 1) if curr_k else None,
                "signal": sig,
                "zone": zone,
                "detail": f"%K={curr_k:.1f}, %D={curr_d:.1f}" if curr_k and curr_d else "N/A",
                "sparkline": k_pct.tail(30).round(1).tolist(),
                "upper_band": 80,
                "lower_band": 20,
            })

        # ── Summary row: 50/200 SMA Cross Status ──
        if len(close) >= 200:
            sma50 = close.rolling(50).mean().iloc[-1]
            sma200 = close.rolling(200).mean().iloc[-1]
            cross = "Golden Cross" if sma50 > sma200 else "Death Cross"
            results.append({
                "indicator": "50/200 SMA Cross",
                "category": "Regime",
                "current_value": None,
                "signal": f"{cross} — SMA(50)=${sma50:.2f} vs SMA(200)=${sma200:.2f}",
                "zone": cross,
                "detail": f"SMA(50)/SMA(200) = {sma50/sma200:.4f}",
                "sparkline": [],
                "upper_band": None,
                "lower_band": None,
            })

        return results

    except Exception as e:
        logger.error(f"Technical dashboard error for {symbol}: {e}")
        return []

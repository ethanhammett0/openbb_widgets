"""Tab 5: Pairs Lab — Themed charts + formatted outputs.

Pair selection supports two modes:
  - preset:  pair param (e.g. "V_MA") resolved from DEFAULT_PAIRS
  - custom:  leg_a + leg_b params — any two tickers from the universe

All lookback parameters use a single period code (e.g. 1Y, 3M, 90D, YTD).
"""
import json, logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np, pandas as pd
import plotly.graph_objects as go
import data_providers as dp
import pairs_engine as pe
from preloader import cache
from universe import DEFAULT_PAIRS, get_ticker_sub_sector, get_all_tickers, get_sub_sector_tickers, UNIVERSE
from theme import (
    chart_layout, TRACE_COLORS, HEATMAP_CORR, CYAN, BULL, BEAR, WARN,
    fmt_ratio, fmt_zscore, fmt_days, flag_zscore,
    parse_period_param, period_to_trading_days, period_to_dates,
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
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_pair(pair_str: str) -> tuple[str, str]:
    """Parse preset pair string 'V_MA' → ('V', 'MA')."""
    parts = pair_str.split("_")
    return (parts[0], parts[1]) if len(parts) == 2 else ("V", "MA")


def _resolve_legs(
    pair_mode: str,
    pair: str,
    leg_a: str,
    leg_b: str,
) -> tuple[str, str]:
    """Return (ticker_a, ticker_b) based on pair_mode."""
    if pair_mode == "custom":
        return leg_a.strip().upper(), leg_b.strip().upper()
    return _parse_pair(pair)


def _get_cached_prices(ticker: str, lookback_days: int = 504) -> pd.Series:
    """Fetch price series for a ticker over the lookback window."""
    from_d = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    to_d = datetime.now().strftime("%Y-%m-%d")
    try:
        df = dp.get_aggregates(ticker, from_d, to_d)
        if not df.empty:
            prices = df.set_index("date")["close"]
            prices.index = pd.to_datetime(prices.index)
            return prices
    except Exception:
        pass
    return pd.Series(dtype=float)


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.1 — Cointegration Results
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/cointegration_results")
def cointegration_results(
    sub_sector: str = Query("All"),
    pval_threshold: float = Query(0.05, ge=0.001, le=1.0),
    period: str = Query("1Y", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    pair_mode: str = Query("preset", description="preset | custom"),
    leg_a: str = Query("V", description="Leg A ticker (custom mode)"),
    leg_b: str = Query("MA", description="Leg B ticker (custom mode)"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.1 — Cointegration Test Results. Returns raw numeric values."""
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        delta = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
        lookback = max(1, int(delta * 0.69))
    else:
        lookback = period_to_trading_days(period_unit, period_value)
    rows = []

    if pair_mode == "custom":
        pairs_to_test = [(_resolve_legs("custom", "", leg_a, leg_b))]
    else:
        pairs_to_test = DEFAULT_PAIRS
        if sub_sector != "All":
            tickers = get_sub_sector_tickers(sub_sector)
            pairs_to_test = [(a, b) for a, b in DEFAULT_PAIRS if a in tickers or b in tickers]

    for a, b in pairs_to_test:
        try:
            pa = _get_cached_prices(a, lookback)
            pb = _get_cached_prices(b, lookback)
            if pa.empty or pb.empty:
                continue
            coint = pe.test_cointegration(pa, pb)
            hr = pe.kalman_hedge_ratio(pa, pb)
            z = hr.iloc[-1]["z_score"] if not hr.empty else 0
            coint_flag = coint["cointegrated"]

            rows.append({
                "pair": f"{a} / {b}",
                "sub_sector": get_ticker_sub_sector(a),
                "eg_pvalue": round(coint["eg_pvalue"], 4),
                "adf_stat": round(coint["adf_stat"], 3),
                "cointegrated": "Yes" if coint_flag else "No",
                "hedge_ratio": round(hr.iloc[-1]["hedge_ratio"], 4) if not hr.empty else None,
                "z_score": round(z, 2),
            })
        except Exception as e:
            logger.debug(f"Coint error {a}/{b}: {e}")
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.2 — Spread Time Series
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/spread_chart")
def spread_chart(
    pair_mode: str = Query("preset", description="preset | custom"),
    pair: str = Query("V_MA", description="Pre-defined pair key (preset mode)"),
    leg_a: str = Query("PYPL", description="Leg A ticker (custom mode)"),
    leg_b: str = Query("SQ", description="Leg B ticker (custom mode)"),
    period: str = Query("1Y", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    beta_mode: str = Query("kalman"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.2 — Spread Time Series with Bollinger Bands."""
    a, b = _resolve_legs(pair_mode, pair, leg_a, leg_b)
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        delta = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
        lookback = max(1, int(delta * 0.69))
    else:
        lookback = period_to_trading_days(period_unit, period_value)
    try:
        pa = _get_cached_prices(a)
        pb = _get_cached_prices(b)
        if pa.empty or pb.empty:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        hr = pe.kalman_hedge_ratio(pa, pb) if "kalman" in beta_mode else pe._rolling_hedge_ratio(pa, pb)
        if hr.empty:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        hr = hr.tail(lookback)
        if raw:
            return hr.reset_index().to_dict(orient="records")

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=hr.index, y=hr["spread"], mode="lines",
            name=f"{a} / {b} Spread", line=dict(color=CYAN, width=2),
        ))
        rm = hr["spread"].rolling(60).mean()
        rs = hr["spread"].rolling(60).std()
        fig.add_trace(go.Scatter(x=hr.index, y=rm + 2 * rs, mode="lines", name="+2σ",
                                 line=dict(color=BEAR, dash="dash", width=1)))
        fig.add_trace(go.Scatter(x=hr.index, y=rm - 2 * rs, mode="lines", name="-2σ",
                                 line=dict(color=BULL, dash="dash", width=1)))
        fig.add_trace(go.Scatter(x=hr.index, y=rm, mode="lines", name="60D Mean",
                                 line=dict(color="rgba(148,163,184,0.3)", width=1, dash="dot")))
        fig.update_layout(**chart_layout(theme, yaxis_title="Spread"))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e:
        logger.error(f"spread_chart error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.3 — Hedge Ratio Time Series
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/hedge_ratio_chart")
def hedge_ratio_chart(
    pair_mode: str = Query("preset", description="preset | custom"),
    pair: str = Query("V_MA"),
    leg_a: str = Query("PYPL"),
    leg_b: str = Query("SQ"),
    period: str = Query("1Y", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.3 — Hedge Ratio Time Series (Kalman vs Rolling OLS)."""
    a, b = _resolve_legs(pair_mode, pair, leg_a, leg_b)
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        delta = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
        lookback = max(1, int(delta * 0.69))
    else:
        lookback = period_to_trading_days(period_unit, period_value)
    try:
        pa = _get_cached_prices(a)
        pb = _get_cached_prices(b)
        if pa.empty or pb.empty:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        kalman = pe.kalman_hedge_ratio(pa, pb)
        rolling = pe._rolling_hedge_ratio(pa, pb)
        kalman = kalman.tail(lookback)
        rolling = rolling.tail(lookback)
        if kalman.empty:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        if raw:
            return kalman[["hedge_ratio"]].reset_index().to_dict(orient="records")

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=kalman.index, y=kalman["hedge_ratio"],
            mode="lines", name="Kalman Filter (Dynamic)",
            line=dict(color=CYAN, width=2),
        ))
        if not rolling.empty:
            fig.add_trace(go.Scatter(
                x=rolling.index, y=rolling["hedge_ratio"],
                mode="lines", name="Rolling OLS",
                line=dict(color=WARN, width=1.5, dash="dot"),
            ))
        fig.update_layout(**chart_layout(theme, yaxis_title="Hedge Ratio (β)"))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e:
        logger.error(f"hedge_ratio error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.4 — Pair Metrics Summary
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/pair_metrics")
def pair_metrics(
    pair_mode: str = Query("preset", description="preset | custom"),
    pair: str = Query("V_MA"),
    leg_a: str = Query("PYPL"),
    leg_b: str = Query("SQ"),
    period: str = Query("1Y", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    beta_mode: str = Query("kalman"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.4 — Current Pair Metrics Summary (metric tiles)."""
    a, b = _resolve_legs(pair_mode, pair, leg_a, leg_b)
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        delta = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
        lookback = max(1, int(delta * 0.69))
    else:
        lookback = period_to_trading_days(period_unit, period_value)
    try:
        pa = _get_cached_prices(a, lookback)
        pb = _get_cached_prices(b, lookback)
        if pa.empty or pb.empty:
            return []
        hr = pe.kalman_hedge_ratio(pa, pb) if "kalman" in beta_mode else pe._rolling_hedge_ratio(pa, pb)
        coint = pe.test_cointegration(pa, pb)
        if hr.empty:
            return []
        latest = hr.iloc[-1]
        hl = pe.compute_half_life(hr["spread"])
        spreads = hr["z_score"].values
        zero_crosses = np.where(np.diff(np.sign(spreads)))[0]
        days_since = len(spreads) - 1 - zero_crosses[-1] if len(zero_crosses) > 0 else len(spreads)
        corr_60 = pa.tail(60).corr(pb.tail(60)) if len(pa) >= 60 and len(pb) >= 60 else 0
        z_val = latest["z_score"]
        return [
            {"label": f"Pair",                "value": f"{a} / {b}"},
            {"label": "Current Spread",       "value": f"{latest['spread']:.4f}"},
            {"label": "Z-Score",              "value": fmt_zscore(z_val), "delta": flag_zscore(z_val)},
            {"label": "Hedge Ratio",          "value": fmt_ratio(latest["hedge_ratio"])},
            {"label": "Half-Life",            "value": fmt_days(hl)},
            {"label": "Correlation (60D)",    "value": f"{corr_60:.3f}"},
            {"label": "EG p-value",           "value": f"{coint['eg_pvalue']:.4f}"},
            {"label": "Days Since 0-Cross",   "value": str(int(days_since))},
        ]
    except Exception as e:
        logger.error(f"pair_metrics error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.5 — Technical Confirmation
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/technical_confirmation")
def technical_confirmation(
    pair_mode: str = Query("preset", description="preset | custom"),
    pair: str = Query("V_MA"),
    leg_a: str = Query("PYPL"),
    leg_b: str = Query("SQ"),
    period: str = Query("3M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.5 — Technical Confirmation Panel for both pair legs. Returns raw numeric values."""
    period_unit, period_value = parse_period_param(period)
    a, b = _resolve_legs(pair_mode, pair, leg_a, leg_b)
    rows = []
    for ticker in [a, b]:
        row = {"ticker": ticker}
        try:
            rsi = dp.get_rsi(ticker, 14, limit=1)
            row["rsi_14"] = round(rsi[0]['value'], 1) if rsi else None
        except Exception:
            row["rsi_14"] = None
        try:
            macd = dp.get_macd(ticker, limit=1)
            if macd:
                hist = macd[0].get("histogram", 0) or 0
                row["macd_signal"] = "Bullish" if hist > 0 else "Bearish"
            else:
                row["macd_signal"] = None
        except Exception:
            row["macd_signal"] = None
        try:
            sma50 = dp.get_sma(ticker, 50, limit=1)
            sma200 = dp.get_sma(ticker, 200, limit=1)
            snap = dp.get_snapshot_ticker(ticker)
            price = snap.get("day", {}).get("c", 0) or snap.get("lastTrade", {}).get("p", 0)
            row["price_vs_sma50"]  = "Above" if price > (sma50[0]["value"]  if sma50  else 0) else "Below"
            row["price_vs_sma200"] = "Above" if price > (sma200[0]["value"] if sma200 else 0) else "Below"
        except Exception:
            row["price_vs_sma50"] = None
            row["price_vs_sma200"] = None
        rows.append(row)

    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.6 — Correlation Matrix Heatmap
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/covariance_heatmap")
def covariance_heatmap(
    sub_sector: str = Query("All"),
    period: str = Query("1Y", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.6 — Ledoit-Wolf Shrinkage Correlation Matrix Heatmap."""
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        delta = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
        lookback = max(1, int(delta * 0.69))
    else:
        lookback = period_to_trading_days(period_unit, period_value)
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()[:20]
    rets = cache.get_multi_returns(tickers)
    if rets.empty:
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
    try:
        _, corr = pe.compute_covariance_matrix(rets)
        if corr.empty:
            return []
        if raw:
            return corr.reset_index().to_dict(orient="records")
        fig = go.Figure(go.Heatmap(
            z=corr.values,
            x=corr.columns.tolist(),
            y=corr.index.tolist(),
            colorscale=HEATMAP_CORR, zmid=0, zmin=-1, zmax=1,
            hovertemplate="<b>%{y}</b> vs <b>%{x}</b><br>ρ = %{z:.3f}<extra></extra>",
            colorbar=dict(tickfont=dict(size=9, color="#94A3B8"), outlinewidth=0),
        ))
        fig.update_layout(**chart_layout(
            theme,
            margin=dict(l=80, r=60, t=10, b=80),
            height=max(400, len(corr) * 22),
        ))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e:
        logger.error(f"cov_heatmap error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.7 — Normalized Price Chart
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/normalized_price_chart")
def normalized_price_chart(
    pair_mode: str = Query("preset"),
    pair: str = Query("V_MA"),
    leg_a: str = Query("PYPL"),
    leg_b: str = Query("SQ"),
    period: str = Query("1Y", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.7 — Normalized Price Chart (both legs normalized to 100 at start)."""
    a, b = _resolve_legs(pair_mode, pair, leg_a, leg_b)
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        delta = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
        lookback = max(1, int(delta * 0.69))
    else:
        lookback = period_to_trading_days(period_unit, period_value)
    try:
        pa = _get_cached_prices(a, lookback)
        pb = _get_cached_prices(b, lookback)
        if pa.empty or pb.empty:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

        # Normalize to 100 at start
        pa_norm = pa / pa.iloc[0] * 100
        pb_norm = pb / pb.iloc[0] * 100

        if raw:
            result = []
            for idx in pa.index:
                result.append({
                    "date": idx.strftime("%Y-%m-%d"),
                    "ticker_a": a,
                    "normalized_a": round(pa_norm.loc[idx], 2),
                    "ticker_b": b,
                    "normalized_b": round(pb_norm.loc[idx], 2),
                })
            return result

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=pa_norm.index, y=pa_norm.values,
            mode="lines", name=a,
            line=dict(color=CYAN, width=2),
        ))
        fig.add_trace(go.Scatter(
            x=pb_norm.index, y=pb_norm.values,
            mode="lines", name=b,
            line=dict(color=WARN, width=2),
        ))

        fig.update_layout(**chart_layout(theme, yaxis_title="Normalized Price (100=start)"))
        return JSONResponse(content=json.loads(fig.to_json()))

    except Exception as e:
        logger.error(f"normalized_price_chart error: {e}")
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))


# ─────────────────────────────────────────────────────────────────────────────
# Widget 5.8 — RSI Divergence Chart
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/rsi_divergence_chart")
def rsi_divergence_chart(
    pair_mode: str = Query("preset"),
    pair: str = Query("V_MA"),
    leg_a: str = Query("PYPL"),
    leg_b: str = Query("SQ"),
    period: str = Query("3M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 5.8 — RSI Divergence Chart (RSI(14) for both legs with overbought/oversold bands)."""
    period_unit, period_value = parse_period_param(period)
    a, b = _resolve_legs(pair_mode, pair, leg_a, leg_b)
    try:
        # Get RSI for both legs (returns list of dicts with timestamp and value, ordered desc)
        rsi_a_list = dp.get_rsi(a, window=14, limit=200)
        rsi_b_list = dp.get_rsi(b, window=14, limit=200)

        if not rsi_a_list or not rsi_b_list:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

        # Convert to DataFrames and reverse to chronological order
        df_rsi_a = pd.DataFrame(rsi_a_list).rename(columns={"value": a})
        df_rsi_b = pd.DataFrame(rsi_b_list).rename(columns={"value": b})

        # Parse timestamps
        df_rsi_a["date"] = pd.to_datetime(df_rsi_a["timestamp"]).dt.date
        df_rsi_b["date"] = pd.to_datetime(df_rsi_b["timestamp"]).dt.date

        # Set index and sort chronologically
        df_rsi_a = df_rsi_a.set_index("date")[[a]].sort_index()
        df_rsi_b = df_rsi_b.set_index("date")[[b]].sort_index()

        # Merge on date
        df_merged = pd.concat([df_rsi_a, df_rsi_b], axis=1).dropna()

        if df_merged.empty:
            return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

        if raw:
            result = []
            for date, row in df_merged.iterrows():
                result.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "ticker_a": a,
                    "rsi_a": round(row[a], 1),
                    "ticker_b": b,
                    "rsi_b": round(row[b], 1),
                })
            return result

        fig = go.Figure()

        # RSI lines
        fig.add_trace(go.Scatter(
            x=df_merged.index, y=df_merged[a].values,
            mode="lines", name=f"{a} RSI(14)",
            line=dict(color=CYAN, width=2),
        ))
        fig.add_trace(go.Scatter(
            x=df_merged.index, y=df_merged[b].values,
            mode="lines", name=f"{b} RSI(14)",
            line=dict(color=WARN, width=2),
        ))

        # Overbought/oversold bands
        fig.add_hline(y=70, line_dash="dash", line_color="rgba(255, 69, 0, 0.5)", annotation_text="Overbought (70)")
        fig.add_hline(y=30, line_dash="dash", line_color="rgba(34, 139, 34, 0.5)", annotation_text="Oversold (30)")

        # Shaded band 30-70
        fig.add_vrect(
            x0=df_merged.index[0], x1=df_merged.index[-1],
            y0=30, y1=70,
            fillcolor="rgba(128, 128, 128, 0.1)", layer="below", line_width=0,
        )

        fig.update_layout(
            **chart_layout(theme, yaxis_title="RSI(14)"),
            yaxis=dict(range=[0, 100]),
        )

        return JSONResponse(content=json.loads(fig.to_json()))

    except Exception as e:
        logger.error(f"rsi_divergence_chart error: {e}")
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

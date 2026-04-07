"""Tab 3: Return Attribution — Themed charts + formatted outputs."""
import json, logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np, pandas as pd
import plotly.graph_objects as go

import beta_engine as be
import attribution as attr
from preloader import cache
from universe import get_all_tickers, get_ticker_sub_sector, get_sub_sector_tickers, FACTOR_NAMES, UNIVERSE
from theme import (chart_layout, TRACE_COLORS, BULL, BEAR, BLUE, CYAN,
                   fmt_pct, fmt_beta,
                   bbg_color_pct, BBG_NEUTRAL,
                   parse_period_param, period_to_dates, period_label)

# Helper for multi-select parameters
def _parse_multi(param: str, all_values: list) -> list:
    """Parse comma-separated multi-select params. Return all_values if empty or 'all'."""
    if not param or param.strip().lower() == "all":
        return all_values
    return [v.strip() for v in param.split(",") if v.strip()]

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/attribution_waterfall")
def attribution_waterfall(
    symbol: str = Query("PYPL"),
    period: str = Query("1M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    beta_mode: str = Query("kalman"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 3.1 — Single Stock Return Attribution Waterfall."""
    period_unit, period_value = parse_period_param(period)
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    if custom_range and start_date and end_date:
        p_start, p_end = start_date, end_date
    else:
        p_start, p_end = period_to_dates(period_unit, period_value)
    try:
        stock_ret = cache.get_returns(symbol)
        if stock_ret.empty: return []
        betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode)
        decomp = attr.decompose_return(stock_ret, cache.factor_matrix, betas, p_start, p_end)
        contributions = decomp["contributions"]
        if raw:
            return {k: round(v*100, 2) for k, v in contributions.items()} | {
                "idiosyncratic": round(decomp["idiosyncratic"]*100, 2),
                "total": round(decomp["total_return"]*100, 2)}

        labels = list(contributions.keys()) + ["Idiosyncratic", "Total"]
        values = list(contributions.values()) + [decomp["idiosyncratic"], decomp["total_return"]]
        measures = ["relative"] * len(contributions) + ["relative", "total"]

        fig = go.Figure(go.Waterfall(
            x=labels, y=[v * 100 for v in values], measure=measures,
            connector_line_color="rgba(148,163,184,0.15)",
            increasing_marker_color=BULL, decreasing_marker_color=BEAR,
            totals_marker_color=BLUE,
            hovertemplate="<b>%{x}</b><br>%{y:+.2f}%<extra></extra>",
        ))
        fig.update_layout(**chart_layout(theme, yaxis_title="Return (%)",
            margin=dict(l=50, r=20, t=10, b=80), xaxis=dict(tickangle=-45,
            gridcolor="rgba(148,163,184,0.08)", tickfont=dict(size=9, color="#94A3B8"))))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e:
        logger.error(f"attribution_waterfall error: {e}"); return []


@router.get("/rolling_attribution")
def rolling_attribution(
    symbol: str = Query("PYPL"),
    period: str = Query("3M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    beta_mode: str = Query("kalman"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 3.2 — Rolling Attribution Time Series (stacked area)."""
    period_unit, period_value = parse_period_param(period)
    from theme import period_to_trading_days
    if custom_range and start_date and end_date:
        delta = (datetime.strptime(end_date, "%Y-%m-%d") - datetime.strptime(start_date, "%Y-%m-%d")).days
        lookback = max(1, int(delta * 0.69))
    else:
        lookback = period_to_trading_days(period_unit, period_value)
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    try:
        stock_ret = cache.get_returns(symbol)
        if stock_ret.empty: return []
        betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode)
        roll = attr.rolling_attribution(stock_ret, cache.factor_matrix, betas, window=lookback)
        if raw or roll.empty:
            return roll.reset_index().to_dict(orient="records") if not roll.empty else []

        fig = go.Figure()
        for i, col in enumerate(roll.columns):
            fig.add_trace(go.Scatter(
                x=roll.index, y=roll[col]*100, mode="lines", stackgroup="one",
                name=col, line=dict(width=0.5, color=TRACE_COLORS[i % len(TRACE_COLORS)]),
            ))
        fig.update_layout(**chart_layout(theme, yaxis_title="Daily Contrib (%)"))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e:
        logger.error(f"rolling_attribution error: {e}"); return []


@router.get("/subsector_attribution")
def subsector_attribution(
    period: str = Query("1M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    beta_mode: str = Query("kalman"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 3.3 — Sub-Sector Return Attribution Table. Returns raw numeric values."""
    period_unit, period_value = parse_period_param(period)
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    if custom_range and start_date and end_date:
        p_start, p_end = start_date, end_date
    else:
        p_start, p_end = period_to_dates(period_unit, period_value)
    rows = []
    try:
        for sector, tickers in UNIVERSE.items():
            if sector == "Benchmark ETFs": continue
            decomps = []
            for t in tickers[:3]:
                stock_ret = cache.get_returns(t)
                if stock_ret.empty: continue
                betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode)
                d = attr.decompose_return(stock_ret, cache.factor_matrix, betas, p_start, p_end)
                decomps.append(d)
            if not decomps: continue
            row = {"sub_sector": sector}
            row["total_return"] = round(np.mean([d["total_return"] for d in decomps])*100, 2)
            for f in FACTOR_NAMES:
                row[f"{f}_contrib"] = round(np.mean([d["contributions"].get(f, 0) for d in decomps])*100, 2)
            row["idiosyncratic"] = round(np.mean([d["idiosyncratic"] for d in decomps])*100, 2)
            row["r_squared"] = round(np.mean([d["r_squared"] for d in decomps]), 3)
            rows.append(row)
    except Exception as e:
        logger.error(f"subsector_attribution error: {e}")
    return rows


@router.get("/attribution_scatter")
def attribution_scatter(
    period: str = Query("1M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    beta_mode: str = Query("kalman"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 3.4 — Cross-Sectional Attribution Scatter."""
    period_unit, period_value = parse_period_param(period)
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    if custom_range and start_date and end_date:
        p_start, p_end = start_date, end_date
    else:
        p_start, p_end = period_to_dates(period_unit, period_value)
    points = []
    try:
        for t in get_all_tickers()[:30]:
            stock_ret = cache.get_returns(t)
            if stock_ret.empty: continue
            betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode)
            d = attr.decompose_return(stock_ret, cache.factor_matrix, betas, p_start, p_end)
            fe = d["total_return"] - d["idiosyncratic"]
            points.append({"ticker": t, "sub_sector": get_ticker_sub_sector(t),
                "factor_explained": round(fe*100, 2), "total_return": round(d["total_return"]*100, 2)})
        if raw or not points: return points

        df = pd.DataFrame(points)
        fig = go.Figure()
        for i, sector in enumerate(df["sub_sector"].unique()):
            m = df["sub_sector"]==sector
            fig.add_trace(go.Scatter(
                x=df.loc[m,"factor_explained"], y=df.loc[m,"total_return"],
                mode="markers+text", text=df.loc[m,"ticker"], textposition="top center",
                textfont=dict(family="Arial Black, sans-serif", size=10, color="#E2E8F0"), name=sector,
                marker=dict(size=9, opacity=0.85, line=dict(width=1, color="rgba(0,0,0,0.3)"),
                           color=TRACE_COLORS[i % len(TRACE_COLORS)]),
                hovertemplate="<b>%{text}</b><br>Factor: %{x:+.1f}%<br>Total: %{y:+.1f}%<extra></extra>"))
        rng = [min(df["factor_explained"].min(), df["total_return"].min())-2,
               max(df["factor_explained"].max(), df["total_return"].max())+2]
        fig.add_trace(go.Scatter(x=rng, y=rng, mode="lines",
            line=dict(dash="dash", color="rgba(148,163,184,0.2)", width=1), showlegend=False))
        fig.update_layout(**chart_layout(theme, xaxis_title="Factor Return (%)", yaxis_title="Total Return (%)",
            margin=dict(l=50, r=20, t=10, b=50)))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e:
        logger.error(f"attribution_scatter error: {e}"); return []


@router.get("/attribution_summary")
def attribution_summary(
    period: str = Query("1M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    sub_sector: str = Query("All"),
    beta_mode: str = Query("kalman"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 3.5 — Attribution Summary Metrics Table. Returns raw numeric values."""
    period_unit, period_value = parse_period_param(period)
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    if custom_range and start_date and end_date:
        p_start, p_end = start_date, end_date
    else:
        p_start, p_end = period_to_dates(period_unit, period_value)
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    tickers = tickers[:30]
    rows = []
    try:
        for t in tickers:
            stock_ret = cache.get_returns(t)
            if stock_ret.empty: continue
            betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode)
            d = attr.decompose_return(stock_ret, cache.factor_matrix, betas, p_start, p_end)
            fe = d["total_return"] - d["idiosyncratic"]
            r_sq = d["r_squared"]

            rows.append({
                "ticker": t, "sub_sector": get_ticker_sub_sector(t),
                "total_return": round(d["total_return"]*100, 2),
                "factor_explained": round(fe*100, 2),
                "idiosyncratic": round(d["idiosyncratic"]*100, 2),
                "r_squared": round(r_sq, 3),
            })
    except Exception as e:
        logger.error(f"attribution_summary error: {e}")
    rows.sort(key=lambda r: abs(r["idiosyncratic"]), reverse=True)
    return rows

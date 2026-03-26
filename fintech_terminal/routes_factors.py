"""Tab 2: Factor Monitor — Themed charts + formatted outputs."""
import json, logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np, pandas as pd
import plotly.graph_objects as go

import beta_engine as be
from preloader import cache
from universe import get_all_tickers, get_ticker_sub_sector, get_sub_sector_tickers, FACTOR_NAMES, UNIVERSE
from theme import (chart_layout, TRACE_COLORS, HEATMAP_FACTOR, BULL, BEAR, CYAN, PURPLE,
                   fmt_beta, fmt_zscore, flag_zscore)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/factor_heatmap")
def factor_heatmap(sub_sector:str=Query("All"), beta_mode:str=Query("kalman"),
                   lookback:int=Query(90, ge=10, le=504), theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 2.1 — Factor Exposure Heatmap."""
    if cache.factor_matrix is None or cache.factor_matrix.empty:
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    tickers = tickers[:15]
    rows_data = []
    for t in tickers:
        stock_ret = cache.get_returns(t)
        if stock_ret.empty: continue
        try:
            betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode, window=lookback)
            if betas:
                row = {"ticker": t, "sub_sector": get_ticker_sub_sector(t)}
                row.update({f: round(betas.get(f, 0), 3) for f in FACTOR_NAMES})
                rows_data.append(row)
        except Exception as e:
            logger.warning(f"Heatmap skip {t}: {e}")

    if raw or not rows_data: return rows_data or []

    tickers_list = [r["ticker"] for r in rows_data]
    z_values = [[r.get(f, 0) for f in FACTOR_NAMES] for r in rows_data]

    fig = go.Figure(data=go.Heatmap(
        z=z_values, x=FACTOR_NAMES, y=tickers_list,
        colorscale=HEATMAP_FACTOR, zmid=0,
        hovertemplate="<b>%{y}</b><br>%{x}: %{z:.3f}<extra></extra>",
        colorbar=dict(tickfont=dict(size=9, color="#94A3B8"), outlinewidth=0),
    ))
    fig.update_layout(**chart_layout(theme, margin=dict(l=80, r=60, t=10, b=60),
                       height=max(400, len(tickers_list) * 24)))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/factor_bar")
def factor_bar(symbol:str=Query("PYPL"), beta_mode:str=Query("kalman"),
               lookback:int=Query(90, ge=10, le=504), theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 2.2 — Single Stock Factor Exposure Bar Chart."""
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    stock_ret = cache.get_returns(symbol)
    if stock_ret.empty: return []
    try:
        betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode, window=lookback)
    except Exception as e:
        logger.error(f"factor_bar error: {e}"); return []
    if not betas: return []

    if raw:
        return [{"factor": f, "beta": fmt_beta(betas.get(f, 0))} for f in FACTOR_NAMES]

    factors = list(betas.keys())
    values = [round(v, 3) for v in betas.values()]
    colors = [BEAR if v < 0 else BULL for v in values]

    fig = go.Figure(go.Bar(x=values, y=factors, orientation="h", marker_color=colors,
        marker_line=dict(width=0), hovertemplate="<b>%{y}</b>: %{x:.3f}<extra></extra>"))
    fig.update_layout(**chart_layout(theme, margin=dict(l=130, r=20, t=10, b=30)))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/factor_drift")
def factor_drift(symbol:str=Query("PYPL"), factor:str=Query("Mkt-RF"),
                 beta_mode:str=Query("kalman"), lookback:int=Query(252, ge=10, le=504),
                 theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 2.3 — Factor Exposure Drift Time Series."""
    if cache.factor_matrix is None or cache.factor_matrix.empty:
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
    stock_ret = cache.get_returns(symbol)
    if stock_ret.empty:
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
    try:
        ts = be.estimate_betas_timeseries(stock_ret, cache.factor_matrix, mode=beta_mode, window=lookback)
    except Exception as e:
        logger.error(f"factor_drift error: {e}"); return []
    if ts.empty or factor not in ts.columns:
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))

    if raw:
        return [{"date": str(d.date()), "beta": fmt_beta(v)} for d, v in ts[factor].dropna().items()]

    series = ts[factor].dropna()
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=series.index, y=series.values, mode="lines",
        line=dict(color=CYAN, width=2), name=f"{factor} β",
        fill="tozeroy", fillcolor="rgba(0,212,170,0.08)"))
    # Zero line
    fig.add_hline(y=0, line=dict(color="rgba(148,163,184,0.3)", dash="dot", width=1))
    fig.update_layout(**chart_layout(theme, yaxis_title="Beta"))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/factor_zscore_alerts")
def factor_zscore_alerts(beta_mode:str=Query("kalman"), lookback:int=Query(90, ge=10, le=504),
                         sub_sector:str=Query("All"), z_threshold:float=Query(1.5, ge=0.5, le=3.0)):
    """Widget 2.4 — Factor Exposure Z-Score Alert Table."""
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    tickers = tickers[:15]
    rows = []
    for t in tickers:
        stock_ret = cache.get_returns(t)
        if stock_ret.empty: continue
        try:
            betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode, window=lookback)
            ts = be.estimate_betas_timeseries(stock_ret, cache.factor_matrix, mode=beta_mode, window=lookback)
            zscores = be.compute_beta_zscore(betas, ts, lookback=252)
            for f_name, z in zscores.items():
                if abs(z) >= z_threshold:
                    mean_1yr = ts[f_name].tail(252).mean() if f_name in ts.columns else 0
                    rows.append({
                        "ticker": t, "sub_sector": get_ticker_sub_sector(t), "factor": f_name,
                        "current_beta": fmt_beta(betas.get(f_name, 0)),
                        "mean_beta_1yr": fmt_beta(mean_1yr),
                        "z_score": fmt_zscore(z),
                        "flag": flag_zscore(z),
                    })
        except Exception as e:
            logger.warning(f"zscore skip {t}: {e}")
    rows.sort(key=lambda r: abs(float(r["z_score"])), reverse=True)
    return rows


@router.get("/subsector_factor_exposure")
def subsector_factor_exposure(beta_mode:str=Query("kalman"), lookback:int=Query(90, ge=10, le=504)):
    """Widget 2.5 — Sub-Sector Average Factor Exposure Table."""
    if cache.factor_matrix is None or cache.factor_matrix.empty: return []
    rows = []
    for sector_name, sector_tickers in UNIVERSE.items():
        if sector_name == "Benchmark ETFs": continue
        sector_betas = {f: [] for f in FACTOR_NAMES}
        for t in sector_tickers[:3]:
            stock_ret = cache.get_returns(t)
            if stock_ret.empty: continue
            try:
                betas = be.estimate_betas(stock_ret, cache.factor_matrix, mode=beta_mode, window=lookback)
                for f in FACTOR_NAMES:
                    if f in betas: sector_betas[f].append(betas[f])
            except: pass
        row = {"sub_sector": sector_name}
        for f in FACTOR_NAMES:
            vals = sector_betas[f]
            row[f] = fmt_beta(np.mean(vals)) if vals else "—"
        rows.append(row)
    return rows

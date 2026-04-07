"""Tab 4: Group Performance — Themed charts + formatted outputs."""
import json, logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np, pandas as pd
import plotly.graph_objects as go
from preloader import cache
from universe import get_all_tickers, get_ticker_sub_sector, UNIVERSE
from theme import (
    chart_layout, TRACE_COLORS, HEATMAP_PERFORMANCE, BULL, BEAR, CYAN,
    fmt_pct, fmt_beta,
    bbg_color_pct,
    period_to_dates, period_label, parse_period_param,
)

# Helper for multi-select parameters
def _parse_multi(param: str, all_values: list) -> list:
    """Parse comma-separated multi-select params. Return all_values if empty or 'all'."""
    if not param or param.strip().lower() == "all":
        return all_values
    return [v.strip() for v in param.split(",") if v.strip()]

router = APIRouter()
logger = logging.getLogger(__name__)


def _subsector_returns(start_date_str: str):
    """Compute sub-sector returns from a start date to now."""
    results = {}
    for sector, tickers in UNIVERSE.items():
        if sector == "Benchmark ETFs":
            continue
        rets = []
        for t in tickers:
            r = cache.get_returns(t)
            if not r.empty:
                try:
                    rp = r.loc[start_date_str:]
                    cum = (1 + rp).prod() - 1 if len(rp) > 0 else 0
                    rets.append({"ticker": t, "return": cum})
                except Exception:
                    pass
        results[sector] = rets
    return results


@router.get("/subsector_perf_heatmap")
def subsector_perf_heatmap(
    period: str = Query("6M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 4.1 — Sub-Sector Performance Heatmap across multiple fixed horizons."""
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        end_date_str = end_date
    else:
        _, end_date_str = period_to_dates(period_unit, period_value)
    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")

    horizons = [("1D", 1), ("1W", 7), ("1M", 30), ("3M", 90), ("6M", 180)]
    sectors = [s for s in UNIVERSE if s != "Benchmark ETFs"]
    z_vals = []
    horizon_labels = [h[0] for h in horizons]

    for sector in sectors:
        row = []
        for label, days in horizons:
            h_start = (end_dt - timedelta(days=days)).strftime("%Y-%m-%d")
            rets = []
            for t in UNIVERSE[sector]:
                r = cache.get_returns(t)
                if not r.empty:
                    try:
                        rp = r.loc[h_start:]
                        rets.append((1 + rp).prod() - 1 if len(rp) > 0 else 0)
                    except Exception:
                        pass
            row.append(round(np.mean(rets) * 100, 2) if rets else 0)
        z_vals.append(row)

    if raw:
        out = []
        for s, r in zip(sectors, z_vals):
            row_dict = {"sub_sector": s}
            for i, h in enumerate(horizon_labels):
                row_dict[h] = r[i]
            out.append(row_dict)
        return out

    fig = go.Figure(go.Heatmap(
        z=z_vals, x=horizon_labels, y=sectors,
        colorscale=HEATMAP_PERFORMANCE, zmid=0,
        hovertemplate="<b>%{y}</b><br>%{x}: %{z:+.2f}%<extra></extra>",
        colorbar=dict(ticksuffix="%", tickfont=dict(size=9, color="#94A3B8"), outlinewidth=0),
    ))
    fig.update_layout(**chart_layout(theme, margin=dict(l=170, r=60, t=10, b=40)))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/subsector_perf_bar")
def subsector_perf_bar(
    period: str = Query("1M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 4.2 — Sub-Sector Performance Bar Chart. Returns raw numeric values."""
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        p_start = start_date
    else:
        p_start, _ = period_to_dates(period_unit, period_value)
    sr = _subsector_returns(p_start)

    bars = []
    for sector, rets in sr.items():
        if rets:
            avg = np.mean([r["return"] for r in rets]) * 100
            bars.append({
                "sub_sector": sector,
                "return": round(avg, 2),
            })
    bars.sort(key=lambda x: x["return"], reverse=True)

    if raw or not bars:
        return bars

    fig = go.Figure(go.Bar(
        x=[b["sub_sector"] for b in bars],
        y=[b["return"] for b in bars],
        marker_color=[BULL if b["return"] >= 0 else BEAR for b in bars],
        marker_line=dict(width=0),
        hovertemplate="<b>%{x}</b><br>%{y:+.2f}%<extra></extra>",
    ))
    fig.update_layout(**chart_layout(
        theme, yaxis_title="Return (%)",
        margin=dict(l=50, r=20, t=10, b=110),
        xaxis=dict(tickangle=-45, gridcolor="rgba(148,163,184,0.08)",
                   tickfont=dict(size=9, color="#94A3B8")),
    ))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/intra_subsector_dispersion")
def intra_subsector_dispersion(
    period: str = Query("1M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 4.3 — Intra-Sub-Sector Dispersion Table. Returns raw numeric values."""
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        p_start = start_date
    else:
        p_start, _ = period_to_dates(period_unit, period_value)
    sr = _subsector_returns(p_start)

    rows = []
    for sector, rets in sr.items():
        if len(rets) < 2:
            continue
        returns = [r["return"] * 100 for r in rets]
        tickers_r = [(r["ticker"], r["return"] * 100) for r in rets]
        tickers_r.sort(key=lambda x: x[1], reverse=True)
        disp = np.std(returns)
        ew = np.mean(returns)

        rows.append({
            "sub_sector": sector,
            "best_ticker": tickers_r[0][0],
            "best_return": round(tickers_r[0][1], 2),
            "worst_ticker": tickers_r[-1][0],
            "worst_return": round(tickers_r[-1][1], 2),
            "ew_return": round(ew, 2),
            "dispersion": round(disp, 2),
        })
    rows.sort(key=lambda r: r["dispersion"], reverse=True)
    return rows


@router.get("/universe_scatter")
def universe_scatter(
    period_x: str = Query("1M", description="Period code for X axis (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    period_y: str = Query("3M", description="Period code for Y axis (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    theme: str = Query("dark"),
    raw: bool = Query(False),
):
    """Widget 4.4 — Universe Performance Scatter (X = short-term, Y = longer-term)."""
    period_unit_x, period_value_x = parse_period_param(period_x)
    period_unit_y, period_value_y = parse_period_param(period_y)
    px_start, _ = period_to_dates(period_unit_x, period_value_x)
    py_start, _ = period_to_dates(period_unit_y, period_value_y)

    points = []
    for t in get_all_tickers():
        r = cache.get_returns(t)
        if r.empty:
            continue
        try:
            r_x = (1 + r.loc[px_start:]).prod() - 1
            r_y = (1 + r.loc[py_start:]).prod() - 1
            points.append({
                "ticker": t,
                "sub_sector": get_ticker_sub_sector(t),
                "return_x": round(r_x * 100, 2),
                "return_y": round(r_y * 100, 2),
            })
        except Exception:
            pass

    if raw or not points:
        return points

    df = pd.DataFrame(points)
    x_label = f"{period_label(period_unit_x, period_value_x)} Return (%)"
    y_label = f"{period_label(period_unit_y, period_value_y)} Return (%)"

    fig = go.Figure()
    for i, sec in enumerate(df["sub_sector"].unique()):
        m = df["sub_sector"] == sec
        fig.add_trace(go.Scatter(
            x=df.loc[m, "return_x"], y=df.loc[m, "return_y"],
            mode="markers+text", text=df.loc[m, "ticker"],
            textposition="top center",
            textfont=dict(family="Arial Black, sans-serif", size=10, color="#E2E8F0"),
            name=sec,
            marker=dict(size=9, opacity=0.85, color=TRACE_COLORS[i % len(TRACE_COLORS)],
                        line=dict(width=1, color="rgba(0,0,0,0.3)")),
            hovertemplate="<b>%{text}</b><br>X: %{x:+.1f}%<br>Y: %{y:+.1f}%<extra></extra>",
        ))
    fig.update_layout(**chart_layout(
        theme, xaxis_title=x_label, yaxis_title=y_label,
        margin=dict(l=50, r=20, t=10, b=50),
    ))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/rolling_momentum")
def rolling_momentum(
    period: str = Query("6M", description="Period code (1D,7D,30D,60D,90D,180D,1M,3M,6M,9M,12M,1Y,2Y,3Y,5Y,10Y,YTD)"),
    custom_range: bool = Query(False, description="Use custom date range instead of period"),
    start_date: str = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Custom end date (YYYY-MM-DD)"),
):
    """Widget 4.5 — Rolling Sub-Sector Momentum Table across 1M/3M/6M horizons. Returns raw numeric values."""
    period_unit, period_value = parse_period_param(period)
    if custom_range and start_date and end_date:
        end_date_str = end_date
    else:
        _, end_date_str = period_to_dates(period_unit, period_value)
    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d")
    horizons = [("1M", 30), ("3M", 90), ("6M", 180)]

    rows = []
    for sector, tickers in UNIVERSE.items():
        if sector == "Benchmark ETFs":
            continue
        row = {"sub_sector": sector}
        for lbl, days in horizons:
            ps = (end_dt - timedelta(days=days)).strftime("%Y-%m-%d")
            rets = []
            for t in tickers:
                r = cache.get_returns(t)
                if not r.empty:
                    try:
                        rp = r.loc[ps:]
                        rets.append((1 + rp).prod() - 1 if len(rp) > 0 else 0)
                    except Exception:
                        pass
            avg = np.mean(rets) * 100 if rets else None
            row[f"{lbl}_return"] = round(avg, 2) if avg is not None else None
        rows.append(row)
    return rows

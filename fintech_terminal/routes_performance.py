"""Tab 4: Group Performance — Themed charts + formatted outputs."""
import json, logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np, pandas as pd
import plotly.graph_objects as go
from preloader import cache
from universe import get_all_tickers, get_ticker_sub_sector, UNIVERSE
from theme import (chart_layout, TRACE_COLORS, HEATMAP_PERFORMANCE, BULL, BEAR, CYAN,
                   fmt_pct, fmt_beta)

router = APIRouter()
logger = logging.getLogger(__name__)


def _subsector_returns(start_date_str: str):
    """Compute sub-sector returns from a start date to now."""
    results = {}
    for sector, tickers in UNIVERSE.items():
        if sector == "Benchmark ETFs": continue
        rets = []
        for t in tickers:
            r = cache.get_returns(t)
            if not r.empty:
                try:
                    rp = r.loc[start_date_str:]
                    cum = (1+rp).prod()-1 if len(rp)>0 else 0
                    rets.append({"ticker":t,"return":cum})
                except: pass
        results[sector] = rets
    return results


@router.get("/subsector_perf_heatmap")
def subsector_perf_heatmap(start_date:str=Query(None, description="YYYY-MM-DD"),
                           end_date:str=Query(None, description="YYYY-MM-DD"),
                           theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 4.1 — Sub-Sector Performance Heatmap.

    Computes returns across multiple horizons (1d, 1w, 1m, 3m, 6m) relative to end_date.
    The start_date param sets the longest horizon boundary.
    """
    today = datetime.now()
    end_dt = datetime.strptime(end_date, "%Y-%m-%d") if end_date else today
    # Fixed horizon labels computed backward from end_date
    horizons = [
        ("1d", 1), ("1w", 7), ("1m", 30), ("3m", 90), ("6m", 180),
    ]
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
                        rets.append((1+rp).prod()-1 if len(rp)>0 else 0)
                    except: pass
            row.append(round(np.mean(rets)*100,2) if rets else 0)
        z_vals.append(row)
    if raw:
        out = []
        for s, r in zip(sectors, z_vals):
            row_dict = {"sub_sector": s}
            for i, h in enumerate(horizon_labels):
                row_dict[h] = fmt_pct(r[i])
            out.append(row_dict)
        return out
    fig = go.Figure(go.Heatmap(z=z_vals, x=horizon_labels, y=sectors,
        colorscale=HEATMAP_PERFORMANCE, zmid=0,
        hovertemplate="<b>%{y}</b><br>%{x}: %{z:+.2f}%<extra></extra>",
        colorbar=dict(ticksuffix="%", tickfont=dict(size=9, color="#94A3B8"), outlinewidth=0)))
    fig.update_layout(**chart_layout(theme, margin=dict(l=170, r=60, t=10, b=40)))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/subsector_perf_bar")
def subsector_perf_bar(start_date:str=Query(None, description="YYYY-MM-DD"),
                       end_date:str=Query(None, description="YYYY-MM-DD"),
                       theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 4.2 — Sub-Sector Performance Bar Chart."""
    today = datetime.now()
    p_start = start_date or (today - timedelta(days=30)).strftime("%Y-%m-%d")
    sr = _subsector_returns(p_start)
    bars = []
    for sector, rets in sr.items():
        if rets:
            avg = np.mean([r["return"] for r in rets])*100
            bars.append({"sub_sector":sector,"return_raw":avg,"return":fmt_pct(avg)})
    bars.sort(key=lambda x:x["return_raw"], reverse=True)
    if raw or not bars: return bars
    fig = go.Figure(go.Bar(
        x=[b["sub_sector"] for b in bars], y=[b["return_raw"] for b in bars],
        marker_color=[BULL if b["return_raw"]>=0 else BEAR for b in bars],
        marker_line=dict(width=0),
        hovertemplate="<b>%{x}</b><br>%{y:+.2f}%<extra></extra>"))
    fig.update_layout(**chart_layout(theme, yaxis_title="Return (%)",
        margin=dict(l=50, r=20, t=10, b=110),
        xaxis=dict(tickangle=-45, gridcolor="rgba(148,163,184,0.08)",
                   tickfont=dict(size=9, color="#94A3B8"))))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/intra_subsector_dispersion")
def intra_subsector_dispersion(start_date:str=Query(None, description="YYYY-MM-DD"),
                               end_date:str=Query(None, description="YYYY-MM-DD")):
    """Widget 4.3 — Intra-Sub-Sector Dispersion Table."""
    today = datetime.now()
    p_start = start_date or (today - timedelta(days=30)).strftime("%Y-%m-%d")
    sr = _subsector_returns(p_start)
    rows = []
    for sector, rets in sr.items():
        if len(rets)<2: continue
        returns = [r["return"]*100 for r in rets]
        tickers_r = [(r["ticker"],r["return"]*100) for r in rets]
        tickers_r.sort(key=lambda x:x[1], reverse=True)
        disp = np.std(returns)
        rows.append({
            "sub_sector":sector,
            "best_ticker": tickers_r[0][0], "best_return": fmt_pct(tickers_r[0][1]),
            "worst_ticker": tickers_r[-1][0], "worst_return": fmt_pct(tickers_r[-1][1]),
            "ew_return": fmt_pct(np.mean(returns)),
            "dispersion": f"{disp:.2f}%",
            "flag": "🟡" if disp > 10 else "",
        })
    rows.sort(key=lambda r: float(r["dispersion"].replace("%","")), reverse=True)
    return rows


@router.get("/universe_scatter")
def universe_scatter(start_date_x:str=Query(None, description="YYYY-MM-DD (X axis start)"),
                     start_date_y:str=Query(None, description="YYYY-MM-DD (Y axis start)"),
                     end_date:str=Query(None, description="YYYY-MM-DD"),
                     theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 4.4 — Universe Performance Scatter."""
    today = datetime.now()
    px = start_date_x or (today - timedelta(days=30)).strftime("%Y-%m-%d")
    py = start_date_y or (today - timedelta(days=90)).strftime("%Y-%m-%d")
    points = []
    for t in get_all_tickers():
        r = cache.get_returns(t)
        if r.empty: continue
        try:
            r_x = (1+r.loc[px:]).prod()-1
            r_y = (1+r.loc[py:]).prod()-1
            points.append({"ticker":t, "sub_sector":get_ticker_sub_sector(t),
                "return_x":round(r_x*100,2), "return_y":round(r_y*100,2)})
        except: pass
    if raw or not points: return points
    df = pd.DataFrame(points)
    fig = go.Figure()
    for i, sec in enumerate(df["sub_sector"].unique()):
        m = df["sub_sector"]==sec
        fig.add_trace(go.Scatter(x=df.loc[m,"return_x"], y=df.loc[m,"return_y"],
            mode="markers+text", text=df.loc[m,"ticker"], textposition="top center",
            textfont=dict(family="Arial Black, sans-serif", size=10, color="#E2E8F0"), name=sec,
            marker=dict(size=9, opacity=0.85, color=TRACE_COLORS[i%len(TRACE_COLORS)],
                       line=dict(width=1, color="rgba(0,0,0,0.3)")),
            hovertemplate="<b>%{text}</b><br>X: %{x:+.1f}%<br>Y: %{y:+.1f}%<extra></extra>"))
    fig.update_layout(**chart_layout(theme, xaxis_title="Short-Term Return (%)",
        yaxis_title="Long-Term Return (%)", margin=dict(l=50, r=20, t=10, b=50)))
    return JSONResponse(content=json.loads(fig.to_json()))


@router.get("/rolling_momentum")
def rolling_momentum(start_date:str=Query(None, description="YYYY-MM-DD"),
                     end_date:str=Query(None, description="YYYY-MM-DD")):
    """Widget 4.5 — Rolling Sub-Sector Momentum Table.

    Computes momentum across fixed horizons (1m, 3m, 6m) backward from end_date.
    """
    today = datetime.now()
    end_dt = datetime.strptime(end_date, "%Y-%m-%d") if end_date else today
    horizons = [("1m", 30), ("3m", 90), ("6m", 180)]
    rows = []
    for sector, tickers in UNIVERSE.items():
        if sector == "Benchmark ETFs": continue
        row = {"sub_sector": sector}
        for lbl, days in horizons:
            ps = (end_dt - timedelta(days=days)).strftime("%Y-%m-%d")
            rets = []
            for t in tickers:
                r = cache.get_returns(t)
                if not r.empty:
                    try:
                        rp = r.loc[ps:]
                        rets.append((1+rp).prod()-1 if len(rp)>0 else 0)
                    except: pass
            row[f"{lbl}_return"] = fmt_pct(np.mean(rets)*100) if rets else "—"
        rows.append(row)
    return rows

import json, re
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from data_loader import df_deals as _deals, df_props as _props

router = APIRouter(tags=["Markets Monitor"])


def _load():
    if _deals is None or _props is None:
        raise HTTPException(500, "HRE data not loaded")
    return _deals.copy(), _props.copy()


def _metric_cfg(m):
    m = m.lower().strip()
    cfg = {
        "spread":     ("Spread_bps",  "Spread (bps)",    ""),
        "ltv":        ("LTV",         "LTV (%)",         ".0%"),
        "cap_rate":   ("Cap_Rate",    "Cap Rate (%)",    ".2%"),
        "ltc":        ("LTC",         "LTC (%)",         ".0%"),
        "debt_yield": ("Debt_Yield",  "Debt Yield (%)",  ".2%"),
        "dscr":       ("DSCR",        "DSCR (x)",        ".2f"),
    }
    return cfg.get(m, (m, m, ""))


def _dark_layout(**kw):
    base = dict(
        template="plotly_dark",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#e0e0e0", family="Inter, sans-serif"),
        margin=dict(l=50, r=20, t=50, b=30),
    )
    base.update(kw)
    return base


def _wquantile(values, weights, q):
    df = pd.DataFrame({"v": values, "w": weights}).sort_values("v")
    df["cs"] = df["w"].cumsum() / df["w"].sum()
    m = df[df["cs"] >= q]
    return m["v"].iloc[0] if not m.empty else values.iloc[-1]


# ── /deals/list ───────────────────────────────────────────────────────────────
@router.get("/deals/list")
def deals_list():
    df, _ = _load()
    return [{"label": r["Deal_Name"], "value": r["Deal_ID"]}
            for _, r in df[["Deal_Name", "Deal_ID"]].iterrows()]


# ── /distribution ─────────────────────────────────────────────────────────────
@router.get("/distribution")
def distribution(
    start_date: str = Query(...), end_date: str = Query(...),
    interval: str = Query("3 month"), deal_type: Optional[str] = Query(None),
    metric: str = Query("spread"), is_weighted: bool = Query(False),
):
    df, df_p = _load()
    df["Closing_Date"] = pd.to_datetime(df["Closing_Date"])
    flt = df[(df["Closing_Date"] >= start_date) & (df["Closing_Date"] <= end_date)].copy()
    if deal_type and deal_type.strip():
        flt = flt[flt["Deal_Type"].str.lower() == deal_type.lower()]
    if flt.empty:
        return json.loads(go.Figure().to_json())

    y_col, y_label, y_fmt = _metric_cfg(metric)
    if metric.lower() == "cap_rate":
        flt = pd.merge(flt, df_p, on="Deal_ID")
    title_y = y_label

    freq_map = {"1 month": "ME", "3 month": "3ME", "6 month": "6ME", "9 month": "9ME", "12 month": "12ME"}
    freq = freq_map.get(" ".join(interval.lower().split()), "3ME")
    months = int(re.search(r"\d+", freq).group()) if re.search(r"\d+", freq) else 3

    x_data, y_data = [], []
    w_q1, w_med, w_q3, w_lo, w_hi = [], [], [], [], []

    for name, grp in flt.groupby(pd.Grouper(key="Closing_Date", freq=freq)):
        if grp.empty or not isinstance(name, pd.Timestamp):
            continue
        s = (name - pd.DateOffset(months=months - 1)).replace(day=1)
        lbl = f"{s.strftime('%b %Y')} - {name.strftime('%b %Y')}"
        g = grp.dropna(subset=[y_col])
        if g.empty:
            continue
        if is_weighted:
            vals, wts = g[y_col], g.get("Aggregate_Loan_Amount", pd.Series(np.ones(len(g))))
            x_data.append(lbl)
            w_q1.append(_wquantile(vals, wts, .25))
            w_med.append(_wquantile(vals, wts, .50))
            w_q3.append(_wquantile(vals, wts, .75))
            w_lo.append(vals.min()); w_hi.append(vals.max())
        else:
            for v in g[y_col]:
                x_data.append(lbl); y_data.append(v)

    if not x_data:
        return json.loads(go.Figure().to_json())

    color = "#00bdd6"
    fig = go.Figure()
    kw = dict(name=y_label, marker_color=color, line=dict(color=color, width=1.5),
              fillcolor="rgba(0,189,214,0.15)", width=0.5)
    if is_weighted:
        fig.add_trace(go.Box(x=x_data, q1=w_q1, median=w_med, q3=w_q3,
                             lowerfence=w_lo, upperfence=w_hi, **kw))
    else:
        fig.add_trace(go.Box(x=x_data, y=y_data, boxpoints="outliers",
                             jitter=0.2, pointpos=-1.8, **kw))

    fig.update_layout(**_dark_layout(
        title=dict(text=f"<b>{title_y} Distribution</b> | {interval}", font=dict(size=18, color="white"), x=0.01),
        xaxis=dict(type="category", showgrid=False, tickfont=dict(color="#a0a0a0", size=11)),
        yaxis=dict(tickfont=dict(color="#a0a0a0", size=11), gridcolor="rgba(255,255,255,0.05)", tickformat=y_fmt),
        showlegend=False,
    ))
    return json.loads(fig.to_json())


# ── /scatter ──────────────────────────────────────────────────────────────────
@router.get("/scatter")
def scatter(
    start_date: str = Query(...), end_date: str = Query(...),
    x_metric: str = Query(...), y_metric: str = Query(...),
    deal_type: Optional[str] = Query(None),
    maturity_start: Optional[str] = Query(None), maturity_end: Optional[str] = Query(None),
    highlight_deal: Optional[str] = Query(None), is_weighted: bool = Query(False),
):
    df, _ = _load()
    df["Closing_Date"] = pd.to_datetime(df["Closing_Date"])
    flt = df[(df["Closing_Date"] >= start_date) & (df["Closing_Date"] <= end_date)].copy()
    if maturity_start and maturity_end:
        flt["Maturity_Date"] = pd.to_datetime(flt["Maturity_Date"])
        flt = flt[(flt["Maturity_Date"] >= maturity_start) & (flt["Maturity_Date"] <= maturity_end)]
    if deal_type and deal_type.strip() and deal_type.lower() != "all types":
        flt = flt[flt["Deal_Type"].str.lower() == deal_type.lower()]
    if flt.empty:
        return json.loads(go.Figure().to_json())

    x_col, x_lbl, x_fmt = _metric_cfg(x_metric)
    y_col, y_lbl, y_fmt = _metric_cfg(y_metric)
    if x_col not in flt.columns or y_col not in flt.columns:
        return json.loads(go.Figure().to_json())

    if is_weighted and "Aggregate_Valuation" in flt.columns:
        vals = flt["Aggregate_Valuation"]
        mn, mx = vals.min(), vals.max()
        flt["_sz"] = 8 if mx == mn else 6 + ((vals - mn) / (mx - mn)) * 24
    else:
        flt["_sz"] = 8

    fig = go.Figure()
    main_g = flt[flt["Deal_ID"] != highlight_deal] if highlight_deal else flt
    hi_g   = flt[flt["Deal_ID"] == highlight_deal] if highlight_deal else pd.DataFrame()

    fig.add_trace(go.Scatter(
        x=main_g[x_col], y=main_g[y_col], mode="markers", name="Market",
        text=main_g["Deal_Name"],
        hovertemplate=f"<b>%{{text}}</b><br>{x_lbl}: %{{x:{x_fmt}}}<br>{y_lbl}: %{{y:{y_fmt}}}<extra></extra>",
        marker=dict(color="#00bdd6", size=main_g["_sz"], opacity=0.6,
                    line=dict(width=1, color="rgba(255,255,255,0.2)")),
    ))
    if not hi_g.empty:
        fig.add_trace(go.Scatter(
            x=hi_g[x_col], y=hi_g[y_col], mode="markers", name="Selected Deal",
            text=hi_g["Deal_Name"],
            hovertemplate=f"<b>%{{text}}</b><br>{x_lbl}: %{{x:{x_fmt}}}<br>{y_lbl}: %{{y:{y_fmt}}}<extra></extra>",
            marker=dict(color="#FF9F1C", size=hi_g["_sz"].iloc[0] * 1.5 if is_weighted else 16,
                        line=dict(width=2, color="white")),
        ))

    fig.update_layout(**_dark_layout(
        title=dict(text=f"<b>{y_lbl} vs {x_lbl}</b>", font=dict(size=18, color="white"), x=0.01),
        xaxis=dict(title=x_lbl, tickfont=dict(color="#a0a0a0"), gridcolor="rgba(255,255,255,0.05)", tickformat=x_fmt),
        yaxis=dict(title=y_lbl, tickfont=dict(color="#a0a0a0"), gridcolor="rgba(255,255,255,0.05)", tickformat=y_fmt),
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    ))
    return json.loads(fig.to_json())


# ── /raincloud ────────────────────────────────────────────────────────────────
@router.get("/raincloud")
def raincloud(
    start_date: str = Query(...), end_date: str = Query(...),
    deal_type: Optional[str] = Query(None), metric: str = Query("spread"),
    highlight_deal: Optional[str] = Query(None),
    maturity_start: Optional[str] = Query(None), maturity_end: Optional[str] = Query(None),
):
    df, df_p = _load()
    df["Closing_Date"] = pd.to_datetime(df["Closing_Date"])
    flt = df[(df["Closing_Date"] >= start_date) & (df["Closing_Date"] <= end_date)].copy()
    if deal_type and deal_type.strip():
        flt = flt[flt["Deal_Type"].str.lower() == deal_type.lower()]
    if flt.empty:
        return json.loads(go.Figure().to_json())

    y_col, y_lbl, y_fmt = _metric_cfg(metric)
    if metric.lower() == "cap_rate" and "Cap_Rate" not in flt.columns:
        flt = pd.merge(flt, df_p, on="Deal_ID")
    if y_col not in flt.columns:
        return json.loads(go.Figure().to_json())

    valid = flt.dropna(subset=[y_col])
    values = valid[y_col]
    names  = valid.get("Deal_Name", pd.Series(["Deal"] * len(valid)))
    ids    = valid.get("Deal_ID",   pd.Series([""] * len(valid)))

    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, vertical_spacing=0.02,
                        row_heights=[0.45, 0.15, 0.40], print_grid=False)
    color = "#00bdd6"

    fig.add_trace(go.Violin(x=values, y=[""] * len(values), side="positive", orientation="h",
                            points=False, box_visible=False, line_color=color,
                            fillcolor="rgba(0,189,214,0.3)", width=3, name="Distribution",
                            hoverinfo="skip", showlegend=False), row=1, col=1)

    fig.add_trace(go.Box(x=values, y=[""] * len(values), orientation="h", name="Quartiles",
                         boxpoints=False, marker_color=color, line=dict(color=color, width=1.5),
                         fillcolor="rgba(0,189,214,0.1)", showlegend=False,
                         hovertemplate="<b>Market Stats</b><br>Median: %{median}<br>Q1: %{q1}<br>Q3: %{q3}<extra></extra>",
                         ), row=2, col=1)

    ry = np.random.uniform(-0.5, 0.5, len(values))
    fig.add_trace(go.Scatter(x=values, y=ry, mode="markers", name="Deals",
                             marker=dict(size=5, color=color, opacity=0.6),
                             showlegend=False, text=names, customdata=ids,
                             hovertemplate=f"<b>%{{text}}</b><br>{y_lbl}: <b>%{{x:{y_fmt}}}</b><extra></extra>",
                             ), row=3, col=1)

    if highlight_deal:
        m = valid[valid["Deal_ID"] == highlight_deal]
        if not m.empty:
            val = m.iloc[0][y_col]
            h_name = m.iloc[0]["Deal_Name"]
            fig.add_shape(type="line", x0=val, x1=val, y0=0, y1=1,
                          xref="x", yref="paper", line=dict(color="#FF9F1C", width=3))
            fig.add_trace(go.Scatter(x=[val], y=[0], mode="markers",
                                     marker=dict(color="#FF9F1C", size=12, line=dict(width=2, color="white")),
                                     name="Selection", showlegend=False), row=3, col=1)
            fig.add_annotation(x=val, y=1, xref="x", yref="paper",
                                text=f"<b>{h_name}</b><br>{val:.2f}", showarrow=True,
                                font=dict(color="#FF9F1C", size=11),
                                bgcolor="#1a1a1a", bordercolor="#FF9F1C", borderpad=4)

    fig.update_layout(**_dark_layout(
        title=dict(text=f"<b>{y_lbl} Raincloud</b>", font=dict(size=18, color="white"), x=0.01, y=0.98),
        margin=dict(l=20, r=20, t=50, b=40), hovermode="closest",
    ))
    for r in [1, 2]:
        fig.update_xaxes(showgrid=False, zeroline=False, showticklabels=False, row=r, col=1)
        fig.update_yaxes(showgrid=False, zeroline=False, showticklabels=False, row=r, col=1)
    fig.update_xaxes(title=y_lbl, tickfont=dict(color="#a0a0a0", size=10),
                     showgrid=True, gridcolor="rgba(255,255,255,0.05)", row=3, col=1)
    fig.update_yaxes(showgrid=False, zeroline=False, showticklabels=False, range=[-1, 1], row=3, col=1)
    return json.loads(fig.to_json())


# ── /radar ────────────────────────────────────────────────────────────────────
@router.get("/radar")
def radar(
    start_date: str = Query(...), end_date: str = Query(...),
    deal_type: Optional[str] = Query(None),
    metrics: str = Query(...), highlight_deal: Optional[str] = Query(None),
):
    df, df_p = _load()
    df["Closing_Date"] = pd.to_datetime(df["Closing_Date"])
    flt = df[(df["Closing_Date"] >= start_date) & (df["Closing_Date"] <= end_date)].copy()
    if deal_type and deal_type.strip() and deal_type.lower() != "all types":
        flt = flt[flt["Deal_Type"].str.lower() == deal_type.lower()]
    if flt.empty:
        return json.loads(go.Figure().to_json())

    sel = [m.strip() for m in metrics.split(",") if m.strip()][:8]
    src = pd.merge(flt, df_p, on="Deal_ID") if any("cap_rate" in m for m in sel) else flt

    h_deal = src[src["Deal_ID"] == highlight_deal] if highlight_deal else pd.DataFrame()

    cats, mkt_scores, deal_scores = [], [], []

    for m in sel:
        col, lbl, _ = _metric_cfg(m)
        if col not in src.columns:
            continue
        vals    = src[col].dropna()
        mn, mx  = vals.min(), vals.max()
        rng     = mx - mn if mx != mn else 1
        mkt_med = vals.median()
        mkt_s   = float((mkt_med - mn) / rng * 100)
        cats.append(lbl)
        mkt_scores.append(mkt_s)
        if not h_deal.empty and col in h_deal.columns:
            dv = h_deal.iloc[0][col]
            deal_scores.append(float((dv - mn) / rng * 100))
        else:
            deal_scores.append(None)

    if not cats:
        return json.loads(go.Figure().to_json())

    cats_closed = cats + [cats[0]]
    mkt_closed  = mkt_scores + [mkt_scores[0]]
    deal_closed = deal_scores + [deal_scores[0]] if any(v is not None for v in deal_scores) else None

    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(r=mkt_closed, theta=cats_closed, fill="toself",
                                  name="Market Median", line_color="#00bdd6",
                                  fillcolor="rgba(0,189,214,0.2)"))
    if deal_closed and any(v is not None for v in deal_closed):
        fig.add_trace(go.Scatterpolar(r=deal_closed, theta=cats_closed, fill="toself",
                                      name="Selected Deal", line_color="#FF9F1C",
                                      fillcolor="rgba(255,159,28,0.2)"))
    fig.update_layout(**_dark_layout(
        polar=dict(bgcolor="rgba(0,0,0,0)",
                   radialaxis=dict(visible=True, range=[0, 100], gridcolor="rgba(255,255,255,0.1)"),
                   angularaxis=dict(gridcolor="rgba(255,255,255,0.1)")),
        showlegend=True,
        title=dict(text="<b>Deal vs Market Radar</b>", font=dict(size=18, color="white"), x=0.01),
    ))
    return json.loads(fig.to_json())

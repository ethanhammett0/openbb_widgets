"""
Unified HRE Dashboard — Consolidates markets_monitor, portfolio_review,
form_widgets, and sharepoint_widget into one multi-page OpenBB backend.
"""

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps
import pandas as pd
import numpy as np
import asyncio
import base64
import json
import csv
import os

app = FastAPI(title="Unified HRE Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.resolve()
DATA_DIR = BASE_DIR / ".." / "dummy_data"
PDF_DIR = BASE_DIR / ".." / "sharepoint_widget" / "dummy_pdf"

# CSV persistence (form widgets)
CSV_FILE = BASE_DIR / "sfs_pipeline_log.csv"
TRANCHE_FILE = BASE_DIR / "tranches_log.csv"
ASSET_FILE = BASE_DIR / "realestate_assets.csv"
ACCOUNTS_FILE = BASE_DIR / "involved_accounts.csv"

# ── Widget Registry (for form widgets) ───────────────────────────────────────
FORM_WIDGETS = {}


def register_widget(widget_config):
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        endpoint = widget_config.get("endpoint")
        if endpoint:
            if "widgetId" not in widget_config:
                widget_config["widgetId"] = endpoint
            widget_id = widget_config["widgetId"]
            FORM_WIDGETS[widget_id] = widget_config

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# ── Data Loading ─────────────────────────────────────────────────────────────
def load_deals_props():
    deals_path = DATA_DIR / "hre_deals.csv"
    props_path = DATA_DIR / "hre_properties.csv"
    if not deals_path.exists() or not props_path.exists():
        raise HTTPException(status_code=500, detail="Data files not found")
    return pd.read_csv(deals_path), pd.read_csv(props_path)


def load_all_data():
    try:
        deals = pd.read_csv(DATA_DIR / "hre_deals.csv")
        props = pd.read_csv(DATA_DIR / "hre_properties.csv")
        rent_roll = pd.read_csv(DATA_DIR / "hre_rent_roll.csv")
        return deals, props, rent_roll
    except FileNotFoundError:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()


deals_df, props_df, rent_roll_df = load_all_data()


# ══════════════════════════════════════════════════════════════════════════════
# CONFIG ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/widgets.json")
def get_widgets():
    with open(BASE_DIR / "widgets.json", "r") as f:
        static_widgets = json.load(f)
    # Merge form widgets registered via decorator
    static_widgets.update(FORM_WIDGETS)
    return static_widgets


@app.get("/apps.json")
def get_apps():
    with open(BASE_DIR / "apps.json", "r") as f:
        return json.load(f)


@app.get("/")
def root():
    return {"info": "Unified HRE Dashboard", "docs": "/docs"}


# ══════════════════════════════════════════════════════════════════════════════
# MARKETS MONITOR ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

def calculate_weighted_quantile(values, weights, quantile):
    try:
        df = pd.DataFrame({"val": values, "wt": weights}).sort_values("val")
        df["cumsum_wt"] = df["wt"].cumsum()
        df["norm_cumsum"] = df["cumsum_wt"] / df["wt"].sum()
        match = df[df["norm_cumsum"] >= quantile]
        if match.empty:
            return values.iloc[-1]
        return match["val"].iloc[0]
    except Exception:
        return np.percentile(values, quantile * 100)


@app.get("/distribution")
def get_distribution(
    start_date: str = Query(...),
    end_date: str = Query(...),
    interval: str = Query("3 month"),
    deal_type: Optional[str] = Query(None),
    metric: str = Query("spread"),
    is_weighted: bool = Query(False),
):
    try:
        import plotly.graph_objects as go
        import re

        df_deals, df_props = load_deals_props()
        df_deals["Closing_Date"] = pd.to_datetime(df_deals["Closing_Date"])

        mask = (df_deals["Closing_Date"] >= pd.to_datetime(start_date)) & (
            df_deals["Closing_Date"] <= pd.to_datetime(end_date)
        )
        filtered_deals = df_deals.loc[mask].copy()

        if deal_type and deal_type.strip():
            filtered_deals = filtered_deals[
                filtered_deals["Deal_Type"].str.lower() == deal_type.lower()
            ]

        if filtered_deals.empty:
            return json.loads(go.Figure().to_json())

        y_col, y_label, title_y, y_tick_format, weight_col = "", "", "", "", "Aggregate_Valuation"
        box_color = "#00bdd6"
        data_source = filtered_deals

        if metric.lower() == "spread":
            y_col, y_label, title_y = "Spread_bps", "Spread (bps)", "Spread (bps)"
            weight_col = "Aggregate_Loan_Amount"
        elif metric.lower() == "ltv":
            y_col, y_label, title_y, y_tick_format = "LTV", "LTV (%)", "LTV", ".0%"
        elif metric.lower() == "cap_rate":
            merged = pd.merge(filtered_deals, df_props, on="Deal_ID")
            data_source = merged
            y_col, y_label, title_y = "Cap_Rate", "Cap Rate (%)", "Cap Rate"
            weight_col, y_tick_format = "Appraised_Value", ".2%"
        else:
            raise HTTPException(status_code=400, detail="Invalid metric")

        interval_map = {"1 month": "ME", "3 month": "3ME", "6 month": "6ME", "9 month": "9ME", "12 month": "12ME"}
        clean_interval = " ".join(interval.lower().split())
        freq = interval_map.get(clean_interval)
        if not freq:
            parts = clean_interval.split()
            freq = f"{parts[0]}ME" if len(parts) > 0 and parts[0].isdigit() else "3ME"

        if "Closing_Date" not in data_source.columns:
            return json.loads(go.Figure().to_json())

        grouped = data_source.groupby(pd.Grouper(key="Closing_Date", freq=freq))
        x_data, y_data = [], []
        w_q1, w_median, w_q3, w_lower, w_upper = [], [], [], [], []

        months = 1 if freq == "ME" else int(re.search(r"\d+", freq).group()) if re.search(r"\d+", freq) else 3

        for name, group in grouped:
            if not group.empty and y_col in group:
                end_d = name
                if not isinstance(end_d, pd.Timestamp):
                    continue
                start_d = (end_d - pd.DateOffset(months=months - 1)).replace(day=1)
                label = f"{start_d.strftime('%b %Y')} - {end_d.strftime('%b %Y')}"
                valid_group = group.dropna(subset=[y_col])
                if valid_group.empty:
                    continue

                if is_weighted:
                    vals = valid_group[y_col]
                    wts = valid_group[weight_col] if weight_col in valid_group else pd.Series(np.ones(len(vals)))
                    x_data.append(label)
                    w_q1.append(calculate_weighted_quantile(vals, wts, 0.25))
                    w_median.append(calculate_weighted_quantile(vals, wts, 0.50))
                    w_q3.append(calculate_weighted_quantile(vals, wts, 0.75))
                    w_lower.append(vals.min())
                    w_upper.append(vals.max())
                else:
                    for val in valid_group[y_col]:
                        x_data.append(label)
                        y_data.append(val)

        fig = go.Figure()
        if not x_data:
            return json.loads(go.Figure().to_json())

        trace_params = dict(
            name=y_label,
            marker_color=box_color,
            line=dict(color=box_color, width=1.5),
            fillcolor="rgba(0,189,214,0.15)",
            width=0.5,
        )

        if is_weighted:
            fig.add_trace(go.Box(x=x_data, q1=w_q1, median=w_median, q3=w_q3,
                                 lowerfence=w_lower, upperfence=w_upper, **trace_params,
                                 hovertemplate="<b>%{x}</b><br>" + f"{y_label} (Weighted Median): " + "%{median:" + y_tick_format + "}<br><extra></extra>"))
            weighted_text = " (Weighted)"
        else:
            fig.add_trace(go.Box(x=x_data, y=y_data, boxpoints="outliers", jitter=0.2, pointpos=-1.8, **trace_params,
                                 hovertemplate="<b>%{x}</b><br>" + f"{y_label}: " + "%{y:" + y_tick_format + "}<br><extra></extra>"))
            weighted_text = ""

        fig.update_layout(
            title=dict(text=f"<b>{title_y} Distribution{weighted_text}</b> | {interval}", font=dict(size=18, family="Inter, sans-serif", color="white"), x=0.01, y=0.95),
            xaxis=dict(type="category", tickangle=0, showgrid=False, tickfont=dict(color="#a0a0a0", size=11), automargin=True),
            yaxis=dict(tickfont=dict(color="#a0a0a0", size=11), gridcolor="rgba(255,255,255,0.05)", tickformat=y_tick_format),
            template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#e0e0e0"), showlegend=False, margin=dict(l=50, r=20, t=30, b=30), boxgap=0.3, boxgroupgap=0.1,
        )
        return json.loads(fig.to_json())
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/deals/list")
def get_deals_list():
    try:
        df_deals, _ = load_deals_props()
        return [{"label": d["Deal_Name"], "value": d["Deal_ID"]} for d in df_deals[["Deal_Name", "Deal_ID"]].to_dict(orient="records")]
    except Exception:
        return []


def get_metric_config(metric_name):
    m = metric_name.lower().strip()
    configs = {
        "spread": ("Spread_bps", "Spread (bps)", ""),
        "ltv": ("LTV", "LTV (%)", ".0%"),
        "cap_rate": ("Cap_Rate", "Cap Rate (%)", ".2%"),
        "ltc": ("LTC", "LTC (%)", ".0%"),
        "debt_yield": ("Debt_Yield", "Debt Yield (%)", ".2%"),
        "dscr": ("DSCR", "DSCR (x)", ".2f"),
    }
    return configs.get(m, (metric_name, metric_name, ""))


@app.get("/scatter")
def get_scatter(
    start_date: str = Query(...),
    end_date: str = Query(...),
    maturity_start: Optional[str] = Query(None),
    maturity_end: Optional[str] = Query(None),
    x_metric: str = Query(...),
    y_metric: str = Query(...),
    deal_type: Optional[str] = Query(None),
    highlight_deal: Optional[str] = Query(None),
    is_weighted: bool = Query(False),
):
    try:
        import plotly.graph_objects as go

        df_deals, _ = load_deals_props()
        df = df_deals.copy()
        df["Closing_Date"] = pd.to_datetime(df["Closing_Date"])
        mask = (df["Closing_Date"] >= pd.to_datetime(start_date)) & (df["Closing_Date"] <= pd.to_datetime(end_date))
        filtered = df.loc[mask].copy()

        if maturity_start and maturity_end:
            filtered["Maturity_Date"] = pd.to_datetime(filtered["Maturity_Date"])
            m_mask = (filtered["Maturity_Date"] >= pd.to_datetime(maturity_start)) & (filtered["Maturity_Date"] <= pd.to_datetime(maturity_end))
            filtered = filtered.loc[m_mask]

        if deal_type and deal_type.strip() and deal_type.lower() != "all types":
            filtered = filtered[filtered["Deal_Type"].str.lower() == deal_type.lower()]

        if filtered.empty:
            return json.loads(go.Figure().to_json())

        x_col, x_label, x_fmt = get_metric_config(x_metric)
        y_col, y_label, y_fmt = get_metric_config(y_metric)

        if x_col not in filtered.columns or y_col not in filtered.columns:
            return json.loads(go.Figure().to_json())

        fig = go.Figure()

        if is_weighted and "Aggregate_Valuation" in filtered.columns:
            vals = filtered["Aggregate_Valuation"]
            min_v, max_v = vals.min(), vals.max()
            sizes = np.full(len(vals), 12) if max_v == min_v else 6 + ((vals - min_v) / (max_v - min_v)) * 24
            filtered["marker_size"] = sizes
        else:
            filtered["marker_size"] = 8

        if highlight_deal:
            highlighted = filtered[filtered["Deal_ID"] == highlight_deal]
            main_group = filtered[filtered["Deal_ID"] != highlight_deal]
        else:
            main_group = filtered
            highlighted = pd.DataFrame()

        fig.add_trace(go.Scatter(
            x=main_group[x_col], y=main_group[y_col], mode="markers", name="Market",
            text=main_group["Deal_Name"],
            hovertemplate=f"<b>%{{text}}</b><br>{x_label}: %{{x:{x_fmt}}}<br>{y_label}: %{{y:{y_fmt}}}<br><extra></extra>",
            marker=dict(color="#00bdd6", size=main_group["marker_size"], opacity=0.6, line=dict(width=1, color="rgba(255,255,255,0.2)")),
        ))

        if not highlighted.empty:
            h_size = highlighted["marker_size"].iloc[0] * 1.5 if is_weighted else 16
            fig.add_trace(go.Scatter(
                x=highlighted[x_col], y=highlighted[y_col], mode="markers", name="Selected Deal",
                text=highlighted["Deal_Name"],
                hovertemplate=f"<b>%{{text}}</b><br>{x_label}: %{{x:{x_fmt}}}<br>{y_label}: %{{y:{y_fmt}}}<br><extra></extra>",
                marker=dict(color="#FF9F1C", size=h_size, symbol="circle", line=dict(width=2, color="white")),
            ))

        fig.update_layout(
            title=dict(text=f"<b>{y_label} vs {x_label}</b>", font=dict(size=18, color="white"), x=0.01, y=0.95),
            xaxis=dict(title=dict(text=x_label, font=dict(color="#a0a0a0")), tickfont=dict(color="#a0a0a0", size=11), gridcolor="rgba(255,255,255,0.05)", tickformat=x_fmt, zeroline=False),
            yaxis=dict(title=dict(text=y_label, font=dict(color="#a0a0a0")), tickfont=dict(color="#a0a0a0", size=11), gridcolor="rgba(255,255,255,0.05)", tickformat=y_fmt, zeroline=False),
            template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#e0e0e0"), showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=50, r=20, t=50, b=30),
        )
        return json.loads(fig.to_json())
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/raincloud")
def get_raincloud(
    start_date: str = Query(...),
    end_date: str = Query(...),
    maturity_start: Optional[str] = Query(None),
    maturity_end: Optional[str] = Query(None),
    deal_type: Optional[str] = Query(None),
    metric: str = Query("spread"),
    highlight_deal: Optional[str] = Query(None),
):
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots

        df_deals, df_props = load_deals_props()
        df_deals["Closing_Date"] = pd.to_datetime(df_deals["Closing_Date"])
        mask = (df_deals["Closing_Date"] >= pd.to_datetime(start_date)) & (df_deals["Closing_Date"] <= pd.to_datetime(end_date))
        filtered = df_deals.loc[mask].copy()

        if deal_type and deal_type.strip():
            filtered = filtered[filtered["Deal_Type"].str.lower() == deal_type.lower()]
        if filtered.empty:
            return json.loads(go.Figure().to_json())

        y_col, y_label, y_fmt = get_metric_config(metric)

        if metric.lower() == "cap_rate" and "Cap_Rate" not in filtered.columns:
            data_source = pd.merge(filtered, df_props, on="Deal_ID")
        else:
            data_source = filtered

        if y_col not in data_source.columns:
            return json.loads(go.Figure().to_json())

        valid_data = data_source.dropna(subset=[y_col])
        values = valid_data[y_col]
        deal_names = valid_data["Deal_Name"] if "Deal_Name" in valid_data.columns else ["Deal"] * len(values)
        deal_ids = valid_data["Deal_ID"] if "Deal_ID" in valid_data.columns else [""] * len(values)

        fig = make_subplots(rows=3, cols=1, shared_xaxes=True, vertical_spacing=0.02, row_heights=[0.45, 0.15, 0.40], print_grid=False)
        color = "#00bdd6"

        fig.add_trace(go.Violin(x=values, y=[""] * len(values), side="positive", orientation="h", points=False, box_visible=False, line_color=color, fillcolor="rgba(0,189,214,0.3)", width=3, name="Distribution", hoverinfo="skip", showlegend=False), row=1, col=1)
        fig.add_trace(go.Box(x=values, y=[""] * len(values), orientation="h", name="Quartiles", boxpoints=False, marker_color=color, line=dict(color=color, width=1.5), fillcolor="rgba(0,189,214,0.1)", showlegend=False), row=2, col=1)

        random_y = np.random.uniform(low=-0.5, high=0.5, size=len(values))
        fig.add_trace(go.Scatter(x=values, y=random_y, mode="markers", name="Deals", marker=dict(size=5, color=color, opacity=0.6), showlegend=False, text=deal_names, customdata=deal_ids, hovertemplate=f"<b>%{{text}}</b><br>{y_label}: <b>%{{x:{y_fmt}}}</b><br><extra></extra>"), row=3, col=1)

        if highlight_deal:
            match = valid_data[valid_data["Deal_ID"] == highlight_deal]
            if not match.empty:
                val = match.iloc[0][y_col]
                fig.add_shape(type="line", x0=val, x1=val, y0=0, y1=1, xref="x", yref="paper", line=dict(color="#FF9F1C", width=3))
                fig.add_trace(go.Scatter(x=[val], y=[0], mode="markers", marker=dict(color="#FF9F1C", size=12, line=dict(width=2, color="white")), name="Selection", hoverinfo="skip", showlegend=False), row=3, col=1)
                fig.add_annotation(x=val, y=1, xref="x", yref="paper", text=f"<b>Selected</b><br>{val:.2f}", showarrow=True, arrowhead=2, ax=0, ay=-25, font=dict(color="#FF9F1C", size=11), bgcolor="#1a1a1a", bordercolor="#FF9F1C", borderwidth=1, borderpad=4)

        fig.update_layout(
            title=dict(text=f"<b>{y_label} Raincloud</b>", font=dict(size=18, color="white"), x=0.01, y=0.98),
            template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#e0e0e0"), margin=dict(l=20, r=20, t=50, b=40), hovermode="closest",
        )
        fig.update_xaxes(showgrid=False, zeroline=False, showticklabels=False, row=1, col=1)
        fig.update_yaxes(showgrid=False, zeroline=False, showticklabels=False, row=1, col=1)
        fig.update_xaxes(showgrid=False, zeroline=False, showticklabels=False, row=2, col=1)
        fig.update_yaxes(showgrid=False, zeroline=False, showticklabels=False, row=2, col=1)
        fig.update_xaxes(title=dict(text=y_label, font=dict(color="#a0a0a0", size=11)), tickfont=dict(color="#a0a0a0", size=10), showgrid=True, gridcolor="rgba(255,255,255,0.05)", row=3, col=1)
        fig.update_yaxes(showgrid=False, zeroline=False, showticklabels=False, row=3, col=1, range=[-1, 1])

        return json.loads(fig.to_json())
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/radar")
def get_radar(
    start_date: str = Query(...),
    end_date: str = Query(...),
    deal_type: Optional[str] = Query(None),
    metrics: str = Query(...),
    highlight_deal: Optional[str] = Query(None),
):
    try:
        import plotly.graph_objects as go

        df_deals, df_props = load_deals_props()
        df_deals["Closing_Date"] = pd.to_datetime(df_deals["Closing_Date"])
        mask = (df_deals["Closing_Date"] >= pd.to_datetime(start_date)) & (df_deals["Closing_Date"] <= pd.to_datetime(end_date))
        filtered = df_deals.loc[mask].copy()

        if deal_type and deal_type.strip() and deal_type.lower() != "all types":
            filtered = filtered[filtered["Deal_Type"].str.lower() == deal_type.lower()]
        if filtered.empty:
            return json.loads(go.Figure().to_json())

        def get_radar_config(m):
            m = m.lower().strip()
            configs = {"spread": ("Spread_bps", "Spread", "bps"), "ltv": ("LTV", "LTV", "%"), "cap_rate": ("Cap_Rate", "Cap Rate", "%"), "ltc": ("LTC", "LTC", "%"), "debt_yield": ("Debt_Yield", "Debt Yield", "%"), "dscr": ("DSCR", "DSCR", "x")}
            return configs.get(m, (m, m, ""))

        selected_metrics = [m.strip() for m in metrics.split(",") if m.strip()][:8]
        data_source = filtered
        if any("cap_rate" in m.lower() for m in selected_metrics):
            data_source = pd.merge(filtered, df_props, on="Deal_ID")

        categories, market_scores, deal_scores = [], [], []
        hover_market_vals, hover_deal_vals = [], []
        grid_r, grid_theta, grid_text = [], [], []
        h_deal = data_source[data_source["Deal_ID"] == highlight_deal] if highlight_deal else pd.DataFrame()

        def format_val(v, u):
            if u == "%": return f"{v:.1%}"
            if u == "bps": return f"{v:.0f}"
            if u == "x": return f"{v:.2f}x"
            return f"{v:.2f}"

        def normalize(val, mi, ma):
            return 50 if ma == mi else ((val - mi) / (ma - mi)) * 100

        for m in selected_metrics:
            col, label, unit = get_radar_config(m)
            if col not in data_source.columns:
                continue
            valid_vals = data_source[col].dropna()
            if valid_vals.empty:
                continue
            min_v, max_v, median_v = valid_vals.min(), valid_vals.max(), valid_vals.median()
            m_score = normalize(median_v, min_v, max_v)

            d_val, d_score = None, 0
            if not h_deal.empty and col in h_deal.columns:
                val = h_deal.iloc[0][col]
                if pd.notna(val):
                    d_val, d_score = val, normalize(val, min_v, max_v)

            axis_label = f"<b>{label} ({unit})</b>" if unit else f"<b>{label}</b>"
            categories.append(axis_label)
            market_scores.append(m_score)
            deal_scores.append(d_score)

            for step in [25, 50, 75, 100]:
                val_at_step = min_v + (step / 100.0) * (max_v - min_v)
                grid_r.append(step)
                grid_theta.append(axis_label)
                grid_text.append(format_val(val_at_step, unit))

            hover_market_vals.append(f"{label}: {format_val(median_v, unit)} {unit} (Median)")
            hover_deal_vals.append(f"{label}: {format_val(d_val, unit)} {unit}" if d_val is not None else "N/A")

        if categories:
            categories.append(categories[0])
            market_scores.append(market_scores[0])
            deal_scores.append(deal_scores[0])
            hover_market_vals.append(hover_market_vals[0])
            hover_deal_vals.append(hover_deal_vals[0])

        fig = go.Figure()
        fig.add_trace(go.Scatterpolar(r=market_scores, theta=categories, fill="toself", name="Market Median", hoverinfo="text", text=hover_market_vals, line=dict(color="#00bdd6"), fillcolor="rgba(0,189,214,0.2)"))
        fig.add_trace(go.Scatterpolar(r=grid_r, theta=grid_theta, mode="text", text=grid_text, textfont=dict(size=10, color="rgba(255,255,255,0.7)"), hoverinfo="skip", showlegend=False))

        if highlight_deal and not h_deal.empty:
            fig.add_trace(go.Scatterpolar(r=deal_scores, theta=categories, fill="toself", name="Selected Deal", hoverinfo="text", text=hover_deal_vals, line=dict(color="#FF9F1C", width=3), fillcolor="rgba(255,159,28,0.1)"))

        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 100], showticklabels=False, gridcolor="rgba(255,255,255,0.1)"), angularaxis=dict(tickfont=dict(size=14, color="white"), gridcolor="rgba(255,255,255,0.1)"), bgcolor="rgba(0,0,0,0)"),
            title=dict(text="<b>Deal Profile Analysis</b>", font=dict(size=18, color="white"), x=0.01, y=0.95),
            template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#e0e0e0"), showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=50, r=50, t=50, b=50),
        )
        return json.loads(fig.to_json())
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# PORTFOLIO REVIEW ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

def project_lease_cashflow(lease_row, months=120):
    start_date = pd.to_datetime(lease_row["Lease_Start"])
    end_date = pd.to_datetime(lease_row["Lease_Expiration"])
    current_rent = float(lease_row["Annual_Rent"]) / 12
    escalation = float(lease_row.get("Escalation_Rate", 0.0))
    cashflows = []
    projection_start = datetime(2025, 1, 1)

    for i in range(months):
        date = projection_start + timedelta(days=32 * i)
        date = date.replace(day=1)
        if date < start_date or date > end_date:
            amount = 0
        else:
            years_passed = date.year - start_date.year
            if date.month < start_date.month:
                years_passed -= 1
            years_passed = max(0, years_passed)
            amount = current_rent * ((1 + escalation) ** years_passed)
        cashflows.append({"date": date, "amount": round(amount, 2), "series": lease_row.get("Tenant_Name", "Unknown")})
    return cashflows


@app.get("/portfolios")
def get_portfolios():
    if deals_df.empty:
        raise HTTPException(status_code=500, detail="Data not loaded")
    portfolios = deals_df[deals_df["Structure"] == "Portfolio"][["Deal_ID", "Deal_Name"]].to_dict(orient="records")
    return [{"label": p["Deal_Name"], "value": p["Deal_ID"]} for p in portfolios]


@app.get("/buildings")
def get_buildings(portfolio: Optional[str] = Query(None)):
    if not portfolio:
        filtered_props = props_df.head(100)
    else:
        filtered_props = props_df[props_df["Deal_ID"] == portfolio]
    result = filtered_props[["Property_ID", "Address", "City"]].to_dict(orient="records")
    return [{"label": f"{p['Address']}, {p['City']}", "value": p["Property_ID"]} for p in result]


@app.get("/cashflow")
def get_cashflow(
    portfolio: Optional[str] = Query(None),
    buildings: Optional[str] = Query(None),
    group_by_tenant: bool = Query(True),
):
    try:
        import plotly.graph_objects as go

        bldg_ids = []
        if buildings:
            bldg_ids = buildings.split(",")
        elif portfolio:
            bldg_ids = props_df[props_df["Deal_ID"] == portfolio]["Property_ID"].tolist()

        if not bldg_ids:
            return json.loads(go.Figure().update_layout(
                title=dict(text="<b>Select Portfolio to View Cashflow</b>", font=dict(size=18, color="white"), x=0.5, y=0.5, xanchor="center", yanchor="middle"),
                template="plotly_dark", xaxis=dict(visible=False), yaxis=dict(visible=False), plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            ).to_json())

        filtered_leases = rent_roll_df[rent_roll_df["Property_ID"].isin(bldg_ids)]
        all_cashflows = []
        for _, lease in filtered_leases.iterrows():
            series_name = lease["Tenant_Name"] if group_by_tenant else lease["Property_ID"]
            cf = project_lease_cashflow(lease)
            for point in cf:
                point["series"] = series_name
                all_cashflows.append(point)

        df_cf = pd.DataFrame(all_cashflows)
        fig = go.Figure()

        if not df_cf.empty:
            grouped = df_cf.groupby(["date", "series"])["amount"].sum().reset_index()
            series_list = sorted(grouped["series"].unique())
            colors = ["#00bdd6", "#00a0b5", "#008394", "#006673", "#004952", "#4dbd74", "#ff9f1c", "#ff5454"]
            for idx, s_name in enumerate(series_list):
                s_data = grouped[grouped["series"] == s_name]
                color = colors[idx % len(colors)]
                fig.add_trace(go.Scatter(x=s_data["date"], y=s_data["amount"], name=s_name, mode="lines", stackgroup="one", line=dict(width=0.5, color=color), fillcolor=color, hovertemplate=f"<b>{s_name}</b><br>Date: %{{x|%b %Y}}<br>Rent: $%{{y:,.0f}}<br><extra></extra>"))

        fig.update_layout(
            title=dict(text="<b>Projected Monthly Gross Rent</b>", font=dict(size=18, color="white"), x=0.01, y=0.95),
            xaxis=dict(tickfont=dict(color="#a0a0a0", size=11), gridcolor="rgba(255,255,255,0.05)", tickformat="%b '%y", zeroline=False),
            yaxis=dict(title=dict(text="Monthly Rent ($)", font=dict(color="#a0a0a0")), tickfont=dict(color="#a0a0a0", size=11), gridcolor="rgba(255,255,255,0.05)", tickprefix="$", zeroline=False),
            template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#e0e0e0"), showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(size=10)),
            margin=dict(l=60, r=20, t=50, b=30),
        )
        return json.loads(fig.to_json())
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rent_roll")
def get_rent_roll_table(
    portfolio: Optional[str] = Query(None),
    buildings: Optional[str] = Query(None),
):
    try:
        bldg_ids = []
        if buildings:
            bldg_ids = buildings.split(",")
        elif portfolio:
            bldg_ids = props_df[props_df["Deal_ID"] == portfolio]["Property_ID"].tolist()
        if not bldg_ids:
            return []
        filtered = rent_roll_df[rent_roll_df["Property_ID"].isin(bldg_ids)].copy()
        cols = ["Tenant_Name", "Property_ID", "Suite", "Lease_Start", "Lease_Expiration", "Annual_Rent", "Rent_PSF_Monthly", "Escalation_Rate", "Lease_Type"]
        return filtered[cols].to_dict(orient="records")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# FORM WIDGETS (SALESFORCE) ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@register_widget({
    "name": "Salesforce Deal Entry",
    "description": "Submit new deals and view the SFS pipeline.",
    "type": "table",
    "endpoint": "salesforce/deals",
    "gridData": {"w": 20, "h": 10},
    "params": [
        {
            "paramName": "deal_form", "type": "form", "endpoint": "salesforce/deals",
            "inputParams": [
                {"paramName": "opportunity_name", "type": "text", "value": "", "label": "Opportunity Name"},
                {"paramName": "sector", "type": "text", "value": "", "label": "Sector", "options": [{"label": "Real Estate", "value": "Real Estate"}, {"label": "Public Finance", "value": "Public Finance"}]},
                {"paramName": "product", "type": "text", "value": "", "label": "Product Type", "options": [{"label": "Term Loan", "value": "Term Loan"}, {"label": "Tax-Exempt Term Loan", "value": "Tax-Exempt Term Loan"}, {"label": "Bond", "value": "Bond"}, {"label": "Revenue Bond", "value": "Revenue Bond"}]},
                {"paramName": "source", "type": "text", "value": "", "label": "Lead Source", "options": [{"label": "Broker", "value": "Broker"}, {"label": "Sponsor", "value": "Sponsor"}, {"label": "SFS Internal Referral", "value": "SFS Internal Referral"}, {"label": "Agent", "value": "Agent"}]},
                {"paramName": "stage", "type": "text", "value": "", "label": "Deal Stage", "options": [{"label": "DI1 - Initial Contact", "value": "DI1"}, {"label": "DI2 - Qualification", "value": "DI2"}, {"label": "DI3 - Proposal", "value": "DI3"}, {"label": "DI4 - Negotiation", "value": "DI4"}, {"label": "DI5 - Due Diligence", "value": "DI5"}, {"label": "DI6 - Documentation", "value": "DI6"}, {"label": "DI7 - Approval", "value": "DI7"}, {"label": "DI8 - Closing", "value": "DI8"}, {"label": "DI9 - Complete", "value": "DI9"}]},
                {"paramName": "takedown_date", "type": "date", "value": "", "label": "Expected Takedown Date"},
                {"paramName": "description", "type": "text", "value": "", "label": "Deal Notes"},
                {"paramName": "submit", "type": "button", "label": "Submit Deal", "value": True},
            ],
        }
    ],
})
@app.get("/salesforce/deals")
async def get_salesforce_deals():
    if not CSV_FILE.exists():
        return [{"opportunity_name": None, "sector": None, "product": None, "source": None, "stage": None, "takedown_date": None, "description": None}]
    deals = []
    with open(CSV_FILE, mode="r", newline="") as file:
        for row in csv.DictReader(file):
            deals.append(row)
    return deals if deals else [{"opportunity_name": None, "sector": None, "product": None, "source": None, "stage": None, "takedown_date": None, "description": None}]


@app.post("/salesforce/deals")
async def submit_salesforce_deal(params: dict) -> JSONResponse:
    if not params.get("opportunity_name"):
        return JSONResponse(status_code=400, content={"error": "Opportunity name is required"})
    if not params.get("sector") or not params.get("product"):
        return JSONResponse(status_code=400, content={"error": "Sector and product are required"})
    params.pop("submit", None)
    file_exists = CSV_FILE.exists()
    if params.get("takedown_date"):
        params["takedown_date"] = str(params["takedown_date"])
    fieldnames = ["opportunity_name", "sector", "product", "source", "stage", "takedown_date", "description"]
    with open(CSV_FILE, mode="a", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
    return JSONResponse(content={"success": True})


@register_widget({
    "name": "Tranche Participation",
    "description": "Comprehensive tranche tracking for HRE and Public Finance deals.",
    "type": "table",
    "endpoint": "salesforce/tranches",
    "gridData": {"w": 20, "h": 12},
    "params": [
        {
            "paramName": "tranche_form", "type": "form", "endpoint": "salesforce/tranches",
            "inputParams": [
                {"paramName": "tranche_name", "type": "text", "value": "", "label": "Tranche Name/Series"},
                {"paramName": "facility_type", "type": "text", "value": "", "label": "Facility Type", "options": [{"label": "Senior Debt", "value": "Senior Debt"}, {"label": "Mezzanine", "value": "Mezzanine"}, {"label": "Equipment Lease", "value": "Equipment Lease"}, {"label": "Working Capital", "value": "Working Capital"}, {"label": "Bond Issue", "value": "Bond Issue"}]},
                {"paramName": "tax_status", "type": "text", "value": "", "label": "Tax Status", "options": [{"label": "Tax-Exempt", "value": "Tax-Exempt"}, {"label": "Taxable", "value": "Taxable"}, {"label": "AMT", "value": "AMT"}]},
                {"paramName": "use_of_proceeds", "type": "text", "value": "", "label": "Use of Proceeds"},
                {"paramName": "original_principal", "type": "text", "value": "", "label": "Original Principal Amount"},
                {"paramName": "current_balance", "type": "text", "value": "", "label": "Current Outstanding Balance"},
                {"paramName": "rate_type", "type": "text", "value": "", "label": "Rate Type", "options": [{"label": "Fixed", "value": "Fixed"}, {"label": "Floating", "value": "Floating"}, {"label": "Capped Floater", "value": "Capped Floater"}]},
                {"paramName": "origination_date", "type": "date", "value": "", "label": "Origination Date"},
                {"paramName": "maturity_date", "type": "date", "value": "", "label": "Maturity Date"},
                {"paramName": "submit_tranche", "type": "button", "label": "Submit Tranche", "value": True},
            ],
        }
    ],
})
@app.get("/salesforce/tranches")
async def get_tranches():
    if not TRANCHE_FILE.exists():
        return [{"tranche_name": None, "facility_type": None, "tax_status": None, "use_of_proceeds": None, "original_principal": None, "current_balance": None, "rate_type": None, "origination_date": None, "maturity_date": None}]
    tranches = []
    with open(TRANCHE_FILE, mode="r", newline="") as file:
        for row in csv.DictReader(file):
            tranches.append(row)
    return tranches if tranches else [{"tranche_name": None, "facility_type": None, "tax_status": None, "use_of_proceeds": None, "original_principal": None, "current_balance": None, "rate_type": None, "origination_date": None, "maturity_date": None}]


@app.post("/salesforce/tranches")
async def submit_tranche(params: dict) -> JSONResponse:
    if not params.get("tranche_name"):
        return JSONResponse(status_code=400, content={"error": "Tranche name is required"})
    params.pop("submit_tranche", None)
    file_exists = TRANCHE_FILE.exists()
    if params.get("origination_date"):
        params["origination_date"] = str(params["origination_date"])
    if params.get("maturity_date"):
        params["maturity_date"] = str(params["maturity_date"])
    fieldnames = ["tranche_name", "facility_type", "tax_status", "use_of_proceeds", "original_principal", "current_balance", "rate_type", "origination_date", "maturity_date"]
    with open(TRANCHE_FILE, mode="a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
    return JSONResponse(content={"success": True})


@register_widget({
    "name": "Real Estate Assets",
    "description": "Track real estate asset portfolio.",
    "type": "table",
    "endpoint": "salesforce/realestate",
    "gridData": {"w": 20, "h": 10},
    "params": [
        {
            "paramName": "realestate_form", "type": "form", "endpoint": "salesforce/realestate",
            "inputParams": [
                {"paramName": "property_name", "type": "text", "value": "", "label": "Property Name"},
                {"paramName": "property_address", "type": "text", "value": "", "label": "Address"},
                {"paramName": "property_type", "type": "text", "value": "", "label": "Property Type", "options": [{"label": "Office", "value": "Office"}, {"label": "Retail", "value": "Retail"}, {"label": "Industrial", "value": "Industrial"}, {"label": "Multifamily", "value": "Multifamily"}, {"label": "Hospitality", "value": "Hospitality"}]},
                {"paramName": "square_footage", "type": "text", "value": "", "label": "Square Footage"},
                {"paramName": "market_value", "type": "text", "value": "", "label": "Market Value"},
                {"paramName": "occupancy_rate", "type": "text", "value": "", "label": "Occupancy Rate"},
                {"paramName": "acquisition_date", "type": "date", "value": "", "label": "Acquisition Date"},
                {"paramName": "asset_notes", "type": "text", "value": "", "label": "Asset Notes"},
                {"paramName": "submit_asset", "type": "button", "label": "Submit Asset", "value": True},
            ],
        }
    ],
})
@app.get("/salesforce/realestate")
async def get_realestate():
    if not ASSET_FILE.exists():
        return [{"property_name": None, "property_address": None, "property_type": None, "square_footage": None, "market_value": None, "occupancy_rate": None, "acquisition_date": None, "asset_notes": None}]
    assets = []
    with open(ASSET_FILE, mode="r", newline="") as file:
        for row in csv.DictReader(file):
            assets.append(row)
    return assets if assets else [{"property_name": None, "property_address": None, "property_type": None, "square_footage": None, "market_value": None, "occupancy_rate": None, "acquisition_date": None, "asset_notes": None}]


@app.post("/salesforce/realestate")
async def submit_realestate(params: dict) -> JSONResponse:
    if not params.get("property_name"):
        return JSONResponse(status_code=400, content={"error": "Property name is required"})
    params.pop("submit_asset", None)
    file_exists = ASSET_FILE.exists()
    if params.get("acquisition_date"):
        params["acquisition_date"] = str(params["acquisition_date"])
    fieldnames = ["property_name", "property_address", "property_type", "square_footage", "market_value", "occupancy_rate", "acquisition_date", "asset_notes"]
    with open(ASSET_FILE, mode="a", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
    return JSONResponse(content={"success": True})


@app.get("/salesforce/accounts/list")
async def get_accounts_list():
    if not ACCOUNTS_FILE.exists():
        return []
    accounts = []
    with open(ACCOUNTS_FILE, mode="r", newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            accounts.append({"label": f"{row['account_name']} ({row['account_type']})", "value": row["account_name"]})
    return accounts


@register_widget({
    "name": "Involved Accounts",
    "description": "Dynamic account lookup: Search existing sponsors/brokers or add new ones.",
    "type": "table",
    "endpoint": "salesforce/accounts",
    "gridData": {"w": 25, "h": 12},
    "params": [
        {
            "paramName": "account_form", "type": "form", "endpoint": "salesforce/accounts",
            "inputParams": [
                {"paramName": "account_lookup", "type": "endpoint", "value": "", "label": "Search Existing Account", "description": "Start typing to search existing accounts", "optionsEndpoint": "/salesforce/accounts/list"},
                {"paramName": "account_name", "type": "text", "value": "", "label": "Account / Company Name", "description": "Required for new accounts"},
                {"paramName": "account_type", "type": "text", "value": "", "label": "Account Type", "options": [{"label": "Sponsor / Developer", "value": "Sponsor"}, {"label": "Broker", "value": "Broker"}, {"label": "Agent", "value": "Agent"}, {"label": "Lender Partner", "value": "Lender"}, {"label": "Legal Counsel", "value": "Legal"}, {"label": "Municipality", "value": "Municipality"}]},
                {"paramName": "primary_contact", "type": "text", "value": "", "label": "Primary Contact Name"},
                {"paramName": "contact_email", "type": "text", "value": "", "label": "Contact Email"},
                {"paramName": "contact_phone", "type": "text", "value": "", "label": "Contact Phone"},
                {"paramName": "business_focus", "type": "text", "value": "", "label": "Primary Business Focus"},
                {"paramName": "relationship_status", "type": "text", "value": "", "label": "Relationship Status", "options": [{"label": "Active", "value": "Active"}, {"label": "Prospective", "value": "Prospective"}, {"label": "Preferred Partner", "value": "Preferred"}, {"label": "Inactive", "value": "Inactive"}]},
                {"paramName": "account_notes", "type": "text", "value": "", "label": "Notes"},
                {"paramName": "submit_account", "type": "button", "label": "Submit Account", "value": True},
            ],
        }
    ],
})
@app.get("/salesforce/accounts")
async def get_accounts():
    if not ACCOUNTS_FILE.exists():
        return [{"account_name": None, "account_type": None, "primary_contact": None, "contact_email": None, "contact_phone": None, "business_focus": None, "relationship_status": None, "account_notes": None}]
    accounts = []
    with open(ACCOUNTS_FILE, mode="r", newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            accounts.append(row)
    return accounts if accounts else [{"account_name": None, "account_type": None, "primary_contact": None, "contact_email": None, "contact_phone": None, "business_focus": None, "relationship_status": None, "account_notes": None}]


@app.post("/salesforce/accounts")
async def submit_account(params: dict) -> JSONResponse:
    if params.get("account_lookup") and not params.get("account_name"):
        params["account_name"] = params.get("account_lookup")
    if not params.get("account_name"):
        return JSONResponse(status_code=400, content={"error": "Account name is required"})
    params.pop("submit_account", None)
    params.pop("account_lookup", None)
    file_exists = ACCOUNTS_FILE.exists()
    fieldnames = ["account_name", "account_type", "primary_contact", "contact_email", "contact_phone", "business_focus", "relationship_status", "account_notes"]
    with open(ACCOUNTS_FILE, mode="a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
    return JSONResponse(content={"success": True})


@register_widget({
    "name": "Account Lookup",
    "description": "Search and view all involved accounts with dynamic filtering",
    "type": "table",
    "endpoint": "salesforce/accounts/lookup",
    "gridData": {"w": 30, "h": 14},
    "params": [
        {"paramName": "search_term", "type": "text", "value": "", "label": "Search Accounts", "description": "Search by company name, contact name, or business focus"},
        {"paramName": "account_type_filter", "type": "text", "value": "", "label": "Filter by Type", "options": [{"label": "All Types", "value": ""}, {"label": "Sponsor", "value": "Sponsor"}, {"label": "Broker", "value": "Broker"}, {"label": "Agent", "value": "Agent"}, {"label": "Lender", "value": "Lender"}, {"label": "Legal", "value": "Legal"}, {"label": "Municipality", "value": "Municipality"}]},
        {"paramName": "relationship_filter", "type": "text", "value": "", "label": "Filter by Relationship", "options": [{"label": "All Statuses", "value": ""}, {"label": "Active", "value": "Active"}, {"label": "Prospective", "value": "Prospective"}, {"label": "Preferred", "value": "Preferred"}, {"label": "Inactive", "value": "Inactive"}]},
    ],
})
@app.get("/salesforce/accounts/lookup")
async def lookup_accounts(search_term: str = "", account_type_filter: str = "", relationship_filter: str = ""):
    if not ACCOUNTS_FILE.exists():
        return [{"account_name": "No accounts yet", "account_type": None, "primary_contact": None, "contact_email": None, "contact_phone": None, "business_focus": None, "relationship_status": None, "account_notes": None}]
    accounts = []
    with open(ACCOUNTS_FILE, mode="r", newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            if account_type_filter and row.get("account_type") != account_type_filter:
                continue
            if relationship_filter and row.get("relationship_status") != relationship_filter:
                continue
            if search_term:
                sl = search_term.lower()
                if not (sl in row.get("account_name", "").lower() or sl in row.get("primary_contact", "").lower() or sl in row.get("business_focus", "").lower() or sl in row.get("account_notes", "").lower()):
                    continue
            accounts.append(row)
    return accounts if accounts else [{"account_name": "No matching accounts", "account_type": None, "primary_contact": None, "contact_email": None, "contact_phone": None, "business_focus": None, "relationship_status": None, "account_notes": None}]


# ══════════════════════════════════════════════════════════════════════════════
# SHAREPOINT / DOCUMENT VIEWER ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

def get_base64_pdf(filename: str) -> Optional[str]:
    target_path = None
    root_path = PDF_DIR / filename
    if root_path.exists():
        target_path = root_path
    elif PDF_DIR.exists():
        for root, dirs, files in os.walk(PDF_DIR):
            if filename in files:
                target_path = os.path.join(root, filename)
                break
    if target_path and os.path.exists(target_path):
        try:
            with open(target_path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        except Exception:
            return None
    return None


@app.get("/deals")
def get_deals(q: Optional[str] = Query(None)):
    deals = [
        {"label": "Project Alpha (Tech M&A)", "value": "deal_alpha"},
        {"label": "Project Beta (Real Estate)", "value": "deal_beta"},
        {"label": "Project Gamma (Energy)", "value": "deal_gamma"},
        {"label": "Project Healthcare (Medical Office)", "value": "deal_healthcare"},
        {"label": "Project Hospital (Acute Care)", "value": "deal_hospital"},
    ]
    if q:
        deals = [d for d in deals if q.lower() in d["label"].lower()]
    return deals


@app.get("/folders")
def get_folders(deal_id: str = "deal_alpha"):
    if not PDF_DIR.exists():
        return []
    return [{"label": d, "value": d} for d in os.listdir(PDF_DIR) if os.path.isdir(PDF_DIR / d)]


@app.get("/files_list")
def get_files_list(deal_id: str = "deal_alpha", portfolio: Optional[List[str]] = Query(None)):
    all_files = []
    deal_folder = PDF_DIR / deal_id
    if deal_folder.exists():
        all_files.extend([f for f in os.listdir(deal_folder) if f.lower().endswith(".pdf")])
    if portfolio:
        for p in portfolio:
            p_list = [x.strip() for x in p.split(",")] if "," in p else [p]
            for p_name in p_list:
                p_folder = PDF_DIR / p_name
                if p_folder.exists():
                    all_files.extend([f for f in os.listdir(p_folder) if f.lower().endswith(".pdf")])
    if not all_files and PDF_DIR.exists():
        all_files = [f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf") and os.path.isfile(PDF_DIR / f)]
    return [{"label": f, "value": f} for f in sorted(set(all_files))]


@app.get("/documents")
def get_documents(filename: str = Query(...)):
    b64_content = get_base64_pdf(filename)
    if not b64_content:
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    return {"data_format": {"data_type": "pdf", "filename": filename}, "content": b64_content}


# ══════════════════════════════════════════════════════════════════════════════
# ENTRYPOINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

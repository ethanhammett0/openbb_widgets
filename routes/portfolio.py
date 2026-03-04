import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly_templates import dark_template
from data_loader import df_deals as _dd, df_props as _dp, df_tenants as _dt, wavg

router = APIRouter(tags=["Healthcare Portfolio"])

# ── Dimension / Metric Maps ───────────────────────────────────────────────────
_DIM_MAP = {
    "Strategy":           ("deal", "Strategy"),
    "Geography":          ("prop", "State"),
    "Deal Type":          ("deal", "Deal_Type"),
    "Credit Rating":      ("deal", "Credit_Rating"),
    "Asset Type":         ("prop", "Asset_Type"),
    "Property Condition": ("prop", "Property_Condition"),
    "Structure":          ("deal", "Structure"),
}
_METRIC_MAP = {
    "Loan Amount": ("Aggregate_Loan_Amount", "$"),
    "Valuation":   ("Aggregate_Valuation",   "$"),
    "Deal Count":  (None,                    ""),
    "NOI":         ("NOI",                   "$"),
}
_ALLOC_COLORS = [
    "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4",
    "#F97316","#EC4899","#14B8A6","#A855F7","#84CC16","#E11D48",
    "#0EA5E9","#D97706","#7C3AED","#059669","#2563EB","#DB2777",
]
_GRID_FILTER_MAP = {
    "Strategy": "Strategy", "Geography": "State", "Deal Type": "Deal_Type",
    "Credit Rating": "Credit", "Asset Type": "Type",
    "Property Condition": "Condition", "Structure": "Structure",
}


def _require():
    if _dd is None:
        raise HTTPException(500, "HRE data not loaded")
    return _dd.copy(), _dp.copy(), _dt.copy()


# ── Build property weights once ───────────────────────────────────────────────
def _build_prop_weights():
    pw = _dp[["Deal_ID", "Property_ID", "State", "Asset_Type",
              "Property_Condition", "Appraised_Value"]].copy()
    totals = pw.groupby("Deal_ID")["Appraised_Value"].sum().reset_index(name="_DealAV")
    pw = pw.merge(totals, on="Deal_ID")
    pw["_Weight"] = np.where(pw["_DealAV"] > 0, pw["Appraised_Value"] / pw["_DealAV"], 0.0)
    return pw

_prop_weights = _build_prop_weights() if _dp is not None else None


# ── Portfolio cache ───────────────────────────────────────────────────────────
def _build_cache():
    deals, props, tenants = _require()

    tenants["Lease_End_dt"] = pd.to_datetime(tenants["Lease_End"])
    today = pd.to_datetime("today")
    tenants["Remaining_Term"] = ((tenants["Lease_End_dt"] - today).dt.days / 365.25).clip(lower=0).round(2)

    prop_agg = tenants.groupby("Property_ID").agg(
        Occupied_SF=("Square_Feet", "sum"),
        Prop_Annual_Rent=("Annual_Rent", "sum"),
        Prop_Tenant_Count=("Tenant_ID", "count"),
    ).reset_index()

    prop_walt = tenants.groupby("Property_ID").apply(
        lambda g: (g["Remaining_Term"] * g["Annual_Rent"]).sum() / g["Annual_Rent"].sum()
        if g["Annual_Rent"].sum() > 0 else 0.0, include_groups=False
    ).reset_index(name="Prop_WALT")

    props = props.merge(prop_agg, on="Property_ID", how="left").merge(prop_walt, on="Property_ID", how="left")
    for c in ["Occupied_SF", "Prop_Annual_Rent", "Prop_Tenant_Count", "Prop_WALT"]:
        props[c] = props[c].fillna(0)
    props["Prop_Tenant_Count"] = props["Prop_Tenant_Count"].astype(int)
    props["Prop_Occupancy"] = np.where(props["Total_Area_SF"] > 0,
        (props["Occupied_SF"] / props["Total_Area_SF"]).clip(upper=1.0), 0.0)

    deal_agg = props.groupby("Deal_ID").agg(
        Deal_Total_SF=("Total_Area_SF", "sum"),
        Deal_Occupied_SF=("Occupied_SF", "sum"),
        Deal_Annual_Rent=("Prop_Annual_Rent", "sum"),
        N_Assets=("Property_ID", "count"),
        Deal_N_Tenants=("Prop_Tenant_Count", "sum"),
    ).reset_index()

    def _deal_walt(did):
        dp = props[props["Deal_ID"] == did]
        tot = dp["Prop_Annual_Rent"].sum()
        return (dp["Prop_WALT"] * dp["Prop_Annual_Rent"]).sum() / tot if tot > 0 else 0.0

    deal_walts = pd.DataFrame({"Deal_ID": deals["Deal_ID"], "Deal_WALT": deals["Deal_ID"].apply(_deal_walt)})
    deals = deals.merge(deal_agg, on="Deal_ID", how="left").merge(deal_walts, on="Deal_ID", how="left")
    for c in ["N_Assets","Deal_N_Tenants","Deal_Total_SF","Deal_Occupied_SF","Deal_Annual_Rent","Deal_WALT"]:
        deals[c] = deals[c].fillna(0)
    deals["N_Assets"] = deals["N_Assets"].astype(int)
    deals["Deal_N_Tenants"] = deals["Deal_N_Tenants"].astype(int)
    deals["Deal_Occupancy"] = np.where(deals["Deal_Total_SF"] > 0,
        (deals["Deal_Occupied_SF"] / deals["Deal_Total_SF"]).clip(upper=1.0), 0.0)

    def _short(row):
        raw, n = row["Deal_Name"], row["N_Assets"]
        sfx = f"({n} Asset{'s' if n != 1 else ''})"
        if " - " in raw:
            p = raw.split(" - ")
            return f"{p[0].strip()} - {p[1].strip()[:12]} {sfx}"
        return f"{raw} {sfx}"

    deals["Display_Name"] = deals.apply(_short, axis=1)
    props["Display_Prop"] = props["Property_Name"].apply(
        lambda x: x.split("(")[0].strip() if "(" in x else x)

    merged = tenants.merge(
        props[["Property_ID","Deal_ID","Display_Prop","Property_Condition","Asset_Type",
               "City","State","Property_Loan","Appraised_Value","Property_LTV",
               "Total_Area_SF","Occupied_SF","Prop_Annual_Rent","Prop_WALT",
               "Prop_Occupancy","Prop_Tenant_Count"]],
        on=["Property_ID","Deal_ID"], how="left", suffixes=("","_prop")
    ).merge(
        deals[["Deal_ID","Display_Name","Sponsor","Strategy","Credit_Rating","Structure",
               "Deal_Type","Tenant_Type","Aggregate_Loan_Amount","Aggregate_Valuation",
               "LTV","DSCR","Debt_Yield","Deal_WALT","Deal_Occupancy","Deal_Total_SF",
               "Deal_Occupied_SF","Deal_Annual_Rent","Deal_N_Tenants","N_Assets"]],
        on="Deal_ID", how="left"
    )
    merged["Pct_RSF"] = np.where(merged["Total_Area_SF"] > 0,
        merged["Square_Feet"] / merged["Total_Area_SF"], 0.0)
    merged["Location"] = merged["City"] + ", " + merged["State"]

    rows = []
    for _, r in merged.iterrows():
        nt = max(int(r["Prop_Tenant_Count"]), 1)
        rows.append({
            "Deal_Name": r["Display_Name"], "Property_Name": r["Display_Prop"],
            "Tenant_Name": r["Tenant_Name"],
            "Sponsor": r["Sponsor"], "Strategy": r["Strategy"], "Credit": r["Credit_Rating"],
            "Type": r["Asset_Type"], "Condition": r["Property_Condition"], "Location": r["Location"],
            "Occupancy": round(r["Prop_Occupancy"] * 100, 1),
            "WALT": round(r["Prop_WALT"], 2),
            "LTV": round(r["Property_LTV"] * 100, 1),
            "DSCR": round(r["DSCR"], 2),
            "Debt_Yield": round(r["Debt_Yield"] * 100, 1),
            "Loan":  round(r["Property_Loan"] / nt),
            "Value": round(r["Appraised_Value"] / nt),
            "Annual_Rent": int(r["Annual_Rent"]),
            "SF": int(r["Square_Feet"]),
            "Rent_PSF": round(r["Rent_PSF"], 2),
            "Pct_RSF":  round(r["Pct_RSF"] * 100, 1),
            "Term": round(r["Remaining_Term"], 2),
            "Lease_Expiry": r["Lease_End"],
            "Lease_Type": r["Lease_Type"],
            "Structure": r["Structure"], "Tenant_Type": r["Tenant_Type"],
            "State": r["State"], "Deal_Type": r["Deal_Type"], "Assets": int(r["N_Assets"]),
        })
    return rows

try:
    print("[portfolio] Building cache...")
    _CACHE = _build_cache()
    print(f"[portfolio] Cache ready: {len(_CACHE)} rows")
except Exception as e:
    print(f"[portfolio] Cache error: {e}")
    _CACHE = []


# ── /portfolio ────────────────────────────────────────────────────────────────
@router.get("/portfolio")
def get_portfolio(view_mode="Overview", filter_by="None", filter_value="All",
                  tenant_type="All", deal_structure="All"):
    rows = _CACHE
    if tenant_type and tenant_type != "All":
        rows = [r for r in rows if r.get("Tenant_Type") == tenant_type]
    if deal_structure and deal_structure != "All":
        if deal_structure == "Portfolio":
            rows = [r for r in rows if r.get("Assets", 0) > 1]
        elif deal_structure == "Single Asset":
            rows = [r for r in rows if r.get("Assets", 0) == 1]
        else:
            rows = [r for r in rows if r.get("Structure") == deal_structure]
    if filter_by and filter_by != "None" and filter_by in _GRID_FILTER_MAP \
            and filter_value and filter_value != "All":
        field = _GRID_FILTER_MAP[filter_by]
        sel = {v.strip() for v in filter_value.split(",") if v.strip()}
        if sel and "All" not in sel:
            rows = [r for r in rows if str(r.get(field, "")) in sel]
    if view_mode == "Financials":
        hide = {"Term","Lease_Expiry","Rent_PSF","Pct_RSF","Lease_Type"}
        rows = [{k: (None if k in hide else v) for k, v in r.items()} for r in rows]
    elif view_mode == "Lease Details":
        hide = {"Loan","Value","LTV","DSCR","Debt_Yield","Credit"}
        rows = [{k: (None if k in hide else v) for k, v in r.items()} for r in rows]
    return rows


# ── /metrics ──────────────────────────────────────────────────────────────────
@router.get("/metrics")
def get_metrics():
    df = _dd
    tv = df["Aggregate_Valuation"].sum()
    tl = df["Aggregate_Loan_Amount"].sum()
    return [
        {"label": "Total Portfolio Value", "value": f"${tv/1e9:.2f}B", "delta": "+2.5%"},
        {"label": "Total Loan Amount",     "value": f"${tl/1e9:.2f}B", "delta": "+1.8%"},
        {"label": "W.Avg LTV",    "value": f"{wavg(df['LTV'], df['Aggregate_Valuation'])*100:.1f}%", "delta": "-0.5%"},
        {"label": "W.Avg DSCR",   "value": f"{wavg(df['DSCR'], df['Aggregate_Loan_Amount']):.2f}x",  "delta": "+0.05"},
        {"label": "W.Avg Debt Yield", "value": f"{wavg(df['Debt_Yield'], df['Aggregate_Loan_Amount'])*100:.1f}%", "delta": "+0.2%"},
    ]


# ── /portfolio_history ────────────────────────────────────────────────────────
@router.get("/portfolio_history")
def get_history(interval: str = "Quarter", show_composition: bool = False, theme: str = "dark"):
    df = _dd.copy()
    df["Maturity_Date"] = pd.to_datetime(df["Maturity_Date"])
    freq_map = {"Month": "ME", "Quarter": "QE", "Year": "YE"}
    freq = freq_map.get(interval, "YE")

    def lbl(p, iv):
        if iv == "Quarter": return f"{p.quarter}Q{str(p.year)[-2:]}"
        if iv == "Month":   return p.strftime("%b '%y")
        return p.strftime("%Y")

    layout = dict(
        template=dark_template if theme == "dark" else "plotly_white",
        barmode="stack" if show_composition else "group",
        margin=dict(l=80, r=40, t=50, b=80), showlegend=False,
        title=dict(text=f"Maturity Schedule ({interval})", font=dict(size=14), x=0.01, y=0.98),
        xaxis=dict(title=f"Maturity ({interval})"),
        yaxis=dict(title="Volume Maturing ($)", tickprefix="$", tickformat="~s"),
    )
    fig = go.Figure()
    colors = ["#FF9800","#03A9F4","#4CAF50","#FFC107","#E91E63","#9C27B0","#00BCD4","#CDDC39"]

    if show_composition:
        pf = {"Month": "M", "Quarter": "Q", "Year": "Y"}.get(interval, "Y")
        tmp = df.copy().set_index("Maturity_Date")
        tmp["Period"] = tmp.index.to_period(pf)
        grouped = tmp.groupby(["Period","Deal_Name"])[["Aggregate_Loan_Amount"]].sum().reset_index()
        grouped["Label"] = grouped["Period"].apply(lambda x: lbl(x, interval))
        sorted_labels = [lbl(p, interval) for p in sorted(grouped["Period"].unique())]
        layout["xaxis"]["categoryorder"] = "array"
        layout["xaxis"]["categoryarray"] = sorted_labels
        layout["showlegend"] = False
        for i, deal in enumerate(grouped["Deal_Name"].unique()):
            d = grouped[grouped["Deal_Name"] == deal]
            fig.add_trace(go.Bar(x=d["Label"], y=d["Aggregate_Loan_Amount"], name=deal,
                                 marker_color=colors[i % len(colors)],
                                 hovertemplate=f"<b>{deal}</b><br>Maturity: %{{x}}<br>Amount: $%{{y:,.0f}}<extra></extra>"))
    else:
        rs = df.set_index("Maturity_Date").resample(freq)["Aggregate_Loan_Amount"].sum().reset_index()
        rs = rs.sort_values("Maturity_Date")
        if interval == "Quarter":
            rs["Label"] = rs["Maturity_Date"].apply(lambda x: f"{(x.month-1)//3+1}Q{str(x.year)[-2:]}")
        elif interval == "Month":
            rs["Label"] = rs["Maturity_Date"].dt.strftime("%b '%y")
        else:
            rs["Label"] = rs["Maturity_Date"].dt.strftime("%Y")
        layout["xaxis"]["categoryorder"] = "array"
        layout["xaxis"]["categoryarray"] = rs["Label"].tolist()
        fig.add_trace(go.Bar(x=rs["Label"], y=rs["Aggregate_Loan_Amount"], name="Total Volume",
                             marker_color="#03A9F4",
                             hovertemplate="<b>%{x}</b><br>Volume: $%{y:,.0f}<extra></extra>"))

    fig.update_layout(**layout)
    return json.loads(fig.to_json())


# ── /allocation_options ───────────────────────────────────────────────────────
@router.get("/allocation_options")
def alloc_options(dimension: str = "Strategy"):
    if dimension == "None" or dimension not in _DIM_MAP:
        return [{"label": "All", "value": "All"}]
    src, col = _DIM_MAP[dimension]
    vals = sorted((_dp if src == "prop" else _dd)[col].dropna().unique().tolist())
    return [{"label": "All", "value": "All"}] + [{"label": str(v), "value": str(v)} for v in vals]


# ── /allocation ───────────────────────────────────────────────────────────────
def _fmt(val, pfx):
    if pfx == "$":
        if abs(val) >= 1e9: return f"${val/1e9:.2f}B"
        if abs(val) >= 1e6: return f"${val/1e6:.1f}M"
        if abs(val) >= 1e3: return f"${val/1e3:.0f}K"
        return f"${val:,.0f}"
    return f"{val:,.0f}"


@router.get("/allocation")
def get_allocation(group_by="Strategy", filter_by="None", filter_value="All",
                   metric="Loan Amount", tenant_type="All", deal_structure="All",
                   theme="dark", raw: bool = False):
    if group_by not in _DIM_MAP:
        raise HTTPException(400, f"Invalid group_by: {group_by}")

    metric_col, prefix = _METRIC_MAP.get(metric, _METRIC_MAP["Loan Amount"])
    _, group_col = _DIM_MAP[group_by]

    apply_filter = (filter_by and filter_by != "None" and filter_by != group_by
                    and filter_by in _DIM_MAP and filter_value and filter_value != "All")
    filter_col = _DIM_MAP[filter_by][1] if apply_filter else None

    # Build working df with pro-rata for property dims
    df_work = _dd.copy()
    prop_dims = [_DIM_MAP[d][1] for d in [group_by, filter_by] if d in _DIM_MAP and _DIM_MAP[d][0] == "prop"]
    uses_prop = bool(prop_dims)

    if tenant_type and tenant_type != "All":
        df_work = df_work[df_work["Tenant_Type"] == tenant_type]
    if deal_structure and deal_structure != "All":
        df_work = df_work[df_work["Structure"] == deal_structure]

    if uses_prop and _prop_weights is not None:
        pw = _prop_weights[["Deal_ID","Property_ID","_Weight"] + prop_dims].drop_duplicates()
        df_work = df_work.merge(pw, on="Deal_ID", how="left")
        for mcol in ["Aggregate_Loan_Amount","Aggregate_Valuation","NOI"]:
            if mcol in df_work.columns:
                df_work[mcol] = df_work[mcol] * df_work["_Weight"]

    if df_work.empty:
        raise HTTPException(404, "No deals match selected filters")

    subtitle_parts = []
    if apply_filter and filter_col:
        sel = [v.strip() for v in filter_value.split(",") if v.strip()]
        if sel and "All" not in sel:
            df_work = df_work[df_work[filter_col].astype(str).isin(sel)]
            if df_work.empty:
                raise HTTPException(404, f"No deals where {filter_by} = {filter_value}")
            subtitle_parts.append(f"{filter_by}: {', '.join(sel) if len(sel) <= 3 else f'{len(sel)} selected'}")
    if tenant_type != "All":    subtitle_parts.append(tenant_type)
    if deal_structure != "All": subtitle_parts.append(deal_structure)
    subtitle = " · ".join(subtitle_parts)

    is_geo = (group_by == "Geography")
    if metric == "Deal Count":
        agg = (df_work.groupby(group_col)["_Weight"].sum().reset_index(name="value").assign(value=lambda d: d["value"].round(0).astype(int))
               if uses_prop else df_work.groupby(group_col).size().reset_index(name="value"))
    else:
        agg = df_work.groupby(group_col)[metric_col].sum().reset_index(name="value")

    if is_geo and uses_prop and "Property_ID" in df_work.columns:
        ac = df_work.groupby(group_col)["Property_ID"].nunique().reset_index(name="asset_count")
        agg = agg.merge(ac, on=group_col, how="left")
        agg["asset_count"] = agg["asset_count"].fillna(0).astype(int)

    agg = agg.sort_values("value", ascending=False).reset_index(drop=True)
    agg["label"] = agg[group_col].astype(str)
    total = float(agg["value"].sum())
    agg["pct"] = (agg["value"] / total * 100).round(1) if total > 0 else 0.0
    n = len(agg)

    if raw:
        cols = ["label","value","pct"] + (["asset_count"] if "asset_count" in agg.columns else [])
        return agg[cols].to_dict(orient="records")

    colors = [_ALLOC_COLORS[i % len(_ALLOC_COLORS)] for i in range(n)]
    custom = []
    for _, row in agg.iterrows():
        items = [row["label"], _fmt(row["value"], prefix), f"{row['pct']:.1f}%",
                 f"{int(row['asset_count'])} assets" if is_geo and "asset_count" in agg.columns else ""]
        custom.append(items)

    hover = ("<b style='font-size:14px'>%{customdata[0]}</b><br>"
             "<span style='font-size:13px'>%{customdata[1]}</span><br>"
             "<span style='color:#9ca3af'>%{customdata[2]} of portfolio</span>")
    if is_geo and "asset_count" in agg.columns:
        hover += "<br><span style='color:#6ee7b7'>%{customdata[3]}</span>"
    hover += "<extra></extra>"

    fig = go.Figure()
    # Shadow ring
    fig.add_trace(go.Pie(labels=agg["label"].tolist(), values=agg["value"].tolist(), hole=0.60,
                         marker=dict(colors=["rgba(30,30,38,0.6)"]*n, line=dict(color="rgba(0,0,0,0)", width=0)),
                         textinfo="none", hoverinfo="skip", showlegend=False,
                         domain=dict(x=[0.03,0.63], y=[0.03,0.97])))
    # Main donut
    fig.add_trace(go.Pie(labels=agg["label"].tolist(), values=agg["value"].tolist(), hole=0.62,
                         marker=dict(colors=colors, line=dict(color="#151518", width=2.5)),
                         textinfo="none", customdata=custom, hovertemplate=hover,
                         hoverlabel=dict(bgcolor="#1a1a22", bordercolor="rgba(255,255,255,0.1)",
                                         font=dict(family="Inter", size=13, color="#f2f5fa")),
                         sort=True, direction="clockwise", pull=[0.025]*n, rotation=90,
                         domain=dict(x=[0.0,0.60], y=[0.0,1.0])))

    # Annotations
    cv = _fmt(total, prefix)
    anns = [dict(text=f"<b style='font-size:24px;color:#f2f5fa'>{cv}</b><br>"
                      f"<span style='font-size:12px;color:#6b7280'>{subtitle or metric}</span>",
                 x=0.30, y=0.50, font=dict(size=14, family="Inter"),
                 showarrow=False, xref="paper", yref="paper", xanchor="center", yanchor="middle")]

    row_h = min(0.85 / max(n, 1), 0.12)
    legend_start = 0.5 + row_h * n / 2
    for i, (_, row) in enumerate(agg.iterrows()):
        y_pos = legend_start - i * row_h
        lbl_text = row["label"] + (f" ({int(row['asset_count'])})" if is_geo and "asset_count" in agg.columns else "")
        anns.append(dict(
            text=f"<span style='color:{colors[i]};font-size:16px'>●</span>  "
                 f"<b style='color:#e5e7eb;font-size:13px'>{lbl_text}</b>",
            x=0.68, y=y_pos, font=dict(size=13, family="Inter"), showarrow=False,
            xref="paper", yref="paper", xanchor="left", yanchor="middle"))
        anns.append(dict(
            text=f"<span style='color:#6b7280;font-size:11px'>{_fmt(row['value'],prefix)} · {row['pct']:.1f}%</span>",
            x=0.68, y=y_pos - row_h * 0.4, font=dict(size=11, family="Inter"), showarrow=False,
            xref="paper", yref="paper", xanchor="left", yanchor="middle"))

    if uses_prop:
        anns.append(dict(
            text="<span style='font-size:10px;color:#6b7280;font-style:italic'>* Pro-rated by appraised value</span>",
            x=0.0, y=-0.02, font=dict(size=10, family="Inter"), showarrow=False,
            xref="paper", yref="paper", xanchor="left", yanchor="top"))

    fig.update_layout(
        template=dark_template if theme == "dark" else "plotly_white",
        plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
        annotations=anns, showlegend=False,
        margin=dict(l=20, r=20, t=40, b=20),
    )
    return json.loads(fig.to_json())

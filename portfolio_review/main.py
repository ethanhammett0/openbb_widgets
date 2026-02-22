import json
from pathlib import Path
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import plotly.graph_objects as go
from plotly_templates import dark_template

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pro.openbb.co",
        "https://excel.openbb.co",
        "http://localhost:1420",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_PATH = Path(__file__).parent.resolve()
DATA_PATH = Path("c:/Users/ehamm/OneDrive/Desktop/Python Directory/openbb_widgets/dummy_data")

# ── Load Data Once ──
try:
    df_deals = pd.read_csv(DATA_PATH / "hre_deals.csv")
    df_props = pd.read_csv(DATA_PATH / "hre_properties.csv")
    df_tenants = pd.read_csv(DATA_PATH / "hre_tenants.csv")
    df_cashflows = pd.read_csv(DATA_PATH / "hre_cashflows.csv")
    df_debt = pd.read_csv(DATA_PATH / "hre_debt_service.csv")
    print(f"Data loaded: {len(df_deals)} deals, {len(df_props)} properties, {len(df_tenants)} tenants.")
except Exception as e:
    print(f"Error loading data: {e}")


def _wavg(values, weights):
    w = np.array(weights, dtype=float)
    v = np.array(values, dtype=float)
    mask = np.isfinite(v) & np.isfinite(w) & (w > 0)
    w, v = w[mask], v[mask]
    return float((v * w).sum() / w.sum()) if w.sum() > 0 else 0.0


def _build_portfolio_cache():
    """
    Build flat rows with all fields populated on every row.
    AgGrid rowGroup on Deal_Name + Property_Name handles the hierarchy.
    Sponsor, Strategy, Credit etc. flow to every tenant row.
    """
    tenants = df_tenants.copy()
    props = df_props.copy()
    deals = df_deals.copy()

    # ── Tenant remaining term ──
    tenants["Lease_End_dt"] = pd.to_datetime(tenants["Lease_End"])
    today = pd.to_datetime("today")
    tenants["Remaining_Term"] = ((tenants["Lease_End_dt"] - today).dt.days / 365.25).clip(lower=0).round(2)

    # ── Property-level aggregates ──
    prop_agg = tenants.groupby("Property_ID").agg(
        Occupied_SF=("Square_Feet", "sum"),
        Prop_Annual_Rent=("Annual_Rent", "sum"),
        Prop_Tenant_Count=("Tenant_ID", "count"),
    ).reset_index()

    def _prop_walt(grp):
        if grp["Annual_Rent"].sum() > 0:
            return (grp["Remaining_Term"] * grp["Annual_Rent"]).sum() / grp["Annual_Rent"].sum()
        return 0.0

    prop_walt = tenants.groupby("Property_ID").apply(
        _prop_walt, include_groups=False
    ).reset_index(name="Prop_WALT")
    prop_agg = prop_agg.merge(prop_walt, on="Property_ID", how="left")

    props = props.merge(prop_agg, on="Property_ID", how="left")
    props["Occupied_SF"] = props["Occupied_SF"].fillna(0)
    props["Prop_Annual_Rent"] = props["Prop_Annual_Rent"].fillna(0)
    props["Prop_Tenant_Count"] = props["Prop_Tenant_Count"].fillna(0).astype(int)
    props["Prop_WALT"] = props["Prop_WALT"].fillna(0)
    props["Prop_Occupancy"] = np.where(
        props["Total_Area_SF"] > 0,
        (props["Occupied_SF"] / props["Total_Area_SF"]).clip(upper=1.0),
        0.0,
    )

    # ── Deal-level aggregates ──
    deal_agg = props.groupby("Deal_ID").agg(
        Deal_Total_SF=("Total_Area_SF", "sum"),
        Deal_Occupied_SF=("Occupied_SF", "sum"),
        Deal_Annual_Rent=("Prop_Annual_Rent", "sum"),
        N_Assets=("Property_ID", "count"),
        Deal_N_Tenants=("Prop_Tenant_Count", "sum"),
    ).reset_index()

    def _deal_walt(deal_id):
        dp = props[props["Deal_ID"] == deal_id]
        if dp["Prop_Annual_Rent"].sum() > 0:
            return (dp["Prop_WALT"] * dp["Prop_Annual_Rent"]).sum() / dp["Prop_Annual_Rent"].sum()
        return 0.0

    deal_walts = pd.DataFrame({
        "Deal_ID": deals["Deal_ID"],
        "Deal_WALT": deals["Deal_ID"].apply(_deal_walt),
    })

    deals = deals.merge(deal_agg, on="Deal_ID", how="left").merge(deal_walts, on="Deal_ID", how="left")
    deals["N_Assets"] = deals["N_Assets"].fillna(0).astype(int)
    deals["Deal_N_Tenants"] = deals["Deal_N_Tenants"].fillna(0).astype(int)
    deals["Deal_Total_SF"] = deals["Deal_Total_SF"].fillna(0)
    deals["Deal_Occupied_SF"] = deals["Deal_Occupied_SF"].fillna(0)
    deals["Deal_Annual_Rent"] = deals["Deal_Annual_Rent"].fillna(0)
    deals["Deal_WALT"] = deals["Deal_WALT"].fillna(0)
    deals["Deal_Occupancy"] = np.where(
        deals["Deal_Total_SF"] > 0,
        (deals["Deal_Occupied_SF"] / deals["Deal_Total_SF"]).clip(upper=1.0),
        0.0,
    )

    # Shorten deal name for display, keep city stub for uniqueness
    def _short_name(row):
        raw = row["Deal_Name"]
        n = row["N_Assets"]
        if " - " in raw:
            parts = raw.split(" - ")
            return f"{parts[0].strip()} - {parts[1].strip()[:12]} ({n} Assets)"
        return f"{raw} ({n} Assets)"

    deals["Display_Name"] = deals.apply(_short_name, axis=1)

    # Clean property name: strip (Asset Type) suffix
    props["Display_Prop"] = props["Property_Name"].apply(
        lambda x: x.split("(")[0].strip() if "(" in x else x
    )

    # ── Build flat tenant-level rows ──
    # Merge everything: tenant ← property ← deal
    merged = tenants.merge(
        props[["Property_ID", "Deal_ID", "Display_Prop", "Property_Condition",
               "Asset_Type", "City", "State", "Property_Loan", "Appraised_Value",
               "Property_LTV", "Total_Area_SF", "Occupied_SF", "Prop_Annual_Rent",
               "Prop_WALT", "Prop_Occupancy", "Prop_Tenant_Count"]],
        on=["Property_ID", "Deal_ID"],
        how="left",
        suffixes=("", "_prop"),
    )
    merged = merged.merge(
        deals[["Deal_ID", "Display_Name", "Sponsor", "Strategy", "Credit_Rating",
               "Aggregate_Loan_Amount", "Aggregate_Valuation", "LTV", "DSCR",
               "Debt_Yield", "Deal_WALT", "Deal_Occupancy", "Deal_Total_SF",
               "Deal_Occupied_SF", "Deal_Annual_Rent", "Deal_N_Tenants", "N_Assets"]],
        on="Deal_ID",
        how="left",
    )

    # ── Compute tenant-level fields ──
    merged["Pct_RSF"] = np.where(
        merged["Total_Area_SF"] > 0,
        merged["Square_Feet"] / merged["Total_Area_SF"],
        0.0,
    )
    merged["Location"] = merged["City"] + ", " + merged["State"]

    # ── Format output rows (flat — every field on every row) ──
    rows = []
    for _, r in merged.iterrows():
        rows.append({
            # Group columns (hidden, used by rowGroup)
            "Deal_Name": r["Display_Name"],
            "Property_Name": r["Display_Prop"],
            # Tenant name (visible leaf)
            "Tenant_Name": r["Tenant_Name"],
            # Deal-level fields (flow down to every row via aggFunc: first)
            "Sponsor": r["Sponsor"],
            "Strategy": r["Strategy"],
            "Credit": r["Credit_Rating"],
            # Property-level fields
            "Condition": r["Property_Condition"],
            "Type": r["Asset_Type"],
            "Location": r["Location"],
            # Metrics — deal level (shown on deal group row via max)
            "Deal_Occ": round(r["Deal_Occupancy"] * 100, 1),
            "Deal_WALT": round(r["Deal_WALT"], 2),
            "Deal_Loan": int(r["Aggregate_Loan_Amount"]),
            "Deal_Value": int(r["Aggregate_Valuation"]),
            "Deal_LTV": round(r["LTV"] * 100, 1),
            "DSCR": round(r["DSCR"], 2),
            "Debt_Yield": round(r["Debt_Yield"] * 100, 1),
            # Metrics — property level (shown on property group row via max)
            "Prop_Occ": round(r["Prop_Occupancy"] * 100, 1),
            "Prop_WALT": round(r["Prop_WALT"], 2),
            "Prop_Loan": int(r["Property_Loan"]),
            "Prop_Value": int(r["Appraised_Value"]),
            "Prop_LTV": round(r["Property_LTV"] * 100, 1),
            # Tenant-level fields
            "Annual_Rent": int(r["Annual_Rent"]),
            "SF": int(r["Square_Feet"]),
            "Rent_PSF": round(r["Rent_PSF"], 2),
            "Pct_RSF": round(r["Pct_RSF"] * 100, 1),
            "Term": round(r["Remaining_Term"], 2),
            "Lease_Expiry": r["Lease_End"],
            "Lease_Type": r["Lease_Type"],
        })

    return rows


print("Building portfolio cache...")
_PORTFOLIO_CACHE = _build_portfolio_cache()
print(f"Portfolio cache built: {len(_PORTFOLIO_CACHE)} rows.")


# ──────────────────────────────────────────────────────────────
#  ENDPOINTS
# ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Healthcare Real Estate Portfolio Backend"}


@app.get("/widgets.json")
def get_widgets():
    return JSONResponse(content=json.load((ROOT_PATH / "widgets.json").open()))


@app.get("/apps.json")
def get_apps():
    return JSONResponse(content=json.load((ROOT_PATH / "apps.json").open()))


@app.get("/portfolio")
def get_portfolio(view_mode: str = "Overview"):
    """
    Flat rows — every tenant has all deal + property fields.
    AgGrid rowGroup on Deal_Name + Property_Name creates the tree.
    350 deals, 723 properties, 2393 tenants. Cached at startup.
    """
    if view_mode == "Overview":
        return _PORTFOLIO_CACHE

    if view_mode == "Financials":
        hide = {"Term", "Lease_Expiry", "Rent_PSF", "Pct_RSF", "Lease_Type"}
    elif view_mode == "Lease Details":
        hide = {"Deal_Loan", "Deal_Value", "Deal_LTV", "DSCR", "Debt_Yield",
                "Prop_Loan", "Prop_Value", "Prop_LTV", "Credit"}
    else:
        return _PORTFOLIO_CACHE

    return [{k: (None if k in hide else v) for k, v in row.items()} for row in _PORTFOLIO_CACHE]


@app.get("/metrics")
def get_metrics():
    total_valuation = df_deals["Aggregate_Valuation"].sum()
    total_loan = df_deals["Aggregate_Loan_Amount"].sum()

    w_avg_ltv = _wavg(df_deals["LTV"], df_deals["Aggregate_Valuation"])
    w_avg_dscr = _wavg(df_deals["DSCR"], df_deals["Aggregate_Loan_Amount"])
    w_avg_yield = _wavg(df_deals["Debt_Yield"], df_deals["Aggregate_Loan_Amount"])

    return [
        {"label": "Total Portfolio Value", "value": f"${total_valuation / 1e9:.2f}B", "delta": "+2.5%"},
        {"label": "Total Loan Amount", "value": f"${total_loan / 1e9:.2f}B", "delta": "+1.8%"},
        {"label": "W.Avg LTV", "value": f"{w_avg_ltv * 100:.1f}%", "delta": "-0.5%"},
        {"label": "W.Avg DSCR", "value": f"{w_avg_dscr:.2f}x", "delta": "+0.05"},
        {"label": "W.Avg Debt Yield", "value": f"{w_avg_yield * 100:.1f}%", "delta": "+0.2%"},
    ]


@app.get("/portfolio_history")
def get_history(interval: str = "Quarter", show_composition: bool = False, theme: str = "dark"):
    try:
        df_deals["Maturity_Date"] = pd.to_datetime(df_deals["Maturity_Date"])
        freq_map = {"Month": "ME", "Quarter": "QE", "Year": "YE"}
        freq = freq_map.get(interval, "YE")

        def make_label(period, interval):
            if interval == "Quarter":
                return f"{period.quarter}Q{str(period.year)[-2:]}"
            elif interval == "Month":
                return period.strftime("%b '%y")
            return period.strftime("%Y")

        layout = dict(
            template=dark_template if theme == "dark" else "plotly_white",
            barmode="stack" if show_composition else "group",
            margin=dict(l=80, r=40, t=50, b=80),
            showlegend=False,
            title=dict(text=f"Maturity Schedule ({interval})", font=dict(size=14), x=0.01, y=0.98),
            xaxis=dict(title=f"Maturity ({interval})"),
            yaxis=dict(title="Volume Maturing ($)", tickprefix="$", tickformat="~s"),
        )

        fig = go.Figure()

        if show_composition:
            temp = df_deals.copy().set_index("Maturity_Date")
            pf = {"Month": "M", "Quarter": "Q", "Year": "Y"}.get(interval, "Y")
            temp["Period_Sort"] = temp.index.to_period(pf)
            grouped = temp.groupby(["Period_Sort", "Deal_Name"])[["Aggregate_Loan_Amount"]].sum().reset_index()
            grouped["Label"] = grouped["Period_Sort"].apply(lambda x: make_label(x, interval))
            grouped = grouped.sort_values(["Period_Sort", "Deal_Name"])
            sorted_labels = [make_label(p, interval) for p in sorted(grouped["Period_Sort"].unique())]
            layout["xaxis"]["categoryorder"] = "array"
            layout["xaxis"]["categoryarray"] = sorted_labels

            colors = ["#FF9800", "#03A9F4", "#4CAF50", "#FFC107", "#E91E63", "#9C27B0", "#00BCD4", "#CDDC39"]
            for i, deal in enumerate(grouped["Deal_Name"].unique()):
                dd = grouped[grouped["Deal_Name"] == deal]
                fig.add_trace(go.Bar(
                    x=dd["Label"], y=dd["Aggregate_Loan_Amount"], name=deal,
                    marker_color=colors[i % len(colors)],
                    hovertemplate=f"<b>{deal}</b><br>Maturity: %{{x}}<br>Amount: $%{{y:,.0f}}<extra></extra>",
                ))
        else:
            resampled = df_deals.set_index("Maturity_Date").resample(freq)["Aggregate_Loan_Amount"].sum().reset_index()
            resampled = resampled.sort_values("Maturity_Date")
            if interval == "Quarter":
                resampled["Label"] = resampled["Maturity_Date"].apply(lambda x: f"{(x.month - 1) // 3 + 1}Q{str(x.year)[-2:]}")
            elif interval == "Month":
                resampled["Label"] = resampled["Maturity_Date"].dt.strftime("%b '%y")
            else:
                resampled["Label"] = resampled["Maturity_Date"].dt.strftime("%Y")

            layout["xaxis"]["categoryorder"] = "array"
            layout["xaxis"]["categoryarray"] = resampled["Label"].tolist()
            fig.add_trace(go.Bar(
                x=resampled["Label"], y=resampled["Aggregate_Loan_Amount"], name="Total Volume",
                marker_color="#03A9F4",
                hovertemplate="<b>%{x}</b><br>Volume: $%{y:,.0f}<extra></extra>",
            ))

        fig.update_layout(**layout)
        return json.loads(fig.to_json())

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cashflows")
def get_cashflows(deal_id: str = ""):
    if not deal_id:
        return df_deals[["Deal_ID", "Deal_Name", "Strategy"]].to_dict(orient="records")

    tenant_cf = df_cashflows[df_cashflows["Deal_ID"] == deal_id].copy()
    if tenant_cf.empty:
        raise HTTPException(status_code=404, detail=f"No cashflows found for {deal_id}")

    monthly_income = tenant_cf.groupby("Month").agg(
        Total_Base_Rent=("Base_Rent", "sum"),
        Total_Exp_Reimb=("Expense_Reimbursement", "sum"),
        Total_Gross_Rent=("Gross_Rent", "sum"),
        Total_Vacancy_Adj=("Vacancy_Adj", "sum"),
        Total_Effective_Rent=("Effective_Rent", "sum"),
    ).reset_index()

    deal_ds = df_debt[df_debt["Deal_ID"] == deal_id].copy()
    combined = monthly_income.merge(
        deal_ds[["Month", "Interest", "Principal", "Total_Debt_Service", "Outstanding_Balance", "Is_IO_Period"]],
        on="Month", how="outer",
    )
    combined = combined.sort_values("Month").fillna(0)
    combined["Net_Cash_Flow"] = combined["Total_Effective_Rent"] - combined["Total_Debt_Service"]
    numeric_cols = combined.select_dtypes(include="number").columns
    combined[numeric_cols] = combined[numeric_cols].round(2)
    return combined.to_dict(orient="records")

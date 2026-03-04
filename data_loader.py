"""
Shared data loader — loads all HRE CSVs once at import time.
Both the Markets Monitor and Portfolio routes share these DataFrames.
"""
from pathlib import Path
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).parent.resolve()
DATA_DIR = BASE_DIR / "data"

def _load():
    df_deals    = pd.read_csv(DATA_DIR / "hre_deals.csv")
    df_props    = pd.read_csv(DATA_DIR / "hre_properties.csv")
    df_tenants  = pd.read_csv(DATA_DIR / "hre_tenants.csv")
    df_cashflows= pd.read_csv(DATA_DIR / "hre_cashflows.csv")
    df_debt     = pd.read_csv(DATA_DIR / "hre_debt_service.csv")
    print(f"[data_loader] Loaded {len(df_deals)} deals, {len(df_props)} props, {len(df_tenants)} tenants.")

    # Pre-compute Tenant_Type on deals
    tc  = df_tenants.groupby("Deal_ID")["Tenant_ID"].nunique()
    pc  = df_props.groupby("Deal_ID")["Property_ID"].nunique()
    ttm = {}
    for did in df_deals["Deal_ID"]:
        nt = tc.get(did, 0)
        np_ = pc.get(did, 0)
        ttm[did] = "Single Tenant" if (nt == np_ and np_ > 0) else "Multi Tenant"
    df_deals["Tenant_Type"] = df_deals["Deal_ID"].map(ttm)

    return df_deals, df_props, df_tenants, df_cashflows, df_debt

try:
    df_deals, df_props, df_tenants, df_cashflows, df_debt = _load()
except Exception as e:
    print(f"[data_loader] ERROR: {e}")
    df_deals = df_props = df_tenants = df_cashflows = df_debt = None


def wavg(values, weights):
    w = np.array(weights, dtype=float)
    v = np.array(values, dtype=float)
    mask = np.isfinite(v) & np.isfinite(w) & (w > 0)
    w, v = w[mask], v[mask]
    return float((v * w).sum() / w.sum()) if w.sum() > 0 else 0.0

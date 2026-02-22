import pandas as pd
import numpy as np

DATA = "c:/Users/ehamm/OneDrive/Desktop/Python Directory/openbb_widgets/dummy_data"
deals = pd.read_csv(f"{DATA}/hre_deals.csv")
props = pd.read_csv(f"{DATA}/hre_properties.csv")
tenants = pd.read_csv(f"{DATA}/hre_tenants.csv")

print(f"Deals: {len(deals)}, Props: {len(props)}, Tenants: {len(tenants)}")
print(f"Deal columns: {list(deals.columns)}")
print(f"Prop columns: {list(props.columns)}")
print(f"Tenant columns: {list(tenants.columns)}")

# 1. Property values vs Deal values
prop_val = props.groupby("Deal_ID")["Appraised_Value"].sum()
dv = deals.set_index("Deal_ID")["Aggregate_Valuation"]
c = pd.DataFrame({"prop": prop_val, "deal": dv})
c["diff_pct"] = abs(c["prop"] - c["deal"]) / c["deal"] * 100
print(f"\n--- PROP VALUE vs DEAL VALUE ---")
print(f"Mean diff: {c['diff_pct'].mean():.1f}%, Max: {c['diff_pct'].max():.1f}%")
print(f"Exact match (within 1%): {(c['diff_pct'] < 1).sum()}/{len(c)}")

# 2. Occupancy check
tsf = tenants.groupby("Property_ID")["Square_Feet"].sum()
pa = props.set_index("Property_ID")["Total_Area_SF"]
o = pd.DataFrame({"tsf": tsf, "pa": pa})
o["occ"] = o["tsf"] / o["pa"]
print(f"\n--- OCCUPANCY ---")
print(f"Mean: {o['occ'].mean():.2f}")
print(f"Min: {o['occ'].min():.2f}, Max: {o['occ'].max():.2f}")
print(f">100%: {int((o['occ'] > 1).sum())}/{len(o)}")
print(f"<50%: {int((o['occ'] < 0.5).sum())}/{len(o)}")
print(f">200%: {int((o['occ'] > 2).sum())}/{len(o)}")

# 3. Maturity dates
deals["Maturity_Date"] = pd.to_datetime(deals["Maturity_Date"])
print(f"\n--- MATURITY DATES ---")
print(f"Range: {deals['Maturity_Date'].min().date()} to {deals['Maturity_Date'].max().date()}")
print("By year:")
print(deals["Maturity_Date"].dt.year.value_counts().sort_index())

# 4. Deal Name uniqueness
print(f"\n--- DEAL NAMES ---")
print(f"Unique: {deals['Deal_Name'].nunique()}/{len(deals)}")
print("Top duplicated:")
print(deals["Deal_Name"].value_counts().head(5))

# 5. DSCR / Debt Yield check
print(f"\n--- FINANCIAL METRICS ---")
print(f"DSCR: mean={deals['DSCR'].mean():.2f}, min={deals['DSCR'].min():.2f}, max={deals['DSCR'].max():.2f}")
print(f"Debt Yield: mean={deals['Debt_Yield'].mean():.4f}, min={deals['Debt_Yield'].min():.4f}, max={deals['Debt_Yield'].max():.4f}")
print(f"LTV: mean={deals['LTV'].mean():.2f}, min={deals['LTV'].min():.2f}, max={deals['LTV'].max():.2f}")

# 6. Do tenant rents reconcile to NOI?
ten_rent_by_deal = tenants.groupby("Deal_ID")["Annual_Rent"].sum()
deal_noi = deals.set_index("Deal_ID")["NOI"]
nr = pd.DataFrame({"tenant_rent": ten_rent_by_deal, "deal_noi": deal_noi})
nr["ratio"] = nr["tenant_rent"] / nr["deal_noi"]
print(f"\n--- RENT vs NOI RECONCILIATION ---")
print(f"Tenant Rent / Deal NOI ratio:")
print(f"  Mean: {nr['ratio'].mean():.2f}")
print(f"  Min: {nr['ratio'].min():.2f}, Max: {nr['ratio'].max():.2f}")

# 7. Lease term check
tenants["Lease_End"] = pd.to_datetime(tenants["Lease_End"])
tenants["Lease_Start"] = pd.to_datetime(tenants["Lease_Start"])
today = pd.to_datetime("today")
tenants["remaining"] = (tenants["Lease_End"] - today).dt.days / 365.25
print(f"\n--- LEASE TERMS ---")
print(f"Expired leases (remaining < 0): {(tenants['remaining'] < 0).sum()}/{len(tenants)}")
print(f"Remaining term: mean={tenants['remaining'].mean():.1f}yr, min={tenants['remaining'].min():.1f}yr, max={tenants['remaining'].max():.1f}yr")

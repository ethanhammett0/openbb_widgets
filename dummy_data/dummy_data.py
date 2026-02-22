import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)
np.random.seed(42)

# --- CONFIGURATION ---
NUM_DEALS = 350
ANCHOR_DATE = datetime(2025, 12, 6)

# --- ONTOLOGY: SPONSORS ---
sponsors = {
    "Apex Healthcare": {"tier": 1},
    "Beacon Capital": {"tier": 1},
    "Silver Care Partners": {"tier": 2},
    "Midwest Health Ops": {"tier": 3},
}

# --- ONTOLOGY: ASSET CLASSES ---
asset_profiles = {
    "Medical Office": {
        "base_cap": (0.055, 0.070),
        "base_rent_psf": 25,
        "lease_type": "NNN",
        "exp_ratio": 0.05,
    },
    "Senior Housing": {
        "base_cap": (0.065, 0.085),
        "base_rent_psf": 35,
        "lease_type": "Modified Gross",
        "exp_ratio": 0.35,
    },
    "Life Science": {
        "base_cap": (0.060, 0.075),
        "base_rent_psf": 65,
        "lease_type": "NNN",
        "exp_ratio": 0.05,
    },
    "Skilled Nursing": {
        "base_cap": (0.085, 0.105),
        "base_rent_psf": 40,
        "lease_type": "NNN",
        "exp_ratio": 0.08,
    },
}

# --- STRATEGY PROFILES ---
# IO periods inverted: stronger profiles get MORE IO (lender trusts the cashflows)
strategy_profiles = {
    "Core": {
        "weight": 0.25,
        "ltv_range": (0.45, 0.55),
        "occ_range": (0.95, 0.99),
        "cap_adj": (0.0, 0.0),          # baseline
        "spread_range": (200, 300),
        "loan_term_months": (60, 84),    # 5-7yr
        "io_months": (18, 24),           # longest IO - lender trusts profile
        "amort_years": (25, 30),
        "lease_years": (10, 20),
        "escalation": 0.025,             # 2.5% fixed annual
        "property_conditions": {"Stabilized": 1.0},
        "is_portfolio_prob": 0.35,
        "num_props_range": (3, 8),
    },
    "Core+": {
        "weight": 0.30,
        "ltv_range": (0.55, 0.65),
        "occ_range": (0.88, 0.96),
        "cap_adj": (0.005, 0.015),
        "spread_range": (275, 400),
        "loan_term_months": (36, 60),    # 3-5yr
        "io_months": (12, 18),           # moderate IO
        "amort_years": (25, 25),
        "lease_years": (7, 15),
        "escalation": 0.028,             # 2.5-3% blended
        "property_conditions": {"Stabilized": 0.75, "Below-Market": 0.25},
        "is_portfolio_prob": 0.30,
        "num_props_range": (2, 6),
    },
    "Value-Add": {
        "weight": 0.30,
        "ltv_range": (0.60, 0.72),
        "occ_range": (0.70, 0.88),
        "cap_adj": (0.015, 0.035),
        "spread_range": (350, 525),
        "loan_term_months": (24, 48),    # 2-4yr
        "io_months": (0, 6),             # short IO - lender wants paydown
        "amort_years": (25, 25),
        "lease_years": (3, 10),
        "escalation": 0.030,             # 3% or CPI
        "property_conditions": {"Stabilized": 0.45, "Below-Market": 0.35, "Transitional": 0.20},
        "is_portfolio_prob": 0.25,
        "num_props_range": (2, 10),
    },
    "Lease-Up": {
        "weight": 0.15,
        "ltv_range": (0.60, 0.75),
        "occ_range": (0.20, 0.60),
        "cap_adj": (0.035, 0.065),
        "spread_range": (450, 650),
        "loan_term_months": (24, 36),    # 2-3yr
        "io_months": "full",             # full term IO - no income to amortize
        "amort_years": None,
        "lease_years": (5, 10),
        "escalation": 0.033,             # 3-3.5%
        "property_conditions": {"Lease-Up": 1.0},
        "is_portfolio_prob": 0.15,
        "num_props_range": (1, 3),
    },
}

# Property condition adjustments
condition_profiles = {
    "Stabilized": {"occ_range": (0.92, 0.99), "cap_adj": (0.0, 0.005)},
    "Below-Market": {"occ_range": (0.80, 0.92), "cap_adj": (0.005, 0.015)},
    "Transitional": {"occ_range": (0.65, 0.80), "cap_adj": (0.010, 0.025)},
    "Lease-Up": {"occ_range": (0.20, 0.60), "cap_adj": (0.020, 0.040)},
}

# --- HELPER FUNCTIONS ---
def banker_round(val, precision=100000):
    return int(round(val / precision) * precision)

def get_market_base_rate(date_obj):
    days_from_start = (date_obj - (ANCHOR_DATE - timedelta(days=730))).days
    progress = days_from_start / 730
    base = 0.053 - (0.008 * progress)
    noise = random.uniform(-0.001, 0.001)
    return round(base + noise, 4)

def pick_condition(strategy_name):
    """Pick a property condition based on strategy's condition weights."""
    sp = strategy_profiles[strategy_name]
    conditions = list(sp["property_conditions"].keys())
    weights = list(sp["property_conditions"].values())
    return random.choices(conditions, weights=weights, k=1)[0]

# --- Pre-generate city pools ---
city_pools = {}
for state in ["CA","TX","FL","NY","IL","PA","OH","GA","NC","AZ","MA","NJ","VA","WA","CO","TN","MD","MN","WI","MO"]:
    city_pools[state] = [fake.city() for _ in range(20)]
all_states = list(city_pools.keys())

# --- GENERATORS ---
deals_data = []
properties_data = []
leases_data = []
cashflows_data = []
debt_service_data = []
deal_name_counter = {}

# Select strategies for all deals up front
strategy_names = list(strategy_profiles.keys())
strategy_weights = [strategy_profiles[s]["weight"] for s in strategy_names]
deal_strategies = random.choices(strategy_names, weights=strategy_weights, k=NUM_DEALS)

print("Generating realistic HRE data with strategies and cashflows...")

for i in range(NUM_DEALS):
    deal_id = f"HRE-{2024}-{100+i}"
    strategy = deal_strategies[i]
    sp = strategy_profiles[strategy]

    # 1. Context
    closing_date = ANCHOR_DATE - timedelta(days=random.randint(10, 700))
    sofr = get_market_base_rate(closing_date)
    
    sponsor_name = random.choice(list(sponsors.keys()))
    sp_tier = sponsors[sponsor_name]["tier"]
    
    asset_type = random.choices(
        list(asset_profiles.keys()), 
        weights=[0.4, 0.3, 0.15, 0.15]
    )[0]
    ap = asset_profiles[asset_type]
    
    deal_type = random.choices(["Acquisition", "Refinance", "Construction"], weights=[0.55, 0.35, 0.10])[0]
    if strategy == "Lease-Up":
        deal_type = random.choice(["Acquisition", "Construction"])
    
    is_portfolio = random.random() < sp["is_portfolio_prob"]

    # 2. Loan Structure (strategy-driven)
    loan_term_months = random.randint(*sp["loan_term_months"])
    
    if sp["io_months"] == "full":
        io_months = loan_term_months
        amort_years = None
    else:
        io_months = random.randint(*sp["io_months"])
        amort_years = random.choice(range(sp["amort_years"][0], sp["amort_years"][1]+1))
    
    maturity_date = closing_date + timedelta(days=loan_term_months * 30)

    # 3. LTV (strategy-driven)
    ltv_min, ltv_max = sp["ltv_range"]
    deal_ltv_target = random.uniform(ltv_min, ltv_max)
    if sp_tier == 1:
        deal_ltv_target = max(ltv_min, deal_ltv_target - 0.02)
    
    # 4. Spread (strategy-driven)
    spread = random.randint(*sp["spread_range"])
    if sp_tier == 1: spread -= 15
    if sp_tier == 3: spread += 25
    all_in_rate = round(sofr + (spread / 10000), 4)
    
    # 5. Cap Rate (asset + strategy)
    base_cap_min, base_cap_max = ap["base_cap"]
    cap_adj_min, cap_adj_max = sp["cap_adj"]
    deal_cap_rate = random.uniform(base_cap_min, base_cap_max) + random.uniform(cap_adj_min, cap_adj_max)
    deal_cap_rate = round(deal_cap_rate, 4)

    # 6. Valuation
    base_check = 50_000_000 if is_portfolio else 18_000_000
    valuation = banker_round(np.random.lognormal(0, 0.5) * base_check)
    if valuation < 8_000_000:
        valuation = 8_000_000

    credit_rating = random.choices(
        ["AAA", "AA+", "AA", "A+", "A", "BBB+", "BBB", "BB+", "BB"],
        weights=[5, 10, 15, 20, 25, 15, 5, 3, 2]
    )[0]

    # --- UNIQUE DEAL NAME ---
    deal_state = random.choice(all_states)
    deal_city = random.choice(city_pools[deal_state])
    structure_label = "Portfolio" if is_portfolio else "Facility"
    base_name = f"{sponsor_name} {asset_type} {structure_label}"
    deal_name = f"{base_name} - {deal_city}"
    if deal_name in deal_name_counter:
        deal_name_counter[deal_name] += 1
        deal_name = f"{deal_name} {deal_name_counter[deal_name]}"
    else:
        deal_name_counter[deal_name] = 1

    # --- PROPERTIES & TENANTS ---
    num_props = random.randint(*sp["num_props_range"]) if is_portfolio else 1
    prop_vals = np.random.dirichlet(np.ones(num_props)) * valuation
    
    prop_ltvs = []
    prop_loans = []
    deal_last_lease_end = closing_date  # track for cashflow horizon

    if is_portfolio:
        prop_states = random.sample(all_states, min(num_props, len(all_states)))
        if len(prop_states) < num_props:
            prop_states += [random.choice(all_states) for _ in range(num_props - len(prop_states))]
    else:
        prop_states = [deal_state]

    for p_idx in range(num_props):
        prop_id = f"{deal_id}-P{p_idx+1}"
        p_val = prop_vals[p_idx]
        p_val_clean = banker_round(p_val, 10000)
        if p_val_clean < 1_000_000:
            p_val_clean = 1_000_000

        # Property condition (strategy-driven)
        condition = pick_condition(strategy)
        cond_profile = condition_profiles[condition]

        # Condition-driven occupancy TARGET
        target_occ = random.uniform(*cond_profile["occ_range"])
        
        # Condition-driven cap rate adjustment
        p_cap_adj = random.uniform(*cond_profile["cap_adj"])
        p_cap = round(deal_cap_rate + p_cap_adj, 4)
        
        # Property LTV — varies by condition
        if condition == "Stabilized":
            prop_ltv = deal_ltv_target + random.normalvariate(0, 0.015)
        elif condition == "Below-Market":
            prop_ltv = deal_ltv_target + random.uniform(0.02, 0.06)
        elif condition == "Transitional":
            prop_ltv = deal_ltv_target + random.uniform(0.04, 0.10)
        else:  # Lease-Up
            prop_ltv = deal_ltv_target + random.uniform(0.0, 0.05)
        prop_ltv = max(0.40, min(prop_ltv, 0.85))
        prop_ltv = round(prop_ltv, 4)
        
        prop_loan = banker_round(p_val_clean * prop_ltv, 10000)
        prop_ltvs.append(prop_ltv)
        prop_loans.append(prop_loan)

        p_state = prop_states[p_idx % len(prop_states)]
        p_city = random.choice(city_pools[p_state])
        prop_address = f"{random.randint(1, 999)} {fake.street_name()}"

        # --- TENANTS ---
        prop_noi = p_val_clean * p_cap
        
        if asset_type in ["Skilled Nursing", "Senior Housing"]:
            num_tenants = 1
        elif asset_type == "Medical Office":
            num_tenants = random.randint(3, 10) if condition != "Lease-Up" else random.randint(1, 3)
        elif asset_type == "Life Science":
            num_tenants = random.randint(1, 4)
        else:
            num_tenants = random.randint(1, 5)

        tenant_shares = np.random.dirichlet(np.ones(num_tenants))
        prop_tenant_sf_total = 0
        prop_tenants_buffer = []

        for t_idx, share in enumerate(tenant_shares):
            t_id = f"{prop_id}-T{t_idx+1}"
            allocated_noi = prop_noi * share
            annual_rent = allocated_noi / (1 - ap["exp_ratio"])
            
            rent_psf = ap["base_rent_psf"] * random.uniform(0.8, 1.2)
            if condition == "Below-Market":
                rent_psf *= random.uniform(0.75, 0.90)  # below market rents
            elif condition == "Lease-Up":
                rent_psf *= random.uniform(0.85, 1.05)   # competitive to attract

            sf = max(500, int(annual_rent / rent_psf))
            
            # Lease terms driven by strategy
            lease_min, lease_max = sp["lease_years"]
            lease_years = random.randint(lease_min, lease_max)
            
            if condition == "Transitional":
                lease_years = min(lease_years, random.randint(2, 5))
            
            lease_start = closing_date - timedelta(days=random.randint(0, 800))
            if condition == "Lease-Up":
                # Lease-Up tenants sign during/after closing
                lease_start = closing_date + timedelta(days=random.randint(0, 365))
            
            lease_end = lease_start + timedelta(days=365 * lease_years)
            if lease_end > deal_last_lease_end:
                deal_last_lease_end = lease_end

            # Tenant naming by sector
            t_name = fake.company()
            suffixes = {
                "Skilled Nursing": " Care Ops",
                "Senior Housing": " Senior Living",
                "Medical Office": " Practices",
                "Life Science": " BioTech"
            }
            t_name += suffixes.get(asset_type, "")
            
            # Lease type from asset profile
            lease_type = ap["lease_type"]
            
            # Expense reimbursement rate
            if lease_type == "NNN":
                exp_reimb_psf = rent_psf * random.uniform(0.08, 0.15)  # NNN pass-throughs
            elif lease_type == "Modified Gross":
                exp_reimb_psf = rent_psf * random.uniform(0.03, 0.08)
            else:
                exp_reimb_psf = 0.0
            
            prop_tenant_sf_total += sf

            prop_tenants_buffer.append({
                "Tenant_ID": t_id,
                "Property_ID": prop_id,
                "Deal_ID": deal_id,
                "Tenant_Name": t_name,
                "Asset_Type": asset_type,
                "Lease_Type": lease_type,
                "Lease_Start": lease_start.strftime('%Y-%m-%d'),
                "Lease_End": lease_end.strftime('%Y-%m-%d'),
                "Rent_PSF": round(rent_psf, 2),
                "Square_Feet": sf,
                "Annual_Rent": round(annual_rent, 2),
                "Expense_Reimb_PSF": round(exp_reimb_psf, 2),
                "Escalation_Rate": sp["escalation"],
            })
        
        # Derive Total_Area_SF from tenant SF + vacancy
        if target_occ > 0:
            total_area = max(prop_tenant_sf_total, int(prop_tenant_sf_total / target_occ))
        else:
            total_area = prop_tenant_sf_total + random.randint(5000, 20000)
        
        leases_data.extend(prop_tenants_buffer)

        properties_data.append({
            "Property_ID": prop_id,
            "Deal_ID": deal_id,
            "Property_Name": f"{prop_address} ({asset_type})",
            "Address": prop_address,
            "City": p_city,
            "State": p_state,
            "Asset_Type": asset_type,
            "Property_Condition": condition,
            "Appraised_Value": p_val_clean,
            "Property_Loan": prop_loan,
            "Property_LTV": prop_ltv,
            "Cap_Rate": round(p_cap, 4),
            "Total_Area_SF": total_area,
        })

    # --- Compute deal-level aggregates ---
    agg_loan = sum(prop_loans)
    agg_value = sum(banker_round(v, 10000) for v in prop_vals)
    if agg_value < 1_000_000:
        agg_value = 1_000_000
    deal_ltv = round(agg_loan / agg_value, 4) if agg_value > 0 else 0
    deal_noi = int(agg_value * deal_cap_rate)
    
    debt_yield = round(deal_noi / agg_loan, 4) if agg_loan > 0 else 0
    ds = agg_loan * all_in_rate
    dscr = round(deal_noi / ds, 2) if ds > 0 else 0

    deals_data.append({
        "Deal_ID": deal_id,
        "Deal_Name": deal_name,
        "Strategy": strategy,
        "Sponsor": sponsor_name,
        "Structure": "Portfolio" if is_portfolio else "Single Asset",
        "Deal_Type": deal_type,
        "Closing_Date": closing_date.strftime('%Y-%m-%d'),
        "Aggregate_Loan_Amount": agg_loan,
        "Aggregate_Valuation": agg_value,
        "LTV": deal_ltv,
        "Interest_Rate": all_in_rate,
        "Spread_bps": spread,
        "Maturity_Date": maturity_date.strftime('%Y-%m-%d'),
        "Loan_Term_Months": loan_term_months,
        "IO_Months": io_months,
        "Amort_Years": amort_years,
        "Cap_Rate": deal_cap_rate,
        "Debt_Yield": debt_yield,
        "DSCR": dscr,
        "NOI": deal_noi,
        "Credit_Rating": credit_rating,
    })

    # --- MONTHLY TENANT CASHFLOWS ---
    # Horizon: closing_date → last lease expiration
    cf_start = closing_date.replace(day=1)
    cf_end = deal_last_lease_end.replace(day=1) + relativedelta(months=1)
    
    for tenant in prop_tenants_buffer:
        t_lease_start = pd.to_datetime(tenant["Lease_Start"])
        t_lease_end = pd.to_datetime(tenant["Lease_End"])
        t_annual_rent = tenant["Annual_Rent"]
        t_sf = tenant["Square_Feet"]
        t_exp_reimb_psf = tenant["Expense_Reimb_PSF"]
        escalation = tenant["Escalation_Rate"]
        
        current_month = cf_start
        while current_month < cf_end:
            # Years since lease start for escalation
            if current_month >= t_lease_start:
                years_elapsed = (current_month - t_lease_start).days / 365.25
            else:
                years_elapsed = 0
            
            # Escalated base rent (compounds annually on anniversary)
            escalation_factor = (1 + escalation) ** int(years_elapsed)
            monthly_base = (t_annual_rent * escalation_factor) / 12
            
            # Expense reimbursement (also escalates with inflation ~2%)
            monthly_exp_reimb = (t_exp_reimb_psf * t_sf * (1.02 ** int(years_elapsed))) / 12
            
            gross_rent = round(monthly_base + monthly_exp_reimb, 2)
            
            # Vacancy: 0 rent outside lease term
            is_occupied = t_lease_start <= current_month < t_lease_end
            vacancy_adj = 0.0 if is_occupied else -gross_rent
            effective_rent = round(gross_rent + vacancy_adj, 2)
            
            cashflows_data.append({
                "Tenant_ID": tenant["Tenant_ID"],
                "Property_ID": tenant["Property_ID"],
                "Deal_ID": tenant["Deal_ID"],
                "Month": current_month.strftime('%Y-%m-%d'),
                "Base_Rent": round(monthly_base, 2),
                "Expense_Reimbursement": round(monthly_exp_reimb, 2),
                "Gross_Rent": gross_rent,
                "Vacancy_Adj": round(vacancy_adj, 2),
                "Effective_Rent": effective_rent,
            })
            
            current_month += relativedelta(months=1)

    # --- DEAL-LEVEL DEBT SERVICE ---
    monthly_rate = all_in_rate / 12
    outstanding = agg_loan
    
    if amort_years and amort_years > 0:
        n_amort_payments = amort_years * 12
        # Fixed monthly P&I payment (after IO period)
        if monthly_rate > 0:
            amort_payment = outstanding * (monthly_rate * (1 + monthly_rate)**n_amort_payments) / \
                           ((1 + monthly_rate)**n_amort_payments - 1)
        else:
            amort_payment = outstanding / n_amort_payments
    else:
        amort_payment = 0  # full-term IO
    
    ds_month = closing_date.replace(day=1)
    ds_end = maturity_date.replace(day=1) + relativedelta(months=1)
    month_counter = 0
    
    while ds_month < ds_end:
        month_counter += 1
        is_io = month_counter <= io_months
        
        interest = round(outstanding * monthly_rate, 2)
        
        if is_io:
            principal = 0.0
            total_ds = interest
        else:
            principal = round(amort_payment - interest, 2)
            if principal < 0:
                principal = 0.0
            total_ds = round(interest + principal, 2)
        
        outstanding = max(0, outstanding - principal)
        
        debt_service_data.append({
            "Deal_ID": deal_id,
            "Month": ds_month.strftime('%Y-%m-%d'),
            "Interest": interest,
            "Principal": principal,
            "Total_Debt_Service": total_ds,
            "Outstanding_Balance": round(outstanding, 2),
            "Is_IO_Period": is_io,
        })
        
        ds_month += relativedelta(months=1)

# --- EXPORT ---
df_deals = pd.DataFrame(deals_data)
df_props = pd.DataFrame(properties_data)
df_tenants = pd.DataFrame(leases_data)
df_cashflows = pd.DataFrame(cashflows_data)
df_debt = pd.DataFrame(debt_service_data)

print(f"Generated {len(df_deals)} deals, {len(df_props)} properties, {len(df_tenants)} tenants.")
print(f"Generated {len(df_cashflows)} tenant cashflow rows, {len(df_debt)} debt service rows.")
print(f"Unique deal names: {df_deals['Deal_Name'].nunique()}/{len(df_deals)}")

# --- VERIFICATION ---
print("\n--- Strategy Distribution ---")
strat_counts = df_deals["Strategy"].value_counts()
for s in strategy_names:
    count = strat_counts.get(s, 0)
    pct = count / NUM_DEALS * 100
    target = strategy_profiles[s]["weight"] * 100
    print(f"  {s}: {count} ({pct:.1f}% vs target {target:.0f}%)")

print("\n--- Property Conditions by Strategy ---")
merged_check = df_props.merge(df_deals[["Deal_ID", "Strategy"]], on="Deal_ID")
for strat in strategy_names:
    sub = merged_check[merged_check["Strategy"] == strat]
    if len(sub) > 0:
        conds = sub["Property_Condition"].value_counts(normalize=True) * 100
        print(f"  {strat}: {dict(conds.round(1))}")

print("\n--- Occupancy by Condition ---")
tsf = df_tenants.groupby("Property_ID")["Square_Feet"].sum()
pa = df_props.set_index("Property_ID")["Total_Area_SF"]
occ = (tsf / pa).clip(upper=1.0)
occ_df = pd.DataFrame({"occ": occ}).join(df_props.set_index("Property_ID")["Property_Condition"])
for cond in condition_profiles:
    sub = occ_df[occ_df["Property_Condition"] == cond]
    if len(sub) > 0:
        print(f"  {cond}: mean={sub['occ'].mean():.2f}, range=[{sub['occ'].min():.2f}, {sub['occ'].max():.2f}]")

print("\n--- IO Months by Strategy ---")
for strat in strategy_names:
    sub = df_deals[df_deals["Strategy"] == strat]
    print(f"  {strat}: mean={sub['IO_Months'].mean():.1f}, range=[{sub['IO_Months'].min()}, {sub['IO_Months'].max()}]")

print("\n--- Cashflow Aggregation Check ---")
# Check: sum of tenant effective rent per deal per month = deal-level income
sample_deal = df_deals.iloc[0]["Deal_ID"]
deal_cf = df_cashflows[df_cashflows["Deal_ID"] == sample_deal]
monthly_totals = deal_cf.groupby("Month")["Effective_Rent"].sum()
print(f"  Sample deal {sample_deal}: {len(monthly_totals)} months of cashflows")
print(f"  Monthly income range: ${monthly_totals.min():,.0f} - ${monthly_totals.max():,.0f}")

# Check debt service
deal_ds = df_debt[df_debt["Deal_ID"] == sample_deal]
io_rows = deal_ds[deal_ds["Is_IO_Period"]]
amort_rows = deal_ds[~deal_ds["Is_IO_Period"]]
print(f"  IO months: {len(io_rows)}, Amort months: {len(amort_rows)}")
if len(io_rows) > 0:
    print(f"  IO payment (interest only): ${io_rows['Total_Debt_Service'].iloc[0]:,.0f}/mo")
if len(amort_rows) > 0:
    print(f"  Amort payment (P&I): ${amort_rows['Total_Debt_Service'].iloc[0]:,.0f}/mo")

df_deals.to_csv("hre_deals.csv", index=False)
df_props.to_csv("hre_properties.csv", index=False)
df_tenants.to_csv("hre_tenants.csv", index=False)
df_cashflows.to_csv("hre_cashflows.csv", index=False)
df_debt.to_csv("hre_debt_service.csv", index=False)

print("\n5 CSVs exported successfully.")

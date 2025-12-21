import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# --- CONFIGURATION ---
NUM_DEALS = 200 # Smaller number of deals, but multiplied by properties/leases
ANCHOR_DATE = datetime(2025, 12, 6)

# --- REFERENCE DATA ---
sponsors = {
    "Apex Healthcare": {"tier": "Tier 1", "strategy": "Core+"},
    "Silver Care Partners": {"tier": "Tier 2", "strategy": "Value-Add"},
    "Midwest Health Ops": {"tier": "Tier 3", "strategy": "Opportunistic"},
    "Beacon Capital": {"tier": "Tier 1", "strategy": "Core"},
}

# --- HELPER FUNCTIONS ---
def get_market_regime(date_obj):
    progress = (ANCHOR_DATE - date_obj).days / 730
    sofr = 0.053 if progress < 0.5 else 0.045
    tightness = progress
    return sofr, tightness

def banker_round(val, precision=100000):
    return int(round(val / precision) * precision)

# --- 1. DEAL GENERATOR ---
deals_data = []
properties_data = []
leases_data = []

for i in range(NUM_DEALS):
    deal_id = f"HRE-{1000+i}"
    
    # Context
    is_portfolio = random.random() < 0.25 # 25% are Portfolios
    closing_date = ANCHOR_DATE - timedelta(days=random.randint(10, 730))
    sofr, tightness = get_market_regime(closing_date)
    
    sponsor_name = random.choice(list(sponsors.keys()))
    sp_data = sponsors[sponsor_name]
    
    # Asset Strategy
    asset_subtype = random.choice(["Medical Office", "Senior Housing", "Skilled Nursing", "Life Science"])
    deal_type = random.choices(["Acquisition", "Refinance", "Construction"], weights=[0.6, 0.3, 0.1])[0]
    
    # Deal Economics (Aggregate)
    base_check = 40_000_000 if is_portfolio else 15_000_000
    valuation = banker_round(np.random.lognormal(0, 0.4) * base_check)
    if valuation < 5_000_000: valuation = 5_000_000
    
    # LTV Logic
    ltv = 0.75 - (tightness * 0.10)
    ltv = round(ltv * random.uniform(0.9, 1.0), 2)
    loan_amount = banker_round(valuation * ltv)
    
    # Spread Logic
    spread = 350 + int(tightness * 100)
    all_in_rate = round(sofr + (spread/10000), 4)

    # --- ADVANCED METRICS ---
    # 1. Cap Rate (Deal Level Approximation)
    deal_cap_rate = 0.05 + (spread/10000) + random.uniform(-0.005, 0.005)
    deal_noi = int(valuation * deal_cap_rate)
    
    # 2. LTC (Loan to Cost)
    # Assume cost was somewhat lower or higher than current valuation depending on timing, 
    # but for simplicity let's model Total Project Cost.
    total_cost = int(valuation * random.uniform(0.95, 1.10)) 
    ltc = round(loan_amount / total_cost, 2)
    
    # 3. Debt Yield (NOI / Loan Amount)
    debt_yield = round(deal_noi / loan_amount, 4)
    
    # 4. DSCR (NOI / Annual Debt Service)
    # Simple Interest-Only for calculation to avoid amortization math complexity in dummy script
    annual_debt_service = loan_amount * all_in_rate
    dscr = round(deal_noi / annual_debt_service, 2)

    deals_data.append({
        "Deal_ID": deal_id,
        "Deal_Name": f"{sponsor_name} {asset_subtype} {'Portfolio' if is_portfolio else 'facility'}",
        "Sponsor": sponsor_name,
        "Structure": "Portfolio" if is_portfolio else "Single Asset",
        "Deal_Type": deal_type,
        "Closing_Date": closing_date.strftime('%Y-%m-%d'),
        "Aggregate_Loan_Amount": loan_amount,
        "Aggregate_Valuation": valuation,
        "LTV": ltv,
        "Interest_Rate": all_in_rate,
        "Spread_bps": spread,
        # New Metrics
        "LTC": ltc,
        "Cap_Rate": round(deal_cap_rate, 4), # storing aggregate cap rate
        "Debt_Yield": debt_yield,
        "DSCR": dscr,
        "Total_Cost": total_cost,
        "NOI": deal_noi
    })
    
    # --- 2. PROPERTY GENERATOR (The One-to-Many) ---
    num_props = random.randint(3, 8) if is_portfolio else 1
    
    # Allocate Loan Amount across properties (roughly equal but messy)
    prop_valuations = np.random.dirichlet(np.ones(num_props)) * valuation
    
    for p_idx, p_val in enumerate(prop_valuations):
        prop_id = f"{deal_id}-P{p_idx+1}"
        p_val_clean = banker_round(p_val, 50000)
        p_loan_clean = banker_round(loan_amount * (p_val/valuation), 50000)
        
        city = fake.city()
        state = fake.state_abbr()
        
        # Cap Rate Variance per Property (Portfolio dispersion)
        prop_cap = 0.06 + random.uniform(-0.005, 0.005)
        prop_noi = int(p_val_clean * prop_cap)
        
        properties_data.append({
            "Property_ID": prop_id,
            "Deal_ID": deal_id, # LINK TO PARENT
            "Address": f"{random.randint(100,999)} {fake.street_name()}",
            "City": city,
            "State": state,
            "Asset_Type": asset_subtype,
            "Allocated_Loan_Amount": p_loan_clean,
            "Appraised_Value": p_val_clean,
            "Property_NOI": prop_noi,
            "Cap_Rate": round(prop_cap, 4)
        })
        
        # --- 3. RENT ROLL GENERATOR (The Many-to-Many) ---
        # Each property gets its own rent roll
        if asset_subtype in ["Senior Housing", "Skilled Nursing"]:
            # Operator Lease (Single Tenant)
                leases_data.append({
                    "Lease_ID": f"{prop_id}-L1",
                    "Property_ID": prop_id, # LINK TO PROPERTY
                    "Tenant_Name": f"{sponsor_name} OpCo",
                    "Suite": "Entire Facility",
                    "SF": 0, # N/A for beds
                    "Rent_PSF_Monthly": 0.0,
                    "Annual_Rent": prop_noi, # Triple Net
                    "Escalation_Rate": 0.02, # Standard 2% for Master Lease
                    "Lease_Start": (closing_date - timedelta(days=300)).strftime('%Y-%m-%d'),
                    "Lease_Expiration": (closing_date + timedelta(days=365*10)).strftime('%Y-%m-%d'),
                    "Lease_Type": "Master Lease"
                })
        else:
            # Multi-Tenant (MOB/Life Science)
            prop_sf = int(p_val_clean / 300) # Estimate SF
            remaining_sf = prop_sf * 0.90 # 90% Occupancy
            
            num_tenants = random.randint(3, 10)
            for t_idx in range(num_tenants):
                t_sf = int(remaining_sf / num_tenants * random.uniform(0.8, 1.2))
                # Suite Logic
                suite_number = f"{100 + (t_idx * 10)}"
                
                # Rent & Escalations
                base_rent_psf_monthly = round(random.uniform(2.0, 4.0), 2) # $24-$48 annualized
                annual_escalation = random.choice([0.02, 0.025, 0.03, 0.0])
                
                annual_rent = int(t_sf * base_rent_psf_monthly * 12)
                
                # Staggered Expirations
                months_to_expire = random.randint(6, 60)
                exp_date = ANCHOR_DATE + timedelta(days=months_to_expire*30)
                
                leases_data.append({
                    "Lease_ID": f"{prop_id}-L{t_idx+1}",
                    "Property_ID": prop_id,
                    "Tenant_Name": fake.company(),
                    "Suite": suite_number,
                    "SF": t_sf,
                    "Rent_PSF_Monthly": base_rent_psf_monthly,
                    "Annual_Rent": annual_rent,
                    "Escalation_Rate": annual_escalation,
                    "Lease_Start": (ANCHOR_DATE - timedelta(days=500)).strftime('%Y-%m-%d'),
                    "Lease_Expiration": exp_date.strftime('%Y-%m-%d'),
                    "Lease_Type": "NNN"
                })

# --- EXPORT ---
df_deals = pd.DataFrame(deals_data)
df_props = pd.DataFrame(properties_data)
df_leases = pd.DataFrame(leases_data)

print("Generated Relational Dataset:")
print(f"Deals: {len(df_deals)} | Properties: {len(df_props)} | Leases: {len(df_leases)}")

df_deals.to_csv("hre_deals.csv", index=False)
df_props.to_csv("hre_properties.csv", index=False)
df_leases.to_csv("hre_rent_roll.csv", index=False)
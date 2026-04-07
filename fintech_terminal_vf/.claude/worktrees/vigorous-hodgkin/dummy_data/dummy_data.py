import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# --- CONFIGURATION ---
NUM_DEALS = 350 # Increased for better cloud visualization
ANCHOR_DATE = datetime(2025, 12, 6)

# --- ONTOLOGY: SPONSORS ---
sponsors = {
    "Apex Healthcare": {"tier": 1, "strategy": "Core+"}, # Tier 1: Better rates
    "Beacon Capital": {"tier": 1, "strategy": "Core"},
    "Silver Care Partners": {"tier": 2, "strategy": "Value-Add"},
    "Midwest Health Ops": {"tier": 3, "strategy": "Opportunistic"}, # Tier 3: Higher risk premium
}

# --- ONTOLOGY: ASSET CLASSES (2024-2025 Market profiles) ---
# Data derived from research: MOB (Safe), SH (Improving), LS (Volatile), SNF (High Yield)
asset_profiles = {
    "Medical Office": {
        "risk_profile": "Defensive",
        "cap_range": (0.0575, 0.0700),
        "spread_range": (275, 375),
        "ltv_target": 0.65,
        "volatility": 0.02 # Low variance
    },
    "Senior Housing": {
        "risk_profile": "Recovery",
        "cap_range": (0.0625, 0.0800),
        "spread_range": (350, 475),
        "ltv_target": 0.65,
        "volatility": 0.05
    },
    "Life Science": {
        "risk_profile": "Volatile",
        "cap_range": (0.0625, 0.0750),
        "spread_range": (325, 500), # Wide spread due to vacancy risk
        "ltv_target": 0.55, # Conservative lending
        "volatility": 0.08 # High variance
    },
    "Skilled Nursing": {
        "risk_profile": "High Yield",
        "cap_range": (0.0850, 0.1050),
        "spread_range": (450, 650),
        "ltv_target": 0.75, # HUD influence
        "volatility": 0.04
    }
}

# --- HELPER FUNCTIONS ---
def banker_round(val, precision=100000):
    return int(round(val / precision) * precision)

def get_market_base_rate(date_obj):
    """Simulates SOFR fluctuation over 2 years."""
    # Trend: Peaked in 2024, slowly stabilizing/dipping in 2025
    days_from_start = (date_obj - (ANCHOR_DATE - timedelta(days=730))).days
    progress = days_from_start / 730
    
    # Simple sine wave trend + noise
    base = 0.053 - (0.008 * progress) # 5.3% -> 4.5%
    noise = random.uniform(-0.001, 0.001)
    return round(base + noise, 4)

def get_market_sentiment_factor():
    """Returns a multiplier (0.9 to 1.1) representing general market risk appetite."""
    return random.normalvariate(1.0, 0.05) 

# --- GENERATOR ---
deals_data = []
properties_data = []
leases_data = []

print("Generating realistic HRE data...")

for i in range(NUM_DEALS):
    deal_id = f"HRE-{2024}-{100+i}"
    
    # 1. Setup Context
    closing_date = ANCHOR_DATE - timedelta(days=random.randint(10, 700))
    sofr = get_market_base_rate(closing_date)
    sentiment = get_market_sentiment_factor() # Global market noise
    
    sponsor_name = random.choice(list(sponsors.keys()))
    sp_tier = sponsors[sponsor_name]["tier"]
    
    # Select Asset Class
    asset_type = random.choices(
        list(asset_profiles.keys()), 
        weights=[0.4, 0.3, 0.15, 0.15] # Most volume in MOB/SH
    )[0]
    profile = asset_profiles[asset_type]
    
    # Deal Structure
    deal_type = random.choices(["Acquisition", "Refinance", "Construction"], weights=[0.55, 0.35, 0.10])[0]
    is_portfolio = random.random() < 0.30
    
    # Term & Maturity (New Logic)
    if deal_type == "Construction":
         term_months = 36
    else:
         term_months = random.choice([60, 84, 120])
         
    maturity_date = closing_date + timedelta(days=term_months*30)

    # 2. Factor Model: LTV
    # Base Target + Sentiment impact + Sponsor Bonus + Deal Type Penalty
    tgt_ltv = profile["ltv_target"]
    
    if deal_type == "Construction": tgt_ltv -= 0.10
    if deal_type == "Refinance": tgt_ltv -= 0.05
    if sp_tier == 1: tgt_ltv += 0.05 # Better sponsors get higher leverage
    
    # Apply Noise
    ltv = tgt_ltv + random.normalvariate(0, 0.03) 
    ltv = max(0.40, min(ltv, 0.85)) # Hard caps
    ltv = round(ltv, 2)
    
    # 3. Factor Model: Spread
    # Base Range + LTV Premium + Asset Volatility + Sponsor Discount
    base_spread_min, base_spread_max = profile["spread_range"]
    base_spread = random.uniform(base_spread_min, base_spread_max)
    
    # Leverage Premium: Curve steepens above 60% LTV
    lev_premium = max(0, (ltv - 0.60) * 100 * 8) # ~8bps per 1% LTV above 60%
    
    # Sponsor Discount
    sp_discount = (3 - sp_tier) * 15 # Tier 1 gets 30bps discount vs Tier 3
    
    # Volatility/Noise
    spread_noise = random.normalvariate(0, profile["volatility"] * 500)
    
    spread = base_spread + lev_premium - sp_discount + spread_noise
    
    # Deal Type Impact
    if deal_type == "Construction": spread += 100
    
    spread = int(max(150, spread))
    all_in_rate = round(sofr + (spread/10000), 4)

    # 4. Factor Model: Cap Rate
    # Correlated to Rate + Spread (Financial Gravity) but with Asset Alpha
    # Risk Free + Spread is the 'Debt Constant' proxy, Cap Rate usually has a spread over/under debt
    debt_constant_proxy = all_in_rate
    
    # Cap Rate Spread to Debt (Positive leverage vs Negative leverage)
    # Nowadays often negative or neutral
    cap_spread_to_debt = random.normalvariate(-0.005, 0.005) 
    
    # Asset Specific Adjustments (Growth expectations lower cap rate)
    growth_premium = 0.0
    if asset_type == "Medical Office": growth_premium = 0.0025 # Stability premium
    if asset_type == "Life Science": growth_premium = -0.0050 # Vacancy risk premium (higher cap)
    
    deal_cap_rate = debt_constant_proxy + cap_spread_to_debt + growth_premium
    
    # Sanity check against profile ranges
    min_c, max_c = profile["cap_range"]
    # Allow some drift but anchor
    deal_cap_rate = max(min_c - 0.005, min(max_c + 0.01, deal_cap_rate))
    deal_cap_rate = round(deal_cap_rate, 4)

    # 5. Economics
    base_check = 50_000_000 if is_portfolio else 18_000_000
    valuation = banker_round(np.random.lognormal(0, 0.5) * base_check)
    if valuation < 8_000_000: valuation = 8_000_000
    
    loan_amount = banker_round(valuation * ltv)
    deal_noi = int(valuation * deal_cap_rate)
    
    # Derived Metrics
    debt_yield = round(deal_noi / loan_amount, 4) if loan_amount > 0 else 0
    ds = loan_amount * all_in_rate
    dscr = round(deal_noi / ds, 2) if ds > 0 else 0
    total_cost = int(valuation * random.uniform(0.9, 1.1)) # Rough estimate
    ltc = round(loan_amount / total_cost, 2)

    deals_data.append({
        "Deal_ID": deal_id,
        "Deal_Name": f"{sponsor_name} {asset_type} {'Portfolio' if is_portfolio else 'Facility'}",
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
        "Maturity_Date": maturity_date.strftime('%Y-%m-%d'),
        "Term_Months": term_months,
        "LTC": ltc,
        "Cap_Rate": deal_cap_rate,
        "Debt_Yield": debt_yield,
        "DSCR": dscr,
        "Total_Cost": total_cost,
        "NOI": deal_noi
    })
    
    # --- PROPERTIES ---
    num_props = random.randint(3, 12) if is_portfolio else 1
    prop_vals = np.random.dirichlet(np.ones(num_props)) * valuation
    
    for p_idx, p_val in enumerate(prop_vals):
        prop_id = f"{deal_id}-P{p_idx+1}"
        p_val_clean = banker_round(p_val, 10000)
        p_cap = deal_cap_rate + random.uniform(-0.002, 0.002)
        
        properties_data.append({
            "Property_ID": prop_id,
            "Deal_ID": deal_id,
            "Address": f"{random.randint(1,999)} {fake.street_name()}",
            "City": fake.city(),
            "State": fake.state_abbr(),
            "Asset_Type": asset_type,
            "Appraised_Value": p_val_clean,
            "Cap_Rate": round(p_cap, 4),
            "Detailed_Type": asset_type # Simplified
        })

# --- EXPORT ---
df_deals = pd.DataFrame(deals_data)
df_props = pd.DataFrame(properties_data)

print(f"Generated {len(df_deals)} deals and {len(df_props)} properties.")

df_deals.to_csv("hre_deals.csv", index=False)
df_props.to_csv("hre_properties.csv", index=False)
# Rent roll skipped for brevity as charts use deals/props

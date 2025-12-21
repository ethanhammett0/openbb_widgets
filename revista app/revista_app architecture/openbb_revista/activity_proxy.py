import pandas as pd 
import aiohttp
import os
from .constants import REVISTA_BASE_URL

async def get_activity_proxy(property_id): 
    base_url = REVISTA_BASE_URL
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key: return "### REVISTA_API_KEY Missing"

    async with aiohttp.ClientSession() as session:
        # 1. Fetch Property Data 
        async with session.get(f"{base_url}/Property/{property_id}?ApiKey={api_key}") as p_resp:
            if p_resp.status != 200: return "### Data Unavailable" 
            p_raw = await p_resp.json()
            p_data = p_raw.get('value', p_raw)
     
        # 2. Fetch Demographics (5 Mile Radius) for "Catchment" 
        lat = p_data.get('lat')
        lon = p_data.get('lon')
        
        if not lat or not lon:
            return "### Location Data Unavailable"

        async with session.get(f"{base_url}/Demographics/{lat}/{lon}/5?ApiKey={api_key}") as d_resp:
            d_raw = await d_resp.json() if d_resp.status == 200 else {}
            raw_val = d_raw.get('value', d_raw)
            
            if isinstance(raw_val, list) and len(raw_val) > 0:
                d_data = raw_val[0]
            elif isinstance(raw_val, dict):
                d_data = raw_val
            else:
                d_data = {} 
     
    # 3. Calculate Metrics 
    # Provider Density 
    providers = p_data.get('providerCount', 0) 
    sqft = p_data.get('squareFeet', 1) # Avoid div/0 
    density = (providers / sqft) * 1000 # Providers per 1,000 SF 
     
    # Hospital Proximity (Referral Traffic) 
    dist_hosp = p_data.get('milesToNearestHospital', 999) 
     
    # Patient Base 
    pop = d_data.get('currentYearValue', 0) 
     
    # 4. Traffic "Rating" (Heuristic) 
    if density > 3.0: traffic_rating = "HIGH INTENSITY" 
    elif density > 1.5: traffic_rating = "MODERATE ACTIVITY" 
    else: traffic_rating = "LOW DENSITY" 
 
    # 5. Format Output 
    return f""" 
### Clinical Activity Engine 
**Traffic Rating:** {traffic_rating} 
 
| Metric | Value | Implication | 
| :--- | :--- | :--- | 
| **Provider Count** | {providers} | Active Prescribers | 
| **Density** | {density:.1f} / 1k SF | **Patient Volume Proxy** | 
| **Hospital Dist** | {dist_hosp} mi | Referral Velocity | 
| **Catchment** | {pop:,.0f} | Local Patient Base | 
 
> *Note: Higher Provider Density strongly correlates with daily foot traffic.* 
""" 

import aiohttp
import os
from .constants import REVISTA_BASE_URL

async def get_property_metrics(property_id, metric_view="Valuation"): 
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key: return "### REVISTA_API_KEY Missing"

    # Fetch Data 
    url = f"{REVISTA_BASE_URL}/Property/{property_id}?ApiKey={api_key}" 
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200: return "### Data Unavailable" 
            data = await resp.json() 
     
    # 1. Header 
    prop_name = data.get('propertyName', 'Unknown') 
    location = f"{data.get('city', '')}, {data.get('stateProvince', '')}" 
     
    # 2. Dynamic Table (Horizontal Scorecard Layout) 
    if metric_view == "Valuation": 
        # Financial Focus 
        price = data.get('ppsf', 0) 
        p_fmt = f"${price:,.2f}" if price else "N/A" 
        cap = data.get('capRate_Avg_TTM', 0) 
        c_fmt = f"{cap:.1f}%" if cap else "-" 
        last_trade = (data.get('lastTransactionDate') or '-')[:10] 
         
        table = f""" 
| **Price/SF** | **Last Trade** | **Cap Rate** | 
| :---: | :---: | :---: | 
| # {p_fmt} | **{last_trade}** | **{c_fmt}** | 
""" 
 
    elif metric_view == "Operational": 
        # Leasing Focus 
        occ = data.get('occupancy', 'N/A') 
        tenancy = data.get('tenancy', 'N/A') 
        affil = data.get('hospitalAffiliationName') or 'None' 
         
        table = f""" 
| **Occupancy** | **Tenancy** | **Affiliation** | 
| :---: | :---: | :---: | 
| # {occ} | **{tenancy}** | {affil} | 
""" 
 
    else: # Default to "Physical" 
        # Building Focus 
        year = data.get('yearBuilt', '-') 
        size = data.get('squareFeet', 0) 
        s_fmt = f"{size:,} SF" if size else "-" 
        ptype = data.get('propertyType', '-') 
         
        table = f""" 
| **Year Built** | **Size** | **Type** | 
| :---: | :---: | :---: | 
| # {year} | # {s_fmt} | **{ptype}** | 
""" 
 
    return f""" 
## {prop_name} 
**{location}** 
 
{table} 
 
> *Current View: {metric_view}* 
""" 

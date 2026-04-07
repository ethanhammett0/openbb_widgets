import aiohttp
import os
from .constants import REVISTA_BASE_URL
from datetime import datetime

async def get_property_metrics(property_id, metric_view="Physical"): 
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key: return "<h3>REVISTA_API_KEY Missing</h3>"

    # Fetch Property Data 
    url = f"{REVISTA_BASE_URL}/Property/{property_id}?ApiKey={api_key}" 
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200: return "<h3>Data Unavailable</h3>" 
            raw_data = await resp.json()
            data = raw_data.get('value', raw_data)
    
    # Helper function to safely format values
    def fmt_num(val, decimals=0, prefix="", suffix=""):
        if val is None or val == 0: return "N/A"
        try:
            return f"{prefix}{val:,.{decimals}f}{suffix}"
        except:
            return "N/A"
    
    # Define metrics based on scorecard type
    metrics = []
    
    if metric_view == "Physical":
        # 1. Physical Asset Scorecard
        year_built = data.get('yearBuilt') or 0
        current_year = datetime.now().year
        asset_vintage = current_year - year_built if year_built else 0
        
        metrics = [
            ("Asset Vintage", f"{asset_vintage} yrs" if asset_vintage else "N/A"),
            ("Gross SqFt", fmt_num(data.get('squareFeet'), 0)),
            ("Building Type", (data.get('propertyType') or "N/A")[:15]),
            ("Campus", (data.get('campusType') or data.get('propertyStatus') or "N/A")[:12]),
            ("Stories", str(data.get('stories') or "N/A")),
            ("Quality", (data.get('buildingQuality') or "N/A")[:12])
        ]
    
    elif metric_view == "Valuation":
        # 2. Valuation & Yield Scorecard
        last_sale = data.get('price_Property_Allocated')
        sqft = data.get('squareFeet')
        
        # Calculate Price/SF if both values exist
        price_sf = None
        if last_sale and sqft:
            try:
                price_sf = float(str(last_sale).replace('$','').replace(',','')) / sqft
            except:
                pass
        
        # Use ppsf if available, otherwise use calculated
        ppsf_display = data.get('ppsf') or price_sf
        
        metrics = [
            ("Price/SF", fmt_num(ppsf_display, 0, "$")),
            ("Cap Rate", fmt_num(data.get('capRate_Avg_TTM'), 1, "", "%")),
            ("NOI", "Calculated"),  # Would need revenue/expense data
            ("Total Price", (data.get('price_Property_Allocated') or "N/A")[:12]),
            ("Last Sale", (data.get('lastTransactionDate') or "N/A")[:10]),
            ("Age", f"{data.get('age', 0)} yrs")
        ]
    
    elif metric_view == "Operational":
        # 3. Operational Risk Scorecard
        occupancy = data.get('occupancy') or data.get('occupancyPercentage')
        
        metrics = [
            ("Occupancy", fmt_num(occupancy, 1, "", "%")),
            ("Health System", (data.get('hospitalAffiliationName') or "None")[:12]),
            ("Owner Type", (data.get('ownershipType') or data.get('ownershipCategory') or "N/A")[:12]),
            ("NNN Rent", fmt_num(data.get('avg_NNN_Rent'), 2, "$")),
            ("Beds", str(data.get('beds') or "N/A")),
            ("Tenancy", (data.get('tenancy') or "N/A")[:12])
        ]
    
    elif metric_view == "Market":
        # 4. Market Demand Scorecard
        lat = data.get('lat')
        lon = data.get('lon')
        
        md_gap = "N/A"
        construction_sf = "N/A"
        competitive_set = "N/A"
        
        if lat and lon:
            try:
                # Fetch Specialty Demand (MD Gap) - 5 mile radius
                sd_url = f"{REVISTA_BASE_URL}/SpecialtyDemand/{lat}/{lon}/5?ApiKey={api_key}"
                async with aiohttp.ClientSession() as session:
                    async with session.get(sd_url) as resp:
                        if resp.status == 200:
                            sd_raw = await resp.json()
                            sd_data = sd_raw.get('value', sd_raw)
                            # Sum impliedDocGap if list, or get directly
                            if isinstance(sd_data, list):
                                gap = sum([x.get('impliedDocGap', 0) for x in sd_data])
                                md_gap = fmt_num(gap, 1)
                            elif isinstance(sd_data, dict):
                                md_gap = fmt_num(sd_data.get('impliedDocGap'), 1)

                # Fetch Construction - 5 mile radius
                const_url = f"{REVISTA_BASE_URL}/ConstructionByLatLon/{lat}/{lon}/5?ApiKey={api_key}"
                async with aiohttp.ClientSession() as session:
                    async with session.get(const_url) as resp:
                        if resp.status == 200:
                            c_raw = await resp.json()
                            c_data = c_raw.get('value', c_raw)
                            if isinstance(c_data, list):
                                total_sf = sum([x.get('constructionSF', 0) for x in c_data])
                                construction_sf = fmt_num(total_sf, 0) + " SF"
                            elif isinstance(c_data, dict):
                                construction_sf = fmt_num(c_data.get('constructionSF'), 0) + " SF"
                                
            except Exception as e:
                print(f"Market Data Error: {e}")

        metrics = [
            ("Doc Gap", md_gap),
            ("Construction", construction_sf),
            ("Competitive", str(data.get('providerCount') or "N/A") + " Prov"),
            ("Cap Rate", fmt_num(data.get('capRate_Avg_TTM'), 1, "", "%")),
            ("Avg Rent", fmt_num(data.get('avg_NNN_Rent'), 2, "$")),
            ("Status", (data.get('propertyStatus') or "N/A")[:10])
        ]
    
    else:  # Transaction/Liquidity
        # 5. Transaction/Liquidity Scorecard
        metrics = [
            ("Last Sale", (data.get('lastTransactionDate') or "N/A")[:10]),
            ("Buyer", (data.get('buyerName') or "N/A")[:15]),
            ("Buyer Type", (data.get('buyerType') or "N/A")[:12]),
            ("Seller", (data.get('sellerName') or "N/A")[:15]),
            ("Price/SF", fmt_num(data.get('ppsf'), 0, "$")),
            ("Activity", (data.get('lastTransactionActivity') or "N/A")[:12])
        ]
    
    # Build horizontal table
    table_rows = []
    table_rows.append("| " + " | ".join([f"**{m[0]}**" for m in metrics]) + " |")
    table_rows.append("|" + " :---: |" * 6)
    table_rows.append("| " + " | ".join([f"# {m[1]}" for m in metrics]) + " |")
    
    return "\n".join(table_rows)

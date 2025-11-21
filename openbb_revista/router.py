import os
from openbb_core.app.router import Router
from openbb_core.app.model.obbject import OBBject
from typing import List, Dict
from .models import KPIModel, PropertyRecord, PropertyOverviewModel, TransactionModel, OwnerModel
import pandas as pd
import plotly.express as px
import aiohttp
import asyncio

router = Router(prefix="/revista")

REVISTA_API_BASE = "https://api.revistamed.com"

# Helper for Revista API calls
async def fetch_revista_data(endpoint: str, params: dict) -> Dict:
    """
    Fetches data from Revista API.
    Requires REVISTA_API_KEY to be set.
    """
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key:
        raise ValueError("REVISTA_API_KEY environment variable is missing")

    # Build URL
    url = f"{REVISTA_API_BASE}/{endpoint}"

    # Clean params and add ApiKey
    query_params = {k: v for k, v in params.items() if v is not None}
    query_params["ApiKey"] = api_key

    async with aiohttp.ClientSession() as session:
            async with session.get(url, params=query_params) as response:
                if response.status == 200:
                    try:
                        return await response.json()
                    except Exception:
                        # If response is not JSON (e.g. simple string or empty), return raw text or empty dict
                        text = await response.text()
                        # print(f"API returned non-JSON: {text}")
                        return {}
                else:
                    error_text = await response.text()
                    # Check if 404 - typical for "no data found" in some APIs, or just bad ID
                    if response.status == 404:
                        return {} # Treat as empty
                    print(f"API FAIL: {url} -> {response.status} : {error_text}")
                    # Return empty dict on error to allow graceful handling upstream
                    return {}

def format_large_number(num: float) -> str:
    if num >= 1_000_000:
        return f"{num/1_000_000:.1f}M"
    elif num >= 1_000:
        return f"{num/1_000:.1f}k"
    return f"{num:,.0f}"

def sanitize_data_object(raw_data):
    """Helper to extract the data dictionary from various Revista API response formats."""
    data = {}
    if isinstance(raw_data, dict):
        if "value" in raw_data:
             val = raw_data["value"]
             if isinstance(val, list) and len(val) > 0:
                 data = val[0]
             elif isinstance(val, dict):
                 data = val
        else:
            data = raw_data
    elif isinstance(raw_data, list) and len(raw_data) > 0:
            data = raw_data[0]

    if not isinstance(data, dict):
        return {}
    return data

# --- EXISTING CBSA ENDPOINTS ---
@router.command()
async def kpis(cbsa_code: str, property_type: str = "MOB") -> OBBject[List[KPIModel]]:
    """Logic: Fetch aggregate stats from Revista for CBSA via /MarketTrends/{CBSACode}."""
    try:
        raw_data = await fetch_revista_data(f"MarketTrends/{cbsa_code}", {})
        data = sanitize_data_object(raw_data)
    except Exception as e:
        print(f"Error fetching KPIs: {e}")
        data = {}

    # Check if empty
    if not data:
        return OBBject(results=[
            KPIModel(label="Status", value="No Records Found", delta=None, delta_text="Check Inputs"),
            KPIModel(label="Input", value=cbsa_code, delta=None, delta_text="CBSA Code")
        ])

    inventory = data.get("totalSF", 0)
    under_construction = data.get("constructionSF_InProgress", 0)
    occupancy = data.get("occupancy_TTM", 0)
    vacancy = 1.0 - occupancy if occupancy else 0.0
    growth_rate = (under_construction / inventory) if inventory > 0 else 0.0

    results = [
        KPIModel(
            label="Total Inventory",
            value=format_large_number(inventory) + " SF",
            delta=None,
            delta_text="YoY"
        ),
        KPIModel(
            label="Vacancy Rate",
            value=f"{vacancy:.1%}",
            delta=None,
            delta_text="YoY"
        ),
        KPIModel(
            label="Pipeline Volume",
            value=format_large_number(under_construction) + " SF",
            delta=growth_rate,
            delta_text="of Inv."
        )
    ]
    return OBBject(results=results)

@router.command()
async def map(cbsa_code: str) -> OBBject:
    """Logic: Fetch property list with Lat/Lon via /ConstructionByCBSA/{CBSACode}."""
    try:
        raw_data = await fetch_revista_data(f"ConstructionByCBSA/{cbsa_code}", {})
        items = raw_data
        if isinstance(raw_data, dict) and "value" in raw_data:
            items = raw_data["value"]
        if not isinstance(items, list):
            items = []
    except Exception as e:
        print(f"Error fetching Map data: {e}")
        items = []

    properties = []
    for item in items:
        if isinstance(item, dict) and item.get("lat") and item.get("lon"):
            status = item.get("constructionStatus", "Unknown")
            properties.append({
                "property_name": item.get("propertyName", "Unknown"),
                "address": item.get("address", ""),
                "construction_status": status,
                "active_sqft": item.get("constructionSF", 0),
                "lat": item.get("lat"),
                "lon": item.get("lon"),
                "size_formatted": format_large_number(item.get("constructionSF", 0))
            })

    df = pd.DataFrame(properties)
    if df.empty:
        # Return empty map with default layout
        fig = px.scatter_mapbox(lat=[], lon=[])
        fig.update_layout(
            mapbox_style="open-street-map",
            margin={"r":0,"t":0,"l":0,"b":0},
            title="No properties found for this area."
        )
    else:
        fig = px.scatter_mapbox(
            df, lat="lat", lon="lon", hover_name="property_name",
            hover_data={"address": True, "construction_status": True, "size_formatted": True, "lat": False, "lon": False},
            color="construction_status", size="active_sqft", zoom=10, size_max=30, opacity=0.8
        )
        fig.update_layout(mapbox_style="open-street-map", margin={"r":0,"t":0,"l":0,"b":0}, legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01))

    return OBBject(results=fig.to_json())

@router.command()
async def summary(cbsa_code: str) -> OBBject[str]:
    """Logic: Analyze trends using real data."""
    try:
        stats_raw, props_raw = await asyncio.gather(
            fetch_revista_data(f"MarketTrends/{cbsa_code}", {}),
            fetch_revista_data(f"ConstructionByCBSA/{cbsa_code}", {})
        )
        stats = sanitize_data_object(stats_raw)

        props = props_raw
        if isinstance(props_raw, dict) and "value" in props_raw:
            props = props_raw["value"]
        if not isinstance(props, list):
            props = []
    except Exception as e:
        return OBBject(results=f"Error loading summary: {e}")

    if not stats and not props:
        return OBBject(results="### Market Analysis\n\n**Status**: The inputs don't correspond with any records in the database. Please check the CBSA Code.")

    inventory = stats.get("totalSF", 0)
    under_construction = stats.get("constructionSF_InProgress", 0)
    cbsa_name = stats.get("cbsaShortName", cbsa_code)
    occupancy = stats.get("occupancy_TTM", 0)
    vacancy = 1.0 - occupancy if occupancy else 0.0
    avg_rent = stats.get("avg_NNN_Rent", 0)

    active_projects = [p for p in props if isinstance(p, dict) and p.get("constructionStatus") == "Under Construction"]
    active_projects.sort(key=lambda x: x.get("constructionSF", 0), reverse=True)
    top_projects = active_projects[:3]
    pipeline_ratio = (under_construction / inventory) if inventory > 0 else 0.0

    analysis = []
    analysis.append(f"# Market Analysis: {cbsa_name}")

    # Prompt Requirement: Analyze trends (e.g., if active_sqft > existing_inventory * 0.1)
    is_aggressive = under_construction > (inventory * 0.1)

    if is_aggressive:
        growth_sentiment = "Aggressive Growth"
        growth_desc = "significant construction volume relative to inventory (>10%)"
    elif pipeline_ratio > 0.05:
         growth_sentiment = "High Growth"
         growth_desc = "strong development activity"
    elif pipeline_ratio > 0.02:
        growth_sentiment = "Moderate Growth"
        growth_desc = "steady development activity"
    else:
        growth_sentiment = "Stable / Low Growth"
        growth_desc = "minimal new supply"

    analysis.append(f"### 🏗️ Pipeline & Growth")
    analysis.append(f"The **{cbsa_name}** market is characterized by **{growth_sentiment}**. {format_large_number(under_construction)} SF under construction ({pipeline_ratio:.1%} of inv). {growth_desc}.")
    analysis.append(f"\n### 📊 Fundamentals")
    analysis.append(f"- **Vacancy**: {vacancy:.1%}")
    if avg_rent > 0:
        analysis.append(f"- **Rents**: ${avg_rent:.2f} PSF (NNN)")
    if top_projects:
        analysis.append(f"\n### 🚧 Major Projects")
        for p in top_projects:
            name = p.get('propertyName', 'Unnamed Project')
            sf = p.get('constructionSF', 0)
            analysis.append(f"- **{name}**: {format_large_number(sf)} SF")
    return OBBject(results="\n".join(analysis))

@router.command()
async def table(cbsa_code: str) -> OBBject[List[PropertyRecord]]:
    """Table endpoint to return detailed property records via /ConstructionByCBSA."""
    try:
        raw_data = await fetch_revista_data(f"ConstructionByCBSA/{cbsa_code}", {})
        items = raw_data
        if isinstance(raw_data, dict) and "value" in raw_data:
            items = raw_data["value"]
        if not isinstance(items, list):
            items = []
    except Exception as e:
        return OBBject(results=[])

    records = []
    valid_statuses = ["Planned", "Under Construction", "Completed", "Delayed"]

    for p in items:
        if not isinstance(p, dict):
            continue

        comp_date = p.get("projectedOpenDate") or p.get("constructionStartDate")
        comp_date_str = "TBD"
        if comp_date and isinstance(comp_date, dict):
             year = comp_date.get('year')
             month = comp_date.get('month')
             day = comp_date.get('day')
             if year and month and day:
                 comp_date_str = f"{year}-{month:02d}-{day:02d}"

        # Sanitize construction_status
        status = p.get("constructionStatus", "Planned")
        if status not in valid_statuses:
            # Try to map or fallback
            if "construct" in str(status).lower():
                status = "Under Construction"
            elif "plan" in str(status).lower():
                status = "Planned"
            elif "delay" in str(status).lower():
                status = "Delayed"
            elif "complete" in str(status).lower():
                status = "Completed"
            else:
                status = "Planned" # Default Fallback

        records.append(PropertyRecord(
            property_id=str(p.get("constructionID") or p.get("propertyID")),
            property_name=p.get("propertyName", "Unknown"),
            address=p.get("address", ""),
            city=p.get("city", ""),
            construction_status=status,
            completion_date=comp_date_str
        ))
    return OBBject(results=records)

# --- NEW PROPERTY ENDPOINTS ---

async def resolve_property_id(address: str) -> int:
    """Helper to find PropertyID from Address via Nominatim + Revista Search"""
    try:
        if not address:
            return None

        # 1. Geocode Address
        lat, lon = None, None
        async with aiohttp.ClientSession() as session:
            geo_url = "https://nominatim.openstreetmap.org/search"
            async with session.get(geo_url, params={"q": address, "format": "json", "limit": 1}, headers={"User-Agent": "OpenBB-Revista"}) as resp:
                if resp.status == 200:
                    geo_data = await resp.json()
                    if not geo_data:
                         # Address not found by geocoder
                         return None
                    lat = geo_data[0]["lat"]
                    lon = geo_data[0]["lon"]
                else:
                    # Geocoder error
                    return None

        # 2. Search Revista by Lat/Lon
        if not lat or not lon:
            return None

        search_res = await fetch_revista_data(f"Property/Search/{lat}/{lon}", {})
        items = search_res.get("value", []) if isinstance(search_res, dict) else search_res

        if not items:
             # No properties at this location in Revista
             return None

        # 3. Match Address (Simple Fuzzy)
        target_num = address.split(" ")[0]

        selected_id = None
        for item in items:
            if not isinstance(item, dict): continue
            prop_addr = item.get("address", "")
            if target_num in prop_addr:
                selected_id = item.get("propertyID")
                break

        # Strict Matching: Do not default to the first item if no match found.
        if not selected_id:
             return None

        return selected_id

    except Exception as e:
        print(f"Resolution Error: {e}")
        return None

@router.command()
async def property_overview(address: str) -> OBBject[str]:
    """Returns a Markdown summary of property details."""
    try:
        pid = await resolve_property_id(address)
        if not pid:
             return OBBject(results=f"### No Records Found\n\nInputs don't correspond to DB records ({address})")

        raw = await fetch_revista_data(f"Property/{pid}", {})

        data = sanitize_data_object(raw)
        if not data:
             return OBBject(results="### No Records Found\n\nData Retrieval Failed")

        sf = data.get("squareFeet", 0)
        avail = data.get("totalSpaceAvailable")
        occupancy = 0.0
        if sf and sf > 0:
            try:
                if isinstance(avail, str):
                    avail_flt = float(avail.replace(",", "").strip())
                else:
                    avail_flt = float(avail or 0)
                occupancy = 1.0 - (avail_flt / sf)
            except:
                occupancy = 0.0

        # Format as Markdown
        md = [
            f"### {data.get('propertyName', 'Unknown Property')}",
            f"**Address:** {data.get('address', '')}, {data.get('city', '')}",
            f"",
            f"- **Year Built:** {data.get('yearBuilt', 'N/A')}",
            f"- **Tenancy:** {data.get('tenancy', 'N/A')}",
            f"- **Square Feet:** {format_large_number(sf)}",
            f"- **Occupancy:** {occupancy:.1%}",
            f"- **Providers:** {data.get('providerCount', 0)}",
            f"- **Hospital Affiliation:** {data.get('hospitalAffiliationName', 'None')}"
        ]
        return OBBject(results="\n".join(md))

    except Exception as e:
        return OBBject(results=f"Error in Property Overview: {e}")

@router.command()
async def property_transactions(address: str) -> OBBject[List[TransactionModel]]:
    try:
        pid = await resolve_property_id(address)
        if not pid:
             return OBBject(results=[])

        # Endpoint: /TransactionsByProperty/{PropertyID}
        raw = await fetch_revista_data(f"TransactionsByProperty/{pid}", {})

        items = []
        if isinstance(raw, dict) and "value" in raw:
             val = raw["value"]
             if isinstance(val, list): items = val
             elif isinstance(val, dict): items = [val]
        elif isinstance(raw, list):
             items = raw

        res = []
        for t in items:
            if not isinstance(t, dict): continue
            # Date parsing
            d_str = t.get("transactionDate", "")
            # Extract date part from ISO string if present
            if "T" in d_str: d_str = d_str.split("T")[0]

            res.append(TransactionModel(
                date=d_str,
                price=t.get("price_Property_Allocated") or t.get("price_Portfolio"),
                price_per_sf=t.get("pricePerSF"),
                seller=t.get("sellerName"),
                buyer=t.get("buyerName"),
                type=t.get("transactionType")
            ))
        return OBBject(results=res)
    except Exception as e:
        return OBBject(results=[])

@router.command()
async def property_owner(address: str) -> OBBject[str]:
    """Returns a Markdown summary of ownership."""
    try:
        pid = await resolve_property_id(address)
        if not pid:
            return OBBject(results=f"### No Records Found\n\nInputs don't correspond to DB records.")

        raw = await fetch_revista_data(f"Property/{pid}", {})
        data = sanitize_data_object(raw)

        raw_st = await fetch_revista_data(f"Property/Stakeholders/{pid}", {})
        items_st = []
        if isinstance(raw_st, dict) and "value" in raw_st:
             val = raw_st["value"]
             if isinstance(val, list): items_st = val
             elif isinstance(val, dict): items_st = [val]
        elif isinstance(raw_st, list):
             items_st = raw_st

        stakeholders = [s.get("stakeholderName") for s in items_st if isinstance(s, dict) and s.get("stakeholderName")]

        owner = data.get("owner") or data.get("deedOwner") or "Unknown"
        otype = data.get("ownershipType") or "N/A"

        md = [
            f"### Ownership",
            f"**Owner:** {owner}",
            f"**Type:** {otype}",
            f"",
            f"#### Stakeholders"
        ]
        if stakeholders:
            for s in stakeholders:
                md.append(f"- {s}")
        else:
            md.append("- No additional stakeholders listed.")

        return OBBject(results="\n".join(md))

    except Exception as e:
        return OBBject(results=f"Error: {e}")

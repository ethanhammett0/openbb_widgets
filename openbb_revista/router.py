import os
from openbb_core.app.router import Router
from openbb_core.app.model.obbject import OBBject
from typing import List, Dict
from .models import KPIModel, PropertyRecord
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
                    return await response.json()
                else:
                    # Raise exception to be caught by caller or returned as error
                    error_text = await response.text()
                    raise Exception(f"Revista API Error {response.status}: {error_text}")

def format_large_number(num: float) -> str:
    if num >= 1_000_000:
        return f"{num/1_000_000:.1f}M"
    elif num >= 1_000:
        return f"{num/1_000:.1f}k"
    return f"{num:,.0f}"

# --- ENDPOINT 1: Aggregation Logic ---
@router.command()
async def kpis(cbsa_code: str, property_type: str = "MOB") -> OBBject[List[KPIModel]]:
    """
    Logic:
    1. Fetch aggregate stats from Revista for CBSA via /MarketTrends/{CBSACode}.
    2. Calculate KPIs.
    3. Return list of KPIModels.
    """
    try:
        # The API returns a dictionary, possibly wrapped in 'value' if it's a list response,
        # but /MarketTrends/{code} usually returns a single object or a list of one?
        # The docs say returns "MarketFundamentals".
        # Let's assume it might be wrapped based on OData patterns seen in MetroList.
        raw_data = await fetch_revista_data(f"MarketTrends/{cbsa_code}", {})

        # Unwrap if necessary
        data = raw_data
        if isinstance(raw_data, dict) and "value" in raw_data:
             if len(raw_data["value"]) > 0:
                 data = raw_data["value"][0]
             else:
                 data = {}
        elif isinstance(raw_data, list) and len(raw_data) > 0:
             data = raw_data[0]

    except Exception as e:
        print(f"Error fetching KPIs: {e}")
        return OBBject(results=[])

    inventory = data.get("totalSF", 0)
    under_construction = data.get("constructionSF_InProgress", 0)
    occupancy = data.get("occupancy_TTM", 0)
    vacancy = 1.0 - occupancy if occupancy else 0.0

    # Calculate implied Growth Rate
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

# --- ENDPOINT 2: Visualization Logic ---
@router.command()
async def map(cbsa_code: str) -> OBBject:
    """
    Logic:
    1. Fetch property list with Lat/Lon via /ConstructionByCBSA/{CBSACode}.
    2. Instantiate Plotly Express Scatter Mapbox.
    """
    try:
        raw_data = await fetch_revista_data(f"ConstructionByCBSA/{cbsa_code}", {})

        # Unwrap 'value' if present
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
        if item.get("lat") and item.get("lon"):
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
        fig = px.scatter_mapbox(lat=[], lon=[])
    else:
        fig = px.scatter_mapbox(
            df,
            lat="lat",
            lon="lon",
            hover_name="property_name",
            hover_data={"address": True, "construction_status": True, "size_formatted": True, "lat": False, "lon": False},
            color="construction_status",
            size="active_sqft",
            zoom=10,
            size_max=30,
            opacity=0.8
        )

    fig.update_layout(
        mapbox_style="open-street-map",
        margin={"r":0,"t":0,"l":0,"b":0},
        legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01)
    )
    fig_json = fig.to_json()

    return OBBject(results=fig_json)

# --- ENDPOINT 3: Narrative Logic ---
@router.command()
async def summary(cbsa_code: str) -> OBBject[str]:
    """
    Logic:
    1. Analyze trends using real data.
    2. Generate detailed narrative.
    """
    try:
        stats_raw, props_raw = await asyncio.gather(
            fetch_revista_data(f"MarketTrends/{cbsa_code}", {}),
            fetch_revista_data(f"ConstructionByCBSA/{cbsa_code}", {})
        )

        # Unwrap
        stats = stats_raw
        if isinstance(stats_raw, dict) and "value" in stats_raw:
             stats = stats_raw["value"][0] if stats_raw["value"] else {}
        elif isinstance(stats_raw, list) and len(stats_raw) > 0:
             stats = stats_raw[0]

        props = props_raw
        if isinstance(props_raw, dict) and "value" in props_raw:
            props = props_raw["value"]
        if not isinstance(props, list):
            props = []

    except Exception as e:
        return OBBject(results=f"Error loading summary: {e}")

    inventory = stats.get("totalSF", 0)
    under_construction = stats.get("constructionSF_InProgress", 0)
    cbsa_name = stats.get("cbsaShortName", cbsa_code)
    occupancy = stats.get("occupancy_TTM", 0)
    vacancy = 1.0 - occupancy if occupancy else 0.0
    avg_rent = stats.get("avg_NNN_Rent", 0)

    # Find top 3 largest projects under construction
    active_projects = [p for p in props if p.get("constructionStatus") == "Under Construction"]
    active_projects.sort(key=lambda x: x.get("constructionSF", 0), reverse=True)
    top_projects = active_projects[:3]

    pipeline_ratio = (under_construction / inventory) if inventory > 0 else 0.0

    analysis = []
    analysis.append(f"# Market Analysis: {cbsa_name}")

    # 1. Growth Analysis
    if pipeline_ratio > 0.05:
        growth_sentiment = "Aggressive Growth"
        growth_desc = "significant construction volume relative to inventory, indicating strong developer confidence or potential oversupply risk"
    elif pipeline_ratio > 0.02:
        growth_sentiment = "Moderate Growth"
        growth_desc = "steady development activity consistent with normal market expansion"
    else:
        growth_sentiment = "Stable / Low Growth"
        growth_desc = "minimal new supply entering the market, supporting current occupancy levels"

    analysis.append(f"### 🏗️ Pipeline & Growth")
    analysis.append(f"The **{cbsa_name}** market is currently characterized by **{growth_sentiment}**. "
                    f"There is currently **{format_large_number(under_construction)} SF** under construction, representing **{pipeline_ratio:.1%}** of the existing inventory ({format_large_number(inventory)} SF). "
                    f"This level of activity suggests {growth_desc}.")

    # 2. Fundamentals
    analysis.append(f"\n### 📊 Fundamentals")
    analysis.append(f"- **Vacancy**: The market vacancy rate stands at **{vacancy:.1%}**.")
    if avg_rent > 0:
        analysis.append(f"- **Rents**: Average NNN rents are trading at **${avg_rent:.2f} PSF**.")

    # 3. Notable Projects
    if top_projects:
        analysis.append(f"\n### 🚧 Major Projects Underway")
        for p in top_projects:
            name = p.get('propertyName', 'Unnamed Project')
            sf = p.get('constructionSF', 0)
            dev = p.get('developerName', 'Unknown Developer')
            analysis.append(f"- **{name}**: {format_large_number(sf)} SF (Developer: {dev})")

    return OBBject(results="\n".join(analysis))

# --- ENDPOINT 4: Table Logic ---
@router.command()
async def table(cbsa_code: str) -> OBBject[List[PropertyRecord]]:
    """
    Table endpoint to return detailed property records.
    """
    try:
        raw_data = await fetch_revista_data(f"ConstructionByCBSA/{cbsa_code}", {})

        # Unwrap
        items = raw_data
        if isinstance(raw_data, dict) and "value" in raw_data:
            items = raw_data["value"]
        if not isinstance(items, list):
            items = []

    except Exception as e:
        print(f"Error fetching Table data: {e}")
        return OBBject(results=[])

    records = []
    for p in items:
        comp_date = p.get("projectedOpenDate") or p.get("constructionStartDate")
        comp_date_str = "TBD"
        if comp_date and isinstance(comp_date, dict):
             year = comp_date.get('year')
             month = comp_date.get('month')
             day = comp_date.get('day')
             if year and month and day:
                 comp_date_str = f"{year}-{month:02d}-{day:02d}"

        records.append(PropertyRecord(
            property_id=str(p.get("constructionID") or p.get("propertyID")),
            property_name=p.get("propertyName", "Unknown"),
            address=p.get("address", ""),
            city=p.get("city", ""),
            construction_status=p.get("constructionStatus", "Unknown"),
            completion_date=comp_date_str
        ))

    return OBBject(results=records)

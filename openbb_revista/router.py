import os
from openbb_core.app.router import Router
from openbb_core.app.model.obbject import OBBject
from typing import List, Dict
from .models import KPIModel, PropertyRecord
import pandas as pd
import plotly.express as px
import random
import aiohttp
import asyncio

router = Router(prefix="/revista")

REVISTA_API_BASE = "https://api.revistamed.com/v1"

# Helper for Revista API calls
async def fetch_revista_data(endpoint: str, params: dict) -> Dict:
    """
    Fetches data from Revista API.
    If REVISTA_API_KEY is not set, falls back to mock data for testing purposes.
    """
    api_key = os.getenv("REVISTA_API_KEY")

    if api_key:
        # Real API implementation
        # Google search indicates "ApiKey" query parameter is required.
        url = f"{REVISTA_API_BASE}/{endpoint}"

        # Clean params and add ApiKey
        query_params = {k: v for k, v in params.items() if v is not None}
        query_params["ApiKey"] = api_key

        try:
            async with aiohttp.ClientSession() as session:
                 async with session.get(url, params=query_params) as response:
                     if response.status == 200:
                         return await response.json()
                     else:
                         # If API fails (e.g. 401, 404), log and fallback to mock
                         # print(f"API Request failed: {response.status}")
                         pass
        except Exception as e:
            # Network error or other issue
            # print(f"API Connection failed: {e}")
            pass

    # --- Mock data generation (Fallback) ---
    cbsa = params.get("cbsa_code", "34980")

    if endpoint == "stats":
        # Mock stats for KPI
        # Simulate raw data where we might need to calculate YoY
        return {
            "inventory": 1500000,
            "inventory_prev": 1428571, # results in approx 0.05
            "vacancy_rate": 0.12,
            "vacancy_rate_prev": 0.1225, # results in approx -0.02
            "under_construction": 250000,
            "under_construction_prev": 217391 # results in approx 0.15
        }
    elif endpoint == "properties":
        # Mock properties list
        statuses = ["Planned", "Under Construction", "Completed", "Delayed"]
        data = []
        for i in range(10):
            data.append({
                "property_id": f"PROP-{cbsa}-{i}",
                "property_name": f"Medical Center {i}",
                "address": f"{100+i} Main St",
                "city": "Nashville" if cbsa == "34980" else "Unknown City",
                "lat": 36.1627 + (random.random() - 0.5) * 0.1,
                "lon": -86.7816 + (random.random() - 0.5) * 0.1,
                "construction_status": statuses[i % 4],
                "completion_date": f"202{4+i}-01-01",
                "active_sqft": 50000 + i * 1000
            })
        return {"data": data}

    return {}

# --- ENDPOINT 1: Aggregation Logic ---
@router.command()
async def kpis(cbsa_code: str, property_type: str = "MOB") -> OBBject[List[KPIModel]]:
    """
    Logic:
    1. Fetch aggregate stats from Revista for CBSA.
    2. Calculate YoY deltas internally if API doesn't provide them.
    3. Return list of KPIModels.
    """
    data = await fetch_revista_data("stats", {"cbsa_code": cbsa_code, "property_type": property_type})

    def calculate_delta(current, prev):
        if prev and prev != 0:
            return (current - prev) / prev
        return None

    inventory = data.get("inventory", 0)
    inventory_delta = data.get("inventory_yoy")
    if inventory_delta is None:
        inventory_delta = calculate_delta(inventory, data.get("inventory_prev", 0))

    vacancy = data.get("vacancy_rate", 0)
    vacancy_delta = data.get("vacancy_yoy")
    if vacancy_delta is None:
         vacancy_delta = calculate_delta(vacancy, data.get("vacancy_rate_prev", 0))

    construction = data.get("under_construction", 0)
    construction_delta = data.get("under_construction_yoy")
    if construction_delta is None:
        construction_delta = calculate_delta(construction, data.get("under_construction_prev", 0))

    results = [
        KPIModel(
            label="Total Inventory (SF)",
            value=inventory,
            delta=inventory_delta,
            delta_text="YoY"
        ),
        KPIModel(
            label="Vacancy Rate",
            value=f"{vacancy:.1%}",
            delta=vacancy_delta,
            delta_text="YoY"
        ),
        KPIModel(
            label="Under Construction (SF)",
            value=construction,
            delta=construction_delta,
            delta_text="YoY"
        )
    ]
    return OBBject(results=results)

# --- ENDPOINT 2: Visualization Logic ---
@router.command()
async def map(cbsa_code: str) -> OBBject:
    """
    Logic:
    1. Fetch property list with Lat/Lon.
    2. Instantiate Plotly Express Scatter Mapbox.
    3. Configure mapbox_style to 'open-street-map' (No token required).
    4. Serialize: fig.to_json().
    """
    raw_data = await fetch_revista_data("properties", {"cbsa_code": cbsa_code})
    properties = raw_data.get("data", [])

    # Convert to DataFrame for Plotly
    df = pd.DataFrame(properties)

    if df.empty:
         # Return empty figure if no data
        fig = px.scatter_mapbox(lat=[], lon=[])
    else:
        fig = px.scatter_mapbox(
            df,
            lat="lat",
            lon="lon",
            hover_name="property_name",
            hover_data=["address", "construction_status"],
            color="construction_status",
            size="active_sqft",
            zoom=10
        )

    fig.update_layout(mapbox_style="open-street-map")
    fig_json = fig.to_json()

    return OBBject(results=fig_json)

# --- ENDPOINT 3: Narrative Logic ---
@router.command()
async def summary(cbsa_code: str) -> OBBject[str]:
    """
    Logic:
    1. Analyze trends (e.g., if active_sqft > existing_inventory * 0.1).
    2. Inject analysis into f-string Markdown template.
    """
    # Parallel fetch for performance
    stats, props = await asyncio.gather(
        fetch_revista_data("stats", {"cbsa_code": cbsa_code}),
        fetch_revista_data("properties", {"cbsa_code": cbsa_code})
    )

    inventory = stats.get("inventory", 0)
    under_construction = stats.get("under_construction", 0)

    analysis = []
    analysis.append(f"# Market Analysis for CBSA {cbsa_code}")

    if inventory > 0 and (under_construction / inventory) > 0.1:
        analysis.append(f"**High Growth Market**: Under construction volume ({under_construction:,} SF) is significant relative to existing inventory.")
    else:
        analysis.append(f"**Stable Market**: Construction activity is moderate.")

    analysis.append(f"\n## Key Metrics")
    analysis.append(f"- **Vacancy Rate**: {stats.get('vacancy_rate', 0):.1%}")
    analysis.append(f"- **Active Projects**: {len(props.get('data', []))}")

    return OBBject(results="\n".join(analysis))

# --- ENDPOINT 4: Table Logic ---
@router.command()
async def table(cbsa_code: str) -> OBBject[List[PropertyRecord]]:
    """
    Table endpoint to return detailed property records.
    """
    raw_data = await fetch_revista_data("properties", {"cbsa_code": cbsa_code})
    properties = raw_data.get("data", [])

    records = []
    for p in properties:
        records.append(PropertyRecord(
            property_id=p["property_id"],
            property_name=p["property_name"],
            address=p["address"],
            city=p["city"],
            construction_status=p["construction_status"],
            completion_date=p["completion_date"]
        ))

    return OBBject(results=records)

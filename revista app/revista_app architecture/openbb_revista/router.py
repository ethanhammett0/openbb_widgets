from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from typing import Optional, List, Union, Any
from openbb_core.app.router import Router
from pydantic import BaseModel
import pandas as pd
from .search import search_revista
from .scorecard import get_property_metrics
from .interactive_earth import get_interactive_earth
from .market_trends import get_market_trends
from .market_balance import get_supply_demand_gauge
from .activity_proxy import get_activity_proxy
from .benchmarker import get_benchmarker
from .stakeholders import get_stakeholders
from .models import KPIModel, PropertyRecord, PropertyOverviewModel, TransactionModel, OwnerModel

# Initialize OpenBB Router
router = Router(prefix="")

# 1. Search
# 1. Search
@router.command(methods=["GET"])
async def search(
    query: str = "", 
    property_name: str = "", 
    address: str = ""
) -> List[dict]:
    """Search for properties."""
    try:
        # Combine inputs if query is empty but others are provided
        search_term = query
        if not search_term:
            if property_name:
                search_term = property_name
            elif address:
                search_term = address
        
        # If still empty, return empty list
        if not search_term and not property_name and not address:
             return []

        df = await search_revista(search_term)
        # Replace NaN with None for valid JSON serialization
        df = df.where(pd.notnull(df), None)
        # Convert DataFrame to list of dicts for standard API response
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# 2. Scorecard
@router.command(methods=["GET"])
async def scorecard(property_id: str = "570571", metric_view: str = "Valuation") -> str:
    """Get property scorecard."""
    try:
        return await get_property_metrics(int(property_id), metric_view)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load scorecard: {str(e)}")

# 3. Interactive Earth
@router.command(methods=["GET"])
async def earth(property_id: str = "570571") -> Any:
    """Get interactive earth HTML."""
    try:
        return HTMLResponse(content=await get_interactive_earth(int(property_id)))
    except Exception as e:
        return HTMLResponse(content=f"<h3>Error loading map</h3><p>{str(e)}</p>")

# 4. Market Trends
@router.command(methods=["GET"])
async def market_trends(property_id: str = "570571") -> dict:
    """Get market trends chart."""
    try:
        return await get_market_trends(int(property_id)) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load trends: {str(e)}")

# 5. Market Balance
@router.command(methods=["GET"])
async def market_balance(property_id: str = "570571") -> dict:
    """Get market balance chart."""
    try:
        return await get_supply_demand_gauge(int(property_id)) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load balance: {str(e)}")

# 6. Activity Proxy
@router.command(methods=["GET"])
async def activity_proxy(property_id: str = "570571") -> str:
    """Get activity proxy report."""
    try:
        return await get_activity_proxy(int(property_id))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load activity proxy: {str(e)}")

# 7. Benchmarker
@router.command(methods=["GET"])
async def benchmarker(property_id: str = "570571") -> dict:
    """Get benchmark comparison chart."""
    try:
        return await get_benchmarker(int(property_id)) or {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load benchmark: {str(e)}")

# 8. Stakeholders
@router.command(methods=["GET"])
async def stakeholders(property_id: str = "570571") -> List[dict]:
    """Get property stakeholders."""
    try:
        df = await get_stakeholders(int(property_id))
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load stakeholders: {str(e)}")

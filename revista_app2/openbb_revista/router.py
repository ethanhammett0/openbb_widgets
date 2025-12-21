from typing import Optional, List, Union
from openbb_core.app.router import Router
from pydantic import BaseModel
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
# Prefix is handled by the entry point namespace ('revista'), so we keep this empty 
# to avoid /revista/revista/search paths, unless sub-grouping is needed.
router = Router(prefix="")

# 1. Search
@router.command(methods=["GET"])
async def search(query: str) -> List[dict]:
    """Search for properties."""
    df = await search_revista(query)
    # Convert DataFrame to list of dicts for standard API response
    return df.to_dict(orient="records")

# 2. Scorecard
@router.command(methods=["GET"])
async def scorecard(property_id: int, metric_view: str = "Valuation") -> str:
    """Get property scorecard."""
    return await get_property_metrics(property_id, metric_view)

# 3. Interactive Earth
@router.command(methods=["GET"])
async def earth(property_id: int) -> str:
    """Get interactive earth HTML."""
    return await get_interactive_earth(property_id)

# 4. Market Trends
@router.command(methods=["GET"])
async def market_trends(property_id: int) -> dict:
    """Get market trends chart."""
    fig = await get_market_trends(property_id)
    return fig.to_dict() if fig else {}

# 5. Market Balance
@router.command(methods=["GET"])
async def market_balance(property_id: int) -> dict:
    """Get market balance chart."""
    fig = await get_supply_demand_gauge(property_id)
    return fig.to_dict() if fig else {}

# 6. Activity Proxy
@router.command(methods=["GET"])
async def activity_proxy(property_id: int) -> str:
    """Get activity proxy report."""
    return await get_activity_proxy(property_id)

# 7. Benchmarker
@router.command(methods=["GET"])
async def benchmarker(property_id: int) -> dict:
    """Get benchmark comparison chart."""
    fig = await get_benchmarker(property_id)
    return fig.to_dict() if fig else {}

# 8. Stakeholders
@router.command(methods=["GET"])
async def stakeholders(property_id: int) -> List[dict]:
    """Get property stakeholders."""
    df = await get_stakeholders(property_id)
    return df.to_dict(orient="records")

"""
Revista MCP Server - Direct FastMCP Implementation

Uses FastMCP directly to expose Revista API endpoints as MCP tools.
Features:
- Safe server name "revista" (avoids spaces in prefixes)
- Strict snake_case for all function names and arguments
- Explicit typed signatures
"""
import json
import logging
import os
import sys
import argparse
from typing import Optional
from dotenv import load_dotenv

import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import FastMCP

try:
    from mcp_server.revista_client import RevistaClient
except ImportError:
    from revista_client import RevistaClient

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("revista-mcp-server")

# Global client instance
client_instance: Optional[RevistaClient] = None


def get_client() -> RevistaClient:
    """Lazy-init the Revista client."""
    global client_instance
    if client_instance is None:
        client_instance = RevistaClient()
    return client_instance


async def _call_revista(path: str, method: str = "GET", **path_params) -> str:
    """Helper: format a Revista API path and call it, returning JSON string."""
    client = get_client()
    formatted = path
    for k, v in path_params.items():
        # Case-insensitive replacement for path params
        # (The API docs use Capitalized param names in paths)
        # We will try to replace {Key} with value
        formatted = formatted.replace(f"{{{k}}}", str(v))
        # Also try exact match from args if they differ in case
        # (e.g. user passed cbsa_code, path has CBSACode)
        # We handle this mapping in the individual tool functions below
        
    try:
        result = await client.make_request(formatted, method)
        if isinstance(result, (dict, list)):
            return json.dumps(result, indent=2, default=str)
        return str(result)
    except Exception as e:
        return json.dumps({"error": str(e)})


def parse_args():
    parser = argparse.ArgumentParser(description="Revista MCP Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind to")
    return parser.parse_args()


def create_revista_mcp() -> FastMCP:
    """Create a FastMCP server with all Revista API tools."""
    # Use simple alphanumeric name to ensure tool prefixes are valid
    mcp = FastMCP("revista")

    # ─── Construction ────────────────────────────────────────────────
    @mcp.tool(tags={"Construction"})
    async def get_construction_by_lat_lon(
        lat: float,
        lon: float,
        radius: int,
    ) -> str:
        """Returns Construction properties within the radius (miles) of the lat/lon provided.
        Example: lat=29.5387, lon=-95.1180, radius=10"""
        # Map snake_case args to API path params {Lat}, {Lon}, {Radius}
        return await _call_revista(
            "/ConstructionByLatLon/{Lat}/{Lon}/{Radius}",
            Lat=lat, Lon=lon, Radius=radius,
        )

    @mcp.tool(tags={"Construction"})
    async def get_construction_by_property(property_id: int) -> str:
        """Summary Construction data for a provided property ID. Example: property_id=361419"""
        return await _call_revista(
            "/ConstructionByProperty/{PropertyID}", PropertyID=property_id
        )

    @mcp.tool(tags={"Construction"})
    async def get_construction_by_cbsa(cbsa_code: str) -> str:
        """Construction data for a given CBSA metro. Example: cbsa_code='26420' (Houston)"""
        return await _call_revista(
            "/ConstructionByCBSA/{CBSACode}", CBSACode=cbsa_code
        )

    # ─── Lists ───────────────────────────────────────────────────────
    @mcp.tool(tags={"Lists"})
    async def get_metro_list() -> str:
        """List of the top 125 Metros by population (CBSA codes)."""
        return await _call_revista("/MetroList")

    @mcp.tool(tags={"Lists"})
    async def get_stakeholders_list() -> str:
        """List of Owner Stakeholders."""
        return await _call_revista("/StakeholdersList")

    # ─── Market Data ─────────────────────────────────────────────────
    @mcp.tool(tags={"MarketData"})
    async def get_specialty_demand(
        lat: float, lon: float, radius: int
    ) -> str:
        """Returns Specialty Demand data for a given location and radius.
        Example: lat=41.8849, lon=-87.6671, radius=3"""
        return await _call_revista(
            "/SpecialtyDemand/{lat}/{lon}/{radius}",
            lat=lat, lon=lon, radius=radius,
        )

    @mcp.tool(tags={"MarketData"})
    async def get_demographics(lat: float, lon: float, radius: int) -> str:
        """Returns Demographics data for a given location and radius.
        Example: lat=39.2992, lon=-76.6094, radius=3"""
        return await _call_revista(
            "/Demographics/{lat}/{lon}/{radius}",
            lat=lat, lon=lon, radius=radius,
        )

    @mcp.tool(tags={"MarketData"})
    async def get_fundamentals_by_cbsa(cbsa_code: str, trend: str) -> str:
        """Retrieves MOB Fundamentals by CBSA code. 
        trend must be 'true' or 'false'. Use 'true' for historical time series.
        Example: cbsa_code='26420', trend='true'"""
        return await _call_revista(
            "/FundamentalsByCBSA/{CBSACode}/{trend}",
            CBSACode=cbsa_code, trend=trend,
        )

    @mcp.tool(tags={"MarketData"})
    async def get_fundamentals_by_radius(
        lat: float, lon: float, radius: int, trend: str
    ) -> str:
        """Retrieves MOB Fundamentals by geographic radius.
        trend must be 'true' or 'false'. Use 'true' for historical time series.
        Example: lat=29.5387, lon=-95.1180, radius=10, trend='false'"""
        return await _call_revista(
            "/FundamentalsByRadius/{lat}/{lon}/{radius}/{trend}",
            lat=lat, lon=lon, radius=radius, trend=trend,
        )

    @mcp.tool(tags={"MarketData"})
    async def get_market_trends(cbsa_code: str) -> str:
        """MOB Trend data for a CBSA. Valid values include CBSA codes for top 125 metros, 'Top100', and 'Top50'.
        Example: cbsa_code='26420'"""
        return await _call_revista(
            "/MarketTrends/{CBSACode}", CBSACode=cbsa_code
        )

    # ─── Property ────────────────────────────────────────────────────
    @mcp.tool(tags={"Property"})
    async def search_properties(lat: float, lon: float) -> str:
        """Returns properties within 10 miles of the lat/lon passed in.
        Example: lat=29.5387, lon=-95.1180"""
        return await _call_revista(
            "/Property/Search/{Lat}/{Lon}", Lat=lat, Lon=lon
        )

    @mcp.tool(tags={"Property"})
    async def get_property(property_id: int) -> str:
        """Summary data for a single property. Example: property_id=361419"""
        return await _call_revista(
            "/Property/{PropertyID}", PropertyID=property_id
        )

    @mcp.tool(tags={"Property"})
    async def get_property_stakeholders(property_id: int) -> str:
        """Stakeholders for a single property. Example: property_id=361419"""
        return await _call_revista(
            "/Property/Stakeholders/{PropertyID}", PropertyID=property_id
        )

    @mcp.tool(tags={"Property"})
    async def get_new_properties(start_date: str) -> str:
        """List of new properties added after the start date. Max 120 days history.
        Date format: mm-dd-yyyy. Example: start_date='01-01-2025'"""
        return await _call_revista(
            "/Property/NewProperties/{StartDate}", StartDate=start_date
        )

    @mcp.tool(tags={"Property"})
    async def get_updated_properties(start_date: str) -> str:
        """List of properties updated after the start date. Max 60 days history.
        Date format: mm-dd-yyyy. Example: start_date='01-01-2025'"""
        return await _call_revista(
            "/Property/UpdatedProperties/{StartDate}", StartDate=start_date
        )

    # ─── Transactions ────────────────────────────────────────────────
    @mcp.tool(tags={"Transactions"})
    async def get_transactions_by_property(property_id: int) -> str:
        """Gets Transactions by PropertyID. Example: property_id=146507"""
        return await _call_revista(
            "/TransactionsByProperty/{PropertyID}", PropertyID=property_id
        )

    @mcp.tool(tags={"Transactions"})
    async def get_transactions_by_stakeholder(stakeholder_id: int) -> str:
        """Gets Transactions by Stakeholder. Example: stakeholder_id=50"""
        return await _call_revista(
            "/TransactionsByStakeholder/{StakeholderID}",
            StakeholderID=stakeholder_id,
        )

    @mcp.tool(tags={"Transactions"})
    async def get_transactions_by_metro(cbsa_code: str) -> str:
        """Gets Transactions by Metro (CBSA code). Example: cbsa_code='12060'"""
        return await _call_revista(
            "/TransactionsByMetro/{CBSACode}", CBSACode=cbsa_code
        )

    # ─── Resource: Metro list cache ──────────────────────────────────
    @mcp.resource("revista://metros/list", mime_type="application/json")
    async def metro_list_resource() -> str:
        """Returns the cached list of Metros (CBSA codes) as JSON."""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            cache_path = os.path.join(current_dir, "cbsa_list.json")
            with open(cache_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return json.dumps({"error": "cbsa_list.json not found."})

    return mcp


def main():
    load_dotenv()
    args = parse_args()

    logger.info("Creating Revista MCP server...")
    mcp = create_revista_mcp()

    # Get the Starlette HTTP app from FastMCP
    app = mcp.streamable_http_app()

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["mcp-session-id", "mcp-protocol-version"],
        max_age=86400,
    )

    logger.info(f"Revista MCP Server starting on http://{args.host}:{args.port}/mcp")
    logger.info(f"17 Revista tools registered")

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()

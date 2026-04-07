"""
Server-Side MCP Tool Executor

This module executes MCP tools directly via HTTP instead of deferring 
to the OpenBB client. This eliminates round-trips and prevents looping.
"""

import httpx
import json
import asyncio
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# MCP Server Configuration
MCP_SERVER_BASE_URL = "http://localhost:8020"
MCP_TIMEOUT = 30.0  # seconds


async def execute_mcp_tool(
    tool_name: str,
    parameters: Dict[str, Any],
    server_url: str = MCP_SERVER_BASE_URL
) -> Dict[str, Any]:
    """
    Execute an MCP tool directly via HTTP call to the MCP server.
    
    Args:
        tool_name: Name of the MCP tool (e.g., "Revista_get_fundamentals_by_property")
        parameters: Tool parameters (e.g., {"PropertyID": 801528})
        server_url: Base URL of the MCP server
    
    Returns:
        Tool result as a dictionary
    """
    
    # Convert tool name to endpoint path
    # Tool names are like "Revista_get_fundamentals_by_property" 
    # Endpoints are like "/FundamentalsByProperty/{PropertyID}"
    endpoint_path = _tool_name_to_path(tool_name, parameters)
    
    if endpoint_path is None:
        return {"error": f"Unknown tool: {tool_name}", "data": None}
    
    url = f"{server_url}{endpoint_path}"
    
    print(f"[MCP EXEC] Calling: {url}")
    
    try:
        async with httpx.AsyncClient(timeout=MCP_TIMEOUT) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": f"Timeout calling {tool_name}", "data": None}
    except httpx.HTTPStatusError as e:
        return {"error": f"HTTP {e.response.status_code}: {e.response.text[:200]}", "data": None}
    except Exception as e:
        return {"error": str(e), "data": None}


def _tool_name_to_path(tool_name: str, parameters: Dict[str, Any]) -> Optional[str]:
    """
    Convert MCP tool name + parameters to HTTP endpoint path.
    
    Mapping based on Revista API structure:
    - Tool names follow pattern: Revista_{method}_{entity}
    - Endpoints follow pattern: /{Entity}/{Param1}/{Param2}
    """
    
    # Direct mapping of known tools to endpoints
    TOOL_MAPPINGS = {
        # Property-based endpoints
        "Revista_get_fundamentals_by_property": lambda p: f"/FundamentalsByProperty/{p.get('PropertyID')}",
        "Revista_get_transactions_by_property": lambda p: f"/TransactionsByProperty/{p.get('PropertyID')}",
        "Revista_get_construction_by_property": lambda p: f"/ConstructionByProperty/{p.get('PropertyID')}",
        "Revista_get_availability_by_property": lambda p: f"/AvailabilityByProperty/{p.get('PropertyID')}",
        "Revista_get_stakeholders_by_property": lambda p: f"/StakeholdersByProperty/{p.get('PropertyID')}",
        
        # CBSA-based endpoints
        "Revista_get_fundamentals_by_c_b_s_a": lambda p: f"/FundamentalsByCBSA/{p.get('CBSACode')}",
        "Revista_get_transactions_by_c_b_s_a": lambda p: f"/TransactionsByCBSA/{p.get('CBSACode')}",
        "Revista_get_construction_by_c_b_s_a": lambda p: f"/ConstructionByCBSA/{p.get('CBSACode')}",
        "Revista_get_demographics": lambda p: f"/Demographics/{p.get('CBSACode')}",
        "Revista_get_specialty_demand": lambda p: f"/SpecialtyDemandByCBSA/{p.get('CBSACode')}",
        
        # Other endpoints
        "Revista_get_property_summary": lambda p: f"/PropertySummary/{p.get('PropertyID')}",
        "Revista_get_cbsa_list": lambda p: "/CBSAList",
    }
    
    mapping_func = TOOL_MAPPINGS.get(tool_name)
    if mapping_func:
        try:
            return mapping_func(parameters)
        except Exception as e:
            logger.error(f"Error mapping {tool_name}: {e}")
            return None
    
    # Fallback: Try to construct path from tool name
    # e.g., "Revista_get_something_by_entity" -> "/SomethingByEntity/{param}"
    logger.warning(f"No explicit mapping for {tool_name}, attempting fallback")
    return None


# Cache for tool results within a single request
_request_cache: Dict[str, Any] = {}


def get_cached_result(tool_name: str, params: Dict[str, Any]) -> Optional[Any]:
    """Check if we already executed this tool with these params in this request."""
    cache_key = f"{tool_name}:{json.dumps(params, sort_keys=True)}"
    return _request_cache.get(cache_key)


def cache_result(tool_name: str, params: Dict[str, Any], result: Any):
    """Cache a tool result for this request."""
    cache_key = f"{tool_name}:{json.dumps(params, sort_keys=True)}"
    _request_cache[cache_key] = result


def clear_request_cache():
    """Clear the request-level cache. Call at start of each new request."""
    global _request_cache
    _request_cache = {}

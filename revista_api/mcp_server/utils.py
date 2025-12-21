import json
from typing import List, Dict, Any, Tuple
import re

def parse_docs(json_path: str) -> List[Dict[str, Any]]:
    """
    Parse the revista_docs.json file and return a list of endpoint definitions.
    """
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Docs file not found at {json_path}")
        return []

    endpoints = []
    
    if "nodes" not in data:
        return []

    for node in data["nodes"]:
        if node.get("type") == "endpoint":
            node_data = node.get("data", {})
            path = node_data.get("path")
            method = node_data.get("method", "GET")
            summary = node_data.get("summary", "")
            tags = node_data.get("tags", [])
            
            # Extract parameters from path
            # e.g., /ConstructionByLatLon/{Lat}/{Lon}/{Radius}
            # We need to identify {Lat}, {Lon}, {Radius}
            params = extract_params_from_path(path)
            
            endpoints.append({
                "name": sanitize_name(path, method),
                "path": path,
                "method": method,
                "description": summary,
                "tags": tags,
                "parameters": params
            })
            
    return endpoints

def extract_params_from_path(path: str) -> List[Dict[str, Any]]:
    """
    Extract parameters from a URL path template.
    Returns a list of dicts with name and recognized type.
    """
    if not path:
        return []
    
    # Regex to find {Param}
    matches = re.findall(r'\{([^}]+)\}', path)
    params = []
    
    # Rich metadata definitions - descriptions are passed to the LLM agent
    # IMPORTANT: These descriptions must be clear and explicit for the agent to use correctly
    PARAM_META = {
        "lat": {
            "type": "float", 
            "desc": "Latitude coordinate as decimal number. Example: 29.5387 for Webster, TX. Required for radius-based queries."
        },
        "lon": {
            "type": "float", 
            "desc": "Longitude coordinate as decimal number (typically negative in US). Example: -95.1180 for Webster, TX. Required for radius-based queries."
        },
        "radius": {
            "type": "int", 
            "desc": "Search radius in miles from the lat/lon point. Example: 10 for 10-mile radius. Common values: 5, 10, 25."
        },
        "cbsacode": {
            "type": "str", 
            "desc": "CBSA (Core Based Statistical Area) code as string. Examples: '26420' for Houston-The Woodlands-Sugar Land, '35620' for NYC, '31140' for Louisville."
        },
        "propertyid": {
            "type": "int", 
            "desc": "Revista Property ID as integer. Example: 361419 for Houston Physicians Hospital."
        },
        "stakeholderid": {
            "type": "int", 
            "desc": "Revista Stakeholder ID as integer. Obtained from get_property_stakeholders response."
        },
        "year": {
            "type": "int", 
            "desc": "Year as 4-digit integer. Example: 2024"
        },
        "month": {
            "type": "int", 
            "desc": "Month as integer 1-12. Example: 6 for June"
        },
        "trend": {
            "type": "str", 
            "desc": "REQUIRED: String 'true' or 'false' (lowercase, as a string, NOT boolean). Use 'true' to get historical time series data. Use 'false' for current snapshot only. Example: 'true'"
        },
        "startdate": {
            "type": "str", 
            "desc": "Start date in mm-dd-yyyy format as string. Example: '01-01-2020'"
        }
    }
    
    for param_name in matches:
        key = param_name.lower()
        meta = PARAM_META.get(key, {})
        
        # Use meta type if available, else fallback to heuristic
        param_type = meta.get("type")
        if not param_type:
            param_type = "str"
            if key in ["lat", "lon"]:
                param_type = "float"
            elif key in ["radius", "year", "month", "id", "propertyid", "stakeholderid"]:
                param_type = "int"

        param_desc = meta.get("desc", f"Parameter: {param_name}")
        
        params.append({
            "name": param_name,
            "type": param_type,
            "description": param_desc
        })
    
    return params

def sanitize_name(path: str, method: str) -> str:
    """
    Create a valid python function name/tool name from path.
    e.g. GET /ConstructionByLatLon/{Lat}... -> get_construction_by_lat_lon
    """
    # Remove parameters from path for naming
    # /ConstructionByLatLon/{Lat}/{Lon} -> /ConstructionByLatLon
    base_path = re.sub(r'/\{[^}]+\}', '', path)
    
    clean_path = base_path.replace("/", "_").replace("-", "_")
    name = f"{method.lower()}{clean_path}"
    
    # Convert camelCase/PascalCase to snake_case
    name = re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
    
    # Cleanup double underscores
    while "__" in name:
        name = name.replace("__", "_")
        
    return name.strip("_")

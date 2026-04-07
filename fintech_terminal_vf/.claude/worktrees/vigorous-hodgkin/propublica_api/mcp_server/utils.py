import json
from typing import List, Dict, Any
import re

def parse_docs(json_path: str) -> List[Dict[str, Any]]:
    """
    Parse the propublica_docs.json file and return a list of endpoint definitions.
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
            operation_id = node_data.get("operationId", "")
            parameters = node_data.get("parameters", [])
            
            # Use operationId for name if available, else generate from path
            name = operation_id if operation_id else sanitize_name(path, method)

            endpoints.append({
                "name": name,
                "path": path,
                "method": method,
                "description": summary,
                "tags": tags,
                "parameters": parameters 
            })
            
    return endpoints

def sanitize_name(path: str, method: str) -> str:
    """
    Create a valid python function name/tool name from path.
    e.g. GET /search.json -> get_search_json
    """
    # Remove parameters from path for naming
    base_path = re.sub(r'/\{[^}]+\}', '', path)
    
    clean_path = base_path.replace("/", "_").replace("-", "_").replace(".", "_")
    name = f"{method.lower()}{clean_path}"
    
    # Convert camelCase/PascalCase to snake_case
    name = re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
    
    # Cleanup double underscores
    while "__" in name:
        name = name.replace("__", "_")
        
    return name.strip("_")

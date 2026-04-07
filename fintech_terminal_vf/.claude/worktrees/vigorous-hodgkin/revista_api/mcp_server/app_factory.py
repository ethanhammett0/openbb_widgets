from fastapi import FastAPI, Depends, Request, Path, Query
from typing import Any, Dict, List, Optional, Annotated
import os
import inspect
from contextlib import asynccontextmanager

try:
    from .revista_client import RevistaClient
    from .utils import parse_docs
except ImportError:
    from revista_client import RevistaClient
    from utils import parse_docs

# We use this to hold the single client instance
client_instance: Optional[RevistaClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global client_instance
    client_instance = RevistaClient()
    yield
    # Shutdown
    # await client_instance.close() if implemented

def create_revista_app(docs_path: str = "../revista_docs.json") -> FastAPI:
    """
    Create a FastAPI app with routes dynamically generated from Revista docs.
    """
    app = FastAPI(title="Revista MCP Server", lifespan=lifespan)
    
    # Locate docs file relative to this file if not absolute
    if not os.path.isabs(docs_path):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        docs_path = os.path.join(current_dir, docs_path)
    
    endpoints = parse_docs(docs_path)
    
    for endpoint in endpoints:
        register_route(app, endpoint)
        
    return app

def register_route(app: FastAPI, endpoint: Dict[str, Any]):
    """
    Register a single endpoint as a FastAPI route with MCP metadata.
    """
    path = endpoint["path"]
    method = endpoint["method"]
    name = endpoint["name"]
    description = endpoint["description"]
    tags = endpoint["tags"]
    params = endpoint["parameters"]
    
    # Construct mcp_config dictionary for openbb-mcp-server
    mcp_config = {
        "name": name,
        "description": description,
        "tags": tags,
        # "enable": True # Enabled by default via category logic usually, but can force here if needed
    }
    
    # Create the dynamic function handler
    async def dynamic_handler(**kwargs) -> Any:
        global client_instance
        # Construct parameters for the client call
        # Path params are in kwargs (e.g. Lat, Lon) based on route definition
        if client_instance is None:
             # Fallback lazy init if lifespan didn't run
             client_instance = RevistaClient()
        
        # Replace path parameters in the path string
        # e.g. /ConstructionByLatLon/{Lat}/{Lon} -> /ConstructionByLatLon/12.3/45.6
        # We need to ensure we use the exact parameter names from the docs
        
        # The client accepts the raw path with {Param} placeholders and a params dict? 
        # Or we should format the URL here? 
        # Looking at RevistaClient, it takes `path` and `params`.
        # However, for endpoints like /Construction/{Lat}/{Lon}, the values are IN the URL.
        # So we should format the path string.
        
        formatted_path = path
        query_params = {}
        
        for param_name, param_value in kwargs.items():
            # Check if this param is in the path template
            placeholder = f"{{{param_name}}}"
            # Case insensitive check might be needed if docs are inconsistent, 
            # but utils.py extracted exact names.
            
            # Simple replace attempts
            if placeholder in formatted_path:
                formatted_path = formatted_path.replace(placeholder, str(param_value))
            else:
                # Assume it's a query param if not in path (though our utils only extracted path params so far)
                query_params[param_name] = param_value
        
        # Remove any lingering braces if optional parameters were missing (safety check)
        # But for now assume all generated args are required path params
        
        try:
            return await client_instance.make_request(formatted_path, method, params=query_params)
        except Exception as e:
            # Phase 2.3: Graceful Failure
            # Catch backend errors (e.g. SQL Arithmetic overflow) and return structured error
            # This allows the agent to see "Tool Failed" instead of the whole server crashing/500ing
            return {
                "error": "Backend processing failed", 
                "details": str(e),
                "statusCode": 500,
                "message": "Data unavailable for this query likely due to backend limits (e.g. high density area). Skip this metric."
            }

    # Dynamic function signature generation is tricky in pure Python without makefun.
    # However, FastAPI inspects the function signature.
    # To keep it simple and robust, we can use `inspect` to set the valid signature, 
    # OR since we are just an MCP proxy, we can define specific logical types if we want rigorous validation.
    # BUT, to implement "query anything", a loosely typed kwargs approach or explicit signature creation is best.
    
    # Let's try to construct a proper signature so FastAPI handles arg extraction correctly.
    parameters = []
    for p in params:
        p_name = p["name"]
        p_type = p["type"]
        annotation = str
        if p_type == "int":
            annotation = int
        elif p_type == "float":
            annotation = float
        
        # Create Annotated type with description
        p_desc = p.get("description", "")
        # Use Path for path params
        annotated_type = Annotated[annotation, Path(description=p_desc)]
        
        parameters.append(
            inspect.Parameter(
                p_name,
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
                annotation=annotated_type
            )
        )
    
    # Add Request parameter for internal use if needed, though strictly not required if we just use kwargs
    # But usually good practice. Actually, let's keep it simple.
    
    dynamic_handler.__name__ = name
    dynamic_handler.__doc__ = description
    dynamic_handler.__signature__ = inspect.Signature(parameters)
    
    # Determine tags for FastAPI (using the first tag from docs for category)
    fastapi_tags = tags if tags else ["general"]

    app.add_api_route(
        path,
        dynamic_handler,
        methods=[method],
        name=name,
        summary=description,
        tags=fastapi_tags,
        openapi_extra={"mcp_config": mcp_config}
    )

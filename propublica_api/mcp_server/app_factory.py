from fastapi import FastAPI, Path, Query
from typing import Any, Dict, List, Optional, Annotated
import os
import inspect
from contextlib import asynccontextmanager

try:
    from .propublica_client import ProPublicaClient
    from .utils import parse_docs
except ImportError:
    from propublica_client import ProPublicaClient
    from utils import parse_docs

# Global client instance
client_instance: Optional[ProPublicaClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client_instance
    client_instance = ProPublicaClient()
    yield

def create_propublica_app(docs_path: str = "propublica_docs.json") -> FastAPI:
    """Create a FastAPI app with routes dynamically generated from ProPublica docs."""
    app = FastAPI(title="ProPublica MCP Server", lifespan=lifespan)
    
    if not os.path.isabs(docs_path):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        docs_path = os.path.join(current_dir, docs_path)
    
    endpoints = parse_docs(docs_path)
    
    for endpoint in endpoints:
        register_route(app, endpoint)
        
    return app

def register_route(app: FastAPI, endpoint: Dict[str, Any]):
    path = endpoint["path"]
    method = endpoint["method"]
    name = endpoint["name"]
    description = endpoint["description"]
    tags = endpoint["tags"]
    params = endpoint["parameters"]
    
    mcp_config = {
        "name": name,
        "description": description,
        "tags": tags,
    }
    
    async def dynamic_handler(**kwargs) -> Any:
        global client_instance
        if client_instance is None:
            client_instance = ProPublicaClient()
            
        formatted_path = path
        query_params = {}
        
        # ProPublica-specific parameter mapping
        # Maps friendly names to API param names (e.g. state_id -> state[id])
        param_mapping = {
            "state_id": "state[id]",
            "ntee_id": "ntee[id]",
            "c_code_id": "c_code[id]"
        }
        
        for p_name, p_value in kwargs.items():
            if p_value is None:
                continue
                
            placeholder = f"{{{p_name}}}"
            if placeholder in formatted_path:
                formatted_path = formatted_path.replace(placeholder, str(p_value))
            else:
                # Query parameter
                api_key = param_mapping.get(p_name, p_name)
                query_params[api_key] = p_value
                
        try:
             # Clean up any leftover path parameters if they were optional (none in this API, but good hygiene)
             return await client_instance.make_request(formatted_path, method, params=query_params)
        except Exception as e:
             return {"error": "Processing failed", "details": str(e)}

    # Dynamic signature generation
    parameters = []
    for p in params:
        p_name = p["name"]
        p_type = p["type"]
        p_desc = p["description"]
        
        annotation = str
        if p_type == "integer":
            annotation = int
        
        # Determine if required or optional
        # For search, all are optional. For org/{ein}, ein is required path param.
        default_val = inspect.Parameter.empty
        if "{" + p_name + "}" not in path:
             default_val = None # Query params are optional here
             annotation = Optional[annotation]
        
        if default_val == inspect.Parameter.empty:
             # Required path param
             param_annotation = Annotated[annotation, Path(description=p_desc)]
        else:
             # Optional query param - DO NOT set default in Query() when using Annotated + python default
             param_annotation = Annotated[annotation, Query(description=p_desc)]

        parameters.append(
            inspect.Parameter(
                p_name,
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
                default=default_val,
                annotation=param_annotation
            )
        )
        
    dynamic_handler.__name__ = name
    dynamic_handler.__doc__ = description
    dynamic_handler.__signature__ = inspect.Signature(parameters)
    
    app.add_api_route(
        path,
        dynamic_handler,
        methods=[method],
        name=name,
        summary=description,
        tags=tags,
        openapi_extra={"mcp_config": mcp_config}
    )

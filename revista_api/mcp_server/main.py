import asyncio
import logging
import sys
import argparse
from typing import Optional
from dotenv import load_dotenv

import uvicorn
from openbb_mcp_server.app.app import create_mcp_server, stdio_main, _build_runtime_middleware, SSEShutdownWrapper
from openbb_mcp_server.models.settings import MCPSettings
from starlette.middleware import Middleware

try:
    from mcp_server.app_factory import create_revista_app
except ImportError:
    from app_factory import create_revista_app

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("revista-mcp-server")

def parse_args():
    parser = argparse.ArgumentParser(description="Revista MCP Server")
    parser.add_argument(
        "--transport", 
        default="stdio", 
        choices=["stdio", "sse", "http"], 
        help="Transport protocol to use"
    )
    parser.add_argument(
        "--host", 
        default="127.0.0.1", 
        help="Host to bind to (for http/sse)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000, 
        help="Port to bind to (for http/sse)"
    )
    parser.add_argument(
        "--docs",
        default="../revista_docs.json",
        help="Path to revista_docs.json"
    )
    return parser.parse_args()

def main():
    load_dotenv()
    args = parse_args()
    
    # Initialize the Revista FastAPI app
    app = create_revista_app(docs_path=args.docs)
    
    # Create default settings
    # You can customize MCPSettings if needed, e.g. system prompt path
    settings = MCPSettings(
        enable_tool_discovery=True,
        # describe_responses=True 
    )
    
    # Create the FastMCP server wrapper
    mcp_server = create_mcp_server(settings, app)
    
    # Register Resources
    @mcp_server.resource("revista://metros/list", mime_type="application/json")
    async def get_metro_list() -> str:
        """Returns the cached list of Metros (CBSA codes) as a JSON string."""
        import json
        import os
        try:
            # Look for cached file in the same directory as main.py
            current_dir = os.path.dirname(os.path.abspath(__file__))
            cache_path = os.path.join(current_dir, "cbsa_list.json")
            
            with open(cache_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return json.dumps({"error": "Cache file cbsa_list.json not found. Run fetch_cbsa_list.py first."})
    
    if args.transport == "stdio":
        asyncio.run(stdio_main(mcp_server))
    elif args.transport in ["http", "sse"]:
        # Run with Uvicorn
        # Note: openbb-mcp-server's run method might be preferred if we want the full middleware stack
        # tailored for it, but connecting it manually gives us control.
        # However, checking app.py from openbb-mcp-server, it uses `mcp_server.run` which handles uvicorn internally better?
        # Actually `mcp_server.run` handles it.
        
        cors_middleware = _build_runtime_middleware()
        
        # Add SSE shutdown handling
        if args.transport == "sse":
             cors_middleware.append(Middleware(SSEShutdownWrapper))

        mcp_server.run(
            transport=args.transport,
            host=args.host,
            port=args.port,
            middleware=cors_middleware
        )

if __name__ == "__main__":
    main()

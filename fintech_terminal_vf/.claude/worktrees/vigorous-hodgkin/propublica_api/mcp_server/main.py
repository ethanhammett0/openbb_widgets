import asyncio
import logging
import argparse
from dotenv import load_dotenv

from openbb_mcp_server.app.app import create_mcp_server, stdio_main, _build_runtime_middleware, SSEShutdownWrapper
from openbb_mcp_server.models.settings import MCPSettings
from starlette.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware

try:
    from mcp_server.app_factory import create_propublica_app
except ImportError:
    from app_factory import create_propublica_app

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("propublica-mcp-server")

def parse_args():
    parser = argparse.ArgumentParser(description="ProPublica MCP Server")
    parser.add_argument("--transport", default="stdio", choices=["stdio", "sse", "http"], help="Transport protocol")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8021, help="Port to bind to")
    return parser.parse_args()

def main():
    load_dotenv()
    args = parse_args()
    
    app = create_propublica_app()
    
    settings = MCPSettings(
        enable_tool_discovery=True,
    )
    
    mcp_server = create_mcp_server(settings, app)
    
    if args.transport == "stdio":
        asyncio.run(stdio_main(mcp_server))
    elif args.transport in ["http", "sse"]:
        cors_middleware = _build_runtime_middleware()
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
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

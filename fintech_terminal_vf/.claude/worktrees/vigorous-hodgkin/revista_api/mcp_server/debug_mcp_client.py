import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.sse import sse_client
from mcp.types import Resource

async def run():
    url = "http://127.0.0.1:8020/sse"
    print(f"Connecting to MCP Server at {url}...")
    
    try:
        async with sse_client(url=url) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("MCP Initialization successful.")
                
                # List Resources
                print("Listing Resources...")
                resources_result = await session.list_resources()
                resources = resources_result.resources
                print(f"Found {len(resources)} resources.")
                for res in resources:
                    print(f" - Name: {res.name}, URI: {res.uri}")
                
                # List Tools
                print("Listing Tools...")
                tools_result = await session.list_tools()
                tools = tools_result.tools
                print(f"Found {len(tools)} tools.")
                
    except Exception as e:
        print(f"MCP Client Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run())

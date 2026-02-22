import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client
import json

async def main():
    url = "http://127.0.0.1:8020/sse"
    print(f"Connecting to {url}...")
    try:
        async with sse_client(url) as streams:
            async with ClientSession(streams[0], streams[1]) as session:
                print("Initializing session...")
                await session.initialize()
                
                print("Calling get_property tool...")
                result = await session.call_tool("get_property", {"PropertyID": 361419})
                print(f"Result: {str(result.content)[:200]}...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

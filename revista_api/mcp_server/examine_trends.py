import asyncio
import json
from dotenv import load_dotenv
from revista_client import RevistaClient

async def examine():
    load_dotenv()
    client = RevistaClient()
    
    print("Fetching MarketTrends/Top50...")
    # This was one of the endpoints.
    resp = await client.make_request("MarketTrends/Top50")
    
    if isinstance(resp, dict) and "value" in resp:
        data = resp["value"]
        if isinstance(data, list) and data:
            print("Got Data. First Item Keys:")
            print(json.dumps(list(data[0].keys()), indent=2))
            # Also print the item itself
            # print(json.dumps(data[0], indent=2))
        else:
            print("Empty list.")
    else:
        print(f"Resp: {resp}")

if __name__ == "__main__":
    asyncio.run(examine())

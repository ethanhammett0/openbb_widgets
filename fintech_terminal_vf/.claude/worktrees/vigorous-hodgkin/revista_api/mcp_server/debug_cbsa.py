import asyncio
import json
from dotenv import load_dotenv
from revista_client import RevistaClient

async def debug_cbsa():
    load_dotenv()
    client = RevistaClient()
    
    path = "FundamentalsByCBSA/35620/true"
    print(f"Fetching {path}...")
    
    try:
        resp = await client.make_request(path)
        print("Response Type:", type(resp))
        print("Raw Response:")
        print(json.dumps(resp, indent=2))
        
        if isinstance(resp, dict) and "value" in resp:
            val = resp["value"]
            print(f"Value List Length: {len(val)}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_cbsa())

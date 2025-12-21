import asyncio
import aiohttp
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

async def debug_trends(prop_id):
    base_url = "https://api.revistamed.com"
    api_key = os.getenv("REVISTA_API_KEY")
    
    print(f"--- Debugging Market Trends for ID: {prop_id} ---")

    async with aiohttp.ClientSession() as session:
        # 1. Get Location
        print("1. Fetching Property...")
        async with session.get(f"{base_url}/Property/{prop_id}?ApiKey={api_key}") as p_resp:
            p_raw = await p_resp.json()
            p_data = p_raw.get('value', p_raw)
            cbsa = p_data.get('cbsA_Code')
            print(f"   CBSA: {cbsa}")

        if not cbsa:
            print("   ERROR: No CBSA found.")
            return

        # 2. Get Market Trends
        url = f"{base_url}/MarketTrends/{cbsa}?ApiKey={api_key}"
        print(f"2. Fetching Fundamentals: {url.replace(api_key, 'HIDDEN')}")
        
        async with session.get(url) as resp:
            print(f"   Status: {resp.status}")
            raw_data = await resp.json()
            print(f"   Raw Data: {raw_data}")
            data = raw_data.get('value', raw_data)
            
            print(f"   Data Type: {type(data)}")
            if isinstance(data, list):
                print(f"   List Length: {len(data)}")
                if len(data) > 0:
                    for k in data[0].keys():
                        print(k)
            elif isinstance(data, dict):
                print(f"   Dict Keys: {data.keys()}")
            else:
                print(f"   Data: {data}")

if __name__ == "__main__":
    asyncio.run(debug_trends(570571))

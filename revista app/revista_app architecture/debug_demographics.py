import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_demographics(prop_id):
    base_url = "https://api.revistamed.com"
    api_key = os.getenv("REVISTA_API_KEY")
    
    # 1. Get Property
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{base_url}/Property/{prop_id}?ApiKey={api_key}") as p_resp:
            p_raw = await p_resp.json()
            p_data = p_raw.get('value', p_raw)
            lat = p_data.get('lat')
            lon = p_data.get('lon')
    
    # 2. Get Demographics
    url = f"{base_url}/Demographics/{lat}/{lon}/5?ApiKey={api_key}"
    print(f"Fetching: {url.replace(api_key, 'HIDDEN')}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            print(f"Status: {resp.status}")
            raw_data = await resp.json()
            data = raw_data.get('value', raw_data)
            
            print(f"Data Type: {type(data)}")
            if isinstance(data, list):
                print(f"Length: {len(data)}")
                if len(data) > 0:
                    print(f"First Item Keys: {data[0].keys()}")
            elif isinstance(data, dict):
                print(f"Keys: {data.keys()}")

if __name__ == "__main__":
    asyncio.run(debug_demographics(570571))

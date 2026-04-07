import asyncio
import aiohttp
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

async def debug_stakeholders(prop_id):
    base_url = "https://api.revistamed.com"
    api_key = os.getenv("REVISTA_API_KEY")
    
    print(f"--- Debugging Stakeholders for ID: {prop_id} ---")
    
    url = f"{base_url}/Property/Stakeholders/{prop_id}?ApiKey={api_key}"
    print(f"Fetching: {url.replace(api_key, 'HIDDEN')}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            print(f"Status: {resp.status}")
            raw_data = await resp.json()
            data = raw_data.get('value', raw_data)
            
            print(f"Data Type: {type(data)}")
            if isinstance(data, list):
                print(f"Count: {len(data)}")
            else:
                print(f"Data: {data}")

if __name__ == "__main__":
    asyncio.run(debug_stakeholders(361419))

import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_search(query):
    # 1. Geocode
    print(f"--- Debugging Search for '{query}' ---")
    async with aiohttp.ClientSession() as session:
        geo_url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json"
        async with session.get(geo_url, headers={"User-Agent": "OpenBB-Revista/1.0"}) as resp:
            geo_data = await resp.json()
            if not geo_data:
                print("Geo: No results")
                return
            lat = geo_data[0]['lat']
            lon = geo_data[0]['lon']
            print(f"Geo: {lat}, {lon}")

    # 2. Revista Search
    base_url = "https://api.revistamed.com"
    api_key = os.getenv("REVISTA_API_KEY")
    rev_url = f"{base_url}/Property/Search/{lat}/{lon}?ApiKey={api_key}"
    print(f"Revista URL: {rev_url.replace(api_key, 'HIDDEN')}")

    async with aiohttp.ClientSession() as session:
        async with session.get(rev_url) as resp:
            print(f"Status: {resp.status}")
            raw_data = await resp.json()
            print(f"Raw Data Type: {type(raw_data)}")
            if isinstance(raw_data, dict):
                print(f"Keys: {raw_data.keys()}")
                if 'value' in raw_data:
                    val = raw_data['value']
                    print(f"Value Type: {type(val)}")
                    if isinstance(val, list):
                        print(f"Value Length: {len(val)}")
                        if len(val) > 0:
                            print(f"First Item Keys: {val[0].keys()}")
            elif isinstance(raw_data, list):
                print(f"List Length: {len(raw_data)}")

if __name__ == "__main__":
    asyncio.run(debug_search("City MD"))

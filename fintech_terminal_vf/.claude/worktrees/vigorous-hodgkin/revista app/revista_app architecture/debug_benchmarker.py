import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_benchmarker(prop_id):
    base_url = "https://api.revistamed.com"
    api_key = os.getenv("REVISTA_API_KEY")
    
    print(f"--- Debugging Benchmarker for ID: {prop_id} ---")
    
    async with aiohttp.ClientSession() as session:
        # 1. Get Property
        async with session.get(f"{base_url}/Property/{prop_id}?ApiKey={api_key}") as p_resp:
            p_raw = await p_resp.json()
            p_data = p_raw.get('value', p_raw)
            lat = p_data.get('lat')
            lon = p_data.get('lon')
            cbsa = p_data.get('cbsA_Code')
            print(f"Lat: {lat}, Lon: {lon}, CBSA: {cbsa}")

        # 2. Try Radius
        url_rad = f"{base_url}/FundamentalsByRadius/{lat}/{lon}/5/false?ApiKey={api_key}"
        print(f"Radius URL: {url_rad.replace(api_key, 'HIDDEN')}")
        async with session.get(url_rad) as r_resp:
            print(f"Radius Status: {r_resp.status}")
            r_raw = await r_resp.json()
            r_val = r_raw.get('value', r_raw)
            print(f"Radius Value: {r_val}")

        # 3. Try CBSA
        url_cbsa = f"{base_url}/FundamentalsByCBSA/{cbsa}/false?ApiKey={api_key}"
        print(f"CBSA URL: {url_cbsa.replace(api_key, 'HIDDEN')}")
        async with session.get(url_cbsa) as c_resp:
            print(f"CBSA Status: {c_resp.status}")
            c_raw = await c_resp.json()
            c_val = c_raw.get('value', c_raw)
            print(f"CBSA Value: {c_val}")

if __name__ == "__main__":
    asyncio.run(debug_benchmarker(570571))

import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_api(prop_id):
    api_key = os.getenv("REVISTA_API_KEY")
    url = f"https://api.revistamed.com/v1/Property/{prop_id}?ApiKey={api_key}"
    
    print(f"Requesting: {url.replace(api_key, 'HIDDEN_KEY')}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            print(f"Status: {resp.status}")
            text = await resp.text()
            print(f"Response: {text}")

if __name__ == "__main__":
    asyncio.run(debug_api(361419))

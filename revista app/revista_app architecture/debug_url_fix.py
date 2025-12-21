import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_url_fix(prop_id):
    api_key = os.getenv("REVISTA_API_KEY")
    
    # Try WITHOUT /v1
    url = f"https://api.revistamed.com/Property/{prop_id}?ApiKey={api_key}"
    
    print(f"Requesting: {url.replace(api_key, 'HIDDEN_KEY')}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            print(f"Status: {resp.status}")
            if resp.status == 200:
                data = await resp.json()
                print("Response Keys:", data.keys())
                if "value" in data:
                    print("Found 'value' wrapper!")
                    print("Name inside value:", data["value"].get("propertyName"))
            else:
                print("Response:", await resp.text())

if __name__ == "__main__":
    asyncio.run(debug_url_fix(361419))

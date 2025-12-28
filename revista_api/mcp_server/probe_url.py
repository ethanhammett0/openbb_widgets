import asyncio
import os
import httpx
from dotenv import load_dotenv

async def probe():
    load_dotenv()
    api_key = os.environ.get("revista_api_key")
    if not api_key:
        print("No API Key found")
        return

    base_urls = [
        "https://api.revistamed.com/v1",
        "https://api.revistamed.com/api/v1",
        "https://api.revistamed.com",
        "https://api.revistadata.com/api/v1" # Re-try old one with query param just in case
    ]
    
    async with httpx.AsyncClient() as client:
        for base in base_urls:
            url = f"{base}/MetroList"
            print(f"Probing {url}...")
            try:
                resp = await client.get(url, params={"ApiKey": api_key}, timeout=5.0)
                print(f"Result: {resp.status_code}")
                if resp.status_code == 200:
                    print("SUCCESS URL FOUND:", base)
                    break
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(probe())

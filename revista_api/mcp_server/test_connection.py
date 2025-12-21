import asyncio
import os
from dotenv import load_dotenv
from revista_client import RevistaClient

async def test_connection():
    load_dotenv()
    api_key = os.environ.get("revista_api_key")
    print(f"Loaded API Key: {'*' * (len(api_key)-4) + api_key[-4:] if api_key else 'None'}")
    
    client = RevistaClient()
    print("Testing connection to Revista API (GET /MetroList)...")
    
    # /MetroList is a simple endpoint usually
    response = await client.make_request("MetroList")
    
    if isinstance(response, dict) and "error" in response:
        print("Error:", response)
    else:
        print("Success! Response sample:")
        # Print first item if list, or keys if dict
        if isinstance(response, list):
             print(f"Got {len(response)} items.")
             if response:
                 print(response[0])
        else:
             print(response)

if __name__ == "__main__":
    asyncio.run(test_connection())

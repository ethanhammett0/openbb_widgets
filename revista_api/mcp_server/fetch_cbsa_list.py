import asyncio
import json
import os
from dotenv import load_dotenv
from revista_client import RevistaClient

async def fetch_and_save_cbsa_list():
    load_dotenv()
    
    # Initialize client
    client = RevistaClient()
    
    # Path for MetroList endpoint
    path = "MetroList"
    output_file = "cbsa_list.json"
    
    print(f"Fetching {path}...")
    
    try:
        # Make the request
        resp = await client.make_request(path)
        
        # Check if response is valid list or dict with values
        data_to_save = []
        
        if isinstance(resp, list):
            data_to_save = resp
        elif isinstance(resp, dict) and "value" in resp:
             # OData style response
             data_to_save = resp["value"]
        else:
            # Fallback or error
            print(f"Unexpected response format: {type(resp)}")
            print(json.dumps(resp, indent=2))
            return

        print(f"Fetched {len(data_to_save)} records.")
        
        # Save to JSON file
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data_to_save, f, indent=2)
            
        print(f"Saved to {output_file}")
            
    except Exception as e:
        print(f"Error fetching CBSA list: {e}")

if __name__ == "__main__":
    asyncio.run(fetch_and_save_cbsa_list())

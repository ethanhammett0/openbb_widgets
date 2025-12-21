import asyncio
import json
from dotenv import load_dotenv
from revista_client import RevistaClient

async def query_hph():
    load_dotenv()
    client = RevistaClient()
    prop_id = "361419"
    
    endpoints = {
        "Summary": f"Property/{prop_id}",
        "Stakeholders": f"Property/Stakeholders/{prop_id}",
        "Transactions": f"TransactionsByProperty/{prop_id}",
        "Construction": f"ConstructionByProperty/{prop_id}"
    }
    
    print(f"--- Querying Data for HPH (ID: {prop_id}) ---\n")
    
    for label, path in endpoints.items():
        print(f"Fetching {label}...")
        try:
            resp = await client.make_request(path)
            
            # Unwrap if needed
            data = resp
            if isinstance(resp, dict) and "value" in resp:
                data = resp["value"]
            
            if not data:
                print(f"  > No data found.")
                continue

            if isinstance(data, list):
                print(f"  > Found {len(data)} items.")
                print(json.dumps(data, indent=2))
            else:
                print(f"  > Data retrieved.")
                print(json.dumps(data, indent=2))
                
        except Exception as e:
            print(f"  > ERROR: {e}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(query_hph())

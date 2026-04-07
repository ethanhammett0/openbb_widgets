import asyncio
import json
from dotenv import load_dotenv
from revista_client import RevistaClient

async def check_alternatives():
    load_dotenv()
    client = RevistaClient()
    cbsa = "35620"
    
    endpoints = [
        f"ConstructionByCBSA/{cbsa}",
        f"MarketTrends/{cbsa}",
        f"TransactionsByMetro/{cbsa}"
    ]
    
    print(f"Checking alternatives for CBSA {cbsa}...")
    
    for path in endpoints:
        print(f"--- {path} ---")
        try:
            resp = await client.make_request(path)
            # Check if valid data
            has_data = False
            count = 0
            
            if isinstance(resp, dict):
                if "value" in resp:
                    val = resp["value"]
                    if isinstance(val, list) and len(val) > 0:
                        has_data = True
                        count = len(val)
                    elif val is not None:
                         # Non-list value?
                         has_data = True
                         count = 1
            elif isinstance(resp, list) and len(resp) > 0:
                has_data = True
                count = len(resp)
            
            if has_data:
                print(f"SUCCESS: Found {count} items.")
            else:
                print("EMPTY: No data returned.")
                
        except Exception as e:
            print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(check_alternatives())

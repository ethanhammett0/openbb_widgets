import asyncio
from dotenv import load_dotenv
from revista_client import RevistaClient

async def probe_trend():
    load_dotenv()
    client = RevistaClient()
    
    # Needs a CBSA Code. 35620 (NYC), 12060 (Atlanta), or just 'Top50' if valid?
    # Let's use a numeric one found earlier or fetch MetroList
    metros = await client.make_request("MetroList")
    cbsa = "Top50"
    if isinstance(metros, dict) and "value" in metros:
        for m in metros["value"]:
            if str(m.get("cbsaCode", "")).isdigit():
                cbsa = m.get("cbsaCode")
                break
    
    print(f"Using CBSA: {cbsa}")
    
    candidates = [
        "Occupancy", "Rent", "Absorption", "Inventory", 
        "Construction", "Sales", "CapRate", "Price", 
        "All", "Quarterly", "Annual", "1", "0", 
        "trends", "market"
    ]
    
    candidates += [c.lower() for c in candidates]
    candidates += ["OCCUPANCY", "RENT"]

    print("Probing 'trend' parameter...")
    
    for trend in candidates:
        try:
            # /FundamentalsByCBSA/{CBSACode}/{trend}
            resp = await client.make_request(f"FundamentalsByCBSA/{cbsa}/{trend}")
            if isinstance(resp, dict) and "error" in resp:
                print(f"[{trend}] FAILED: {resp['error']}")
            else:
                print(f"[{trend}] SUCCESS!")
                # print(resp)
                break
        except Exception as e:
             # print(f"[{trend}] EXCEPTION: {e}")
             pass

if __name__ == "__main__":
    asyncio.run(probe_trend())

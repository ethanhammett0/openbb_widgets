import asyncio
import json
import os
from dotenv import load_dotenv
from revista_client import RevistaClient

def print_structure(data, name="Data"):
    print(f"\n--- Structure of {name} ---")
    if isinstance(data, list):
        print(f"Type: List[{len(data)} items]")
        if data:
            item = data[0]
            print("Sample Item (Full Data):")
            print(json.dumps(item, indent=2, default=str))
    elif isinstance(data, dict):
        print("Type: Dict (Full Data):")
        print(json.dumps(data, indent=2, default=str))
    else:
        print(f"Type: {type(data).__name__} = {data}")
    print("-" * 30)

def unwrap(data):
    if isinstance(data, dict) and "value" in data and isinstance(data["value"], list):
        return data["value"]
    return data

async def explore():
    load_dotenv()
    client = RevistaClient()
    
    # 1. Get Metro List
    print("\nFetching Metro List...")
    metros_resp = await client.make_request("MetroList")
    metros = unwrap(metros_resp)
    print_structure(metros, "MetroList (Unwrapped)")
    
    # Pick a CBSA Code
    cbsa_code = None
    if isinstance(metros, list) and metros:
        # Look for cbsA_CODE in the first item
        item = metros[0]
        # The output showed 'cbsA_CODE'
        if "cbsA_CODE" in item:
            cbsa_code = item["cbsA_CODE"]
            print(f"Selected CBSA Code: {cbsa_code}")
        elif "cbsaCode" in item:
            cbsa_code = item["cbsaCode"]
            print(f"Selected CBSA Code: {cbsa_code}")
    
    if cbsa_code and cbsa_code != "Top50": 
        # "Top50" might not be a valid code for Construction call? Docs say "Valid values are CBSA Codes... and 'Top100' and 'Top50'"
        # But ConstructionByCBSA might want a numeric code. Let's try it.
        # However, let's try to find a numeric one if possible?
        # Iterate to find a numeric string if possible
        for m in metros:
             code = m.get("cbsA_CODE", "")
             if code and code[0].isdigit():
                 cbsa_code = code
                 print(f"Switched to numeric CBSA Code: {cbsa_code}")
                 break

        # 2. Get Construction Data
        print(f"\nFetching Construction Data for CBSA {cbsa_code}...")
        construction_resp = await client.make_request(f"ConstructionByCBSA/{cbsa_code}")
        construction = unwrap(construction_resp)
        print_structure(construction, "Construction Data (Unwrapped)")
    
    # 3. Get Stakeholders
    print("\nFetching Stakeholders List...")
    stakeholders_resp = await client.make_request("StakeholdersList")
    stakeholders = unwrap(stakeholders_resp)
    # Limit output since this might be huge
    if isinstance(stakeholders, list):
        print_structure(stakeholders[:1] if stakeholders else [], "Stakeholders (First Item)")

if __name__ == "__main__":
    asyncio.run(explore())

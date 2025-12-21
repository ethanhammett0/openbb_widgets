import os
import asyncio
from dotenv import load_dotenv
from openbb_revista.interactive_earth import get_interactive_earth

load_dotenv()

from openbb_revista.search import search_revista

async def main():
    rev_key = os.getenv("REVISTA_API_KEY")
    goog_key = os.getenv("GOOGLE_MAPS_API_KEY")
    print(f"REVISTA_API_KEY: {rev_key[:5]}..." if rev_key else "REVISTA_API_KEY: None")
    
    # Search first
    query = "100 North Charles St, Baltimore, MD"
    print(f"Searching for: {query}")
    df = await search_revista(query)
    
    if df.empty or 'property_id' not in df.columns:
        print("Search failed or no results.")
        print(df)
        return

    prop_id = df.iloc[0]['property_id']
    print(f"Found ID: {prop_id}")
    
    res = await get_interactive_earth(prop_id)
    print("Result start:", res[:50])
    if "<!DOCTYPE html>" in res:
        print("Success: HTML found")
    else:
        print("Failure: HTML not found")

if __name__ == "__main__":
    asyncio.run(main())

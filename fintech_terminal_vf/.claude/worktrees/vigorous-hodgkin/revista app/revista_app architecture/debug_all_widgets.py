import asyncio
import os
import pandas as pd
from dotenv import load_dotenv
from openbb_revista.search import search_revista
from openbb_revista.scorecard import get_property_metrics
from openbb_revista.interactive_earth import get_interactive_earth

# Load environment variables
load_dotenv()

async def debug_widgets():
    print("--- DEBUGGING WIDGETS ---")
    
    # 1. Search Debug
    print("\n[1] SEARCH WIDGET")
    try:
        query = "361419"
        print(f"Searching for: {query}")
        df = await search_revista(query)
        print(f"Result Type: {type(df)}")
        if isinstance(df, pd.DataFrame):
            print(f"DataFrame Shape: {df.shape}")
            print(f"Columns: {df.columns.tolist()}")
            if not df.empty:
                print(f"First Row:\n{df.iloc[0].to_dict()}")
            else:
                print("DataFrame is empty")
        else:
            print(f"Unexpected result: {df}")
    except Exception as e:
        print(f"SEARCH ERROR: {e}")

    # 2. Scorecard Debug
    print("\n[2] SCORECARD WIDGET")
    try:
        prop_id = 361419
        print(f"Fetching scorecard for: {prop_id}")
        markdown = await get_property_metrics(prop_id, "Physical")
        print(f"Result Type: {type(markdown)}")
        print(f"Content Preview:\n{markdown[:200]}...")
    except Exception as e:
        print(f"SCORECARD ERROR: {e}")

    # 3. Interactive Earth Debug
    print("\n[3] INTERACTIVE EARTH WIDGET")
    try:
        prop_id = 361419
        print(f"Fetching map for: {prop_id}")
        html = await get_interactive_earth(prop_id)
        print(f"Result Type: {type(html)}")
        print(f"Content Preview:\n{html[:200]}...")
        
        if "google.maps.Map" in html:
            print("SUCCESS: Map initialization code found.")
        else:
            print("FAILURE: Map initialization code NOT found.")
            
        if "%s" in html:
             print("FAILURE: Found unformatted %s placeholders!")
    except Exception as e:
        print(f"EARTH ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(debug_widgets())

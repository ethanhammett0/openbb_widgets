import asyncio
import os
import sys
import pandas as pd
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from openbb_revista.search import search_revista
from openbb_revista.scorecard import get_property_metrics
from openbb_revista.interactive_earth import get_interactive_earth
from openbb_revista.market_trends import get_market_trends
from openbb_revista.market_balance import get_supply_demand_gauge
from openbb_revista.activity_proxy import get_activity_proxy
from openbb_revista.benchmarker import get_benchmarker
from openbb_revista.stakeholders import get_stakeholders

async def verify_all(prop_id, search_query):
    print(f"--- Verifying All Widgets (ID: {prop_id}, Query: '{search_query}') ---")
    
    # 1. Search (Omni Search)
    print("\n1. Testing Search...")
    try:
        df = await search_revista(search_query)
        if not df.empty and 'property_id' in df.columns:
            print(f"✅ Search: Success ({len(df)} results)")
            print(f"   First: {df.iloc[0]['propertyName']} - ID: {df.iloc[0]['property_id']}")
        else:
            print(f"❌ Search: No results or error. Columns: {df.columns}")
    except Exception as e:
        print(f"❌ Search Failed: {e}")

    # 2. Scorecard
    print("\n2. Testing Scorecard...")
    try:
        res = await get_property_metrics(prop_id)
        if "##" in res:
            print("✅ Scorecard: Success")
        else:
            print(f"❌ Scorecard: Unexpected output: {res[:50]}...")
    except Exception as e:
        print(f"❌ Scorecard Failed: {e}")

    # 3. Interactive Earth
    print("\n3. Testing Interactive Earth...")
    try:
        res = await get_interactive_earth(prop_id)
        if "<!DOCTYPE html>" in res:
            print("✅ Interactive Earth: Success")
        else:
            print(f"❌ Interactive Earth: Failed: {res[:50]}...")
    except Exception as e:
        print(f"❌ Interactive Earth Failed: {e}")

    # 4. Market Trends
    print("\n4. Testing Market Trends...")
    try:
        res = await get_market_trends(prop_id)
        if res:
            print("✅ Market Trends: Success (Figure generated)")
        else:
            print("❌ Market Trends: Returned None")
    except Exception as e:
        print(f"❌ Market Trends Failed: {e}")

    # 5. Market Balance
    print("\n5. Testing Market Balance...")
    try:
        res = await get_supply_demand_gauge(prop_id)
        if res:
            print("✅ Market Balance: Success (Figure generated)")
        else:
            print("❌ Market Balance: Returned None")
    except Exception as e:
        print(f"❌ Market Balance Failed: {e}")

    # 6. Activity Proxy
    print("\n6. Testing Activity Proxy...")
    try:
        res = await get_activity_proxy(prop_id)
        if "Clinical Activity Engine" in res:
            print("✅ Activity Proxy: Success")
        else:
            print(f"❌ Activity Proxy: Unexpected output: {res[:50]}...")
    except Exception as e:
        print(f"❌ Activity Proxy Failed: {e}")

    # 7. Benchmarker
    print("\n7. Testing Benchmarker...")
    try:
        res = await get_benchmarker(prop_id)
        if res:
            print("✅ Benchmarker: Success (Figure generated)")
        else:
            print("❌ Benchmarker: Returned None")
    except Exception as e:
        print(f"❌ Benchmarker Failed: {e}")

    # 8. Stakeholders
    print("\n8. Testing Stakeholders...")
    try:
        df = await get_stakeholders(prop_id)
        if not df.empty:
            print(f"✅ Stakeholders: Success ({len(df)} records)")
        else:
            print("⚠️ Stakeholders: Empty (might be valid if none exist)")
    except Exception as e:
        print(f"❌ Stakeholders Failed: {e}")

if __name__ == "__main__":
    # Using "City MD" as query and 570571 as ID
    asyncio.run(verify_all(570571, "City MD"))

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from openbb_revista.scorecard import get_property_metrics
from openbb_revista.market_trends import get_market_trends
from openbb_revista.interactive_earth import get_interactive_earth

async def verify_property(prop_id):
    print(f"--- Verifying Property ID: {prop_id} ---")
    
    # Check Keys
    print(f"Revista Key Present: {bool(os.getenv('REVISTA_API_KEY'))}")
    print(f"Google Key Present: {bool(os.getenv('GOOGLE_MAPS_API_KEY'))}")

    # 1. Scorecard
    print("\n1. Testing Scorecard...")
    try:
        scorecard = await get_property_metrics(prop_id)
        print("Scorecard Result (First 100 chars):")
        print(scorecard[:100].replace('\n', ' '))
    except Exception as e:
        print(f"Scorecard Failed: {e}")

    # 2. Market Trends
    print("\n2. Testing Market Trends...")
    try:
        trends = await get_market_trends(prop_id)
        if trends:
            print("Market Trends: Success (Figure generated)")
        else:
            print("Market Trends: Returned None (No data or API error)")
    except Exception as e:
        print(f"Market Trends Failed: {e}")

    # 3. Interactive Earth
    print("\n3. Testing Interactive Earth...")
    try:
        earth = await get_interactive_earth(prop_id)
        if "<!DOCTYPE html>" in earth:
            print("Interactive Earth: Success (HTML generated)")
        else:
            print(f"Interactive Earth: Failed or Error Message: {earth[:50]}...")
    except Exception as e:
        print(f"Interactive Earth Failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_property(570571))

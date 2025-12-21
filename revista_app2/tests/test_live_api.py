import unittest
import os
import sys
import pandas as pd
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import internal functions directly for testing logic, 
# or import the router functions if we want to test the wrapper.
# Importing internal functions is safer for unit testing logic independent of the Router wrapper.
from openbb_revista.search import search_revista
from openbb_revista.scorecard import get_property_metrics
from openbb_revista.interactive_earth import get_interactive_earth
from openbb_revista.market_trends import get_market_trends
from openbb_revista.market_balance import get_supply_demand_gauge
from openbb_revista.activity_proxy import get_activity_proxy
from openbb_revista.benchmarker import get_benchmarker
from openbb_revista.stakeholders import get_stakeholders

TEST_ADDRESS = "100 North Charles St, Baltimore, MD" 

class TestRevistaLiveAsync(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.api_key = os.getenv("REVISTA_API_KEY")
        cls.google_key = os.getenv("GOOGLE_MAPS_API_KEY")
        cls.test_prop_id = 146507 

    async def asyncSetUp(self):
        if not self.api_key:
            self.skipTest("REVISTA_API_KEY not found in environment variables.")

    async def test_01_search(self):
        print(f"\nTesting Search with query: '{TEST_ADDRESS}'")
        df = await search_revista(TEST_ADDRESS)
        
        self.assertIsInstance(df, pd.DataFrame)
        if not df.empty and 'property_id' in df.columns:
            # Update class property ID for subsequent tests
            TestRevistaLiveAsync.test_prop_id = df.iloc[0]['property_id']
            print(f"Found Property ID: {TestRevistaLiveAsync.test_prop_id}")

    async def test_02_scorecard(self):
        print(f"\nTesting Scorecard for ID: {self.test_prop_id}")
        res = await get_property_metrics(self.test_prop_id)
        self.assertIsInstance(res, str)
        self.assertIn("##", res)

    async def test_03_market_trends(self):
        print(f"\nTesting Market Trends for ID: {self.test_prop_id}")
        fig = await get_market_trends(self.test_prop_id)
        # Note: API might return None if no data
        if fig:
            # It returns a plotly Figure object
            self.assertTrue(hasattr(fig, 'to_dict') or hasattr(fig, 'data'))

    async def test_04_market_balance(self):
        print(f"\nTesting Market Balance for ID: {self.test_prop_id}")
        fig = await get_supply_demand_gauge(self.test_prop_id)
        if fig:
            self.assertTrue(hasattr(fig, 'to_dict') or hasattr(fig, 'data'))

    async def test_05_activity_proxy(self):
        print(f"\nTesting Activity Proxy for ID: {self.test_prop_id}")
        res = await get_activity_proxy(self.test_prop_id)
        self.assertIsInstance(res, str)

    async def test_06_benchmarker(self):
        print(f"\nTesting Benchmarker for ID: {self.test_prop_id}")
        fig = await get_benchmarker(self.test_prop_id)
        if fig:
            self.assertTrue(hasattr(fig, 'to_dict') or hasattr(fig, 'data'))

    async def test_07_stakeholders(self):
        print(f"\nTesting Stakeholders for ID: {self.test_prop_id}")
        df = await get_stakeholders(self.test_prop_id)
        self.assertIsInstance(df, pd.DataFrame)

    async def test_08_interactive_earth(self):
        if not self.google_key:
            print("Skipping Earth test (no Google Key)")
            return
        print(f"\nTesting Interactive Earth for ID: {self.test_prop_id}")
        res = await get_interactive_earth(self.test_prop_id)
        self.assertIsInstance(res, str)
        self.assertIn("<!DOCTYPE html>", res)

if __name__ == '__main__':
    unittest.main()

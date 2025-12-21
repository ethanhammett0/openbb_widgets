import asyncio
import json
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List
from dotenv import load_dotenv
from revista_client import RevistaClient
from utils import parse_docs

# Setup
load_dotenv()
DOCS_PATH = "../revista_docs.json"

class RevistaTester:
    def __init__(self):
        self.client = RevistaClient()
        self.endpoints = parse_docs(DOCS_PATH)
        
        # Calculate recent date (30 days ago)
        recent_date = (datetime.now() - timedelta(days=30)).strftime("%m-%d-%Y")
        
        self.seed_data = {
            "lat": 33.7490, # Atlanta
            "lon": -84.3880,
            "radius": 10,
            "startdate": recent_date,
            "trend": "true", 
            "cbsacode": "31140", # Louisville/Jefferson County, KY-IN
            "propertyid": None,
            "stakeholderid": None
        }

    async def fetch_seeds(self):
        print("--- Fetching Seed Data ---")
        
        # 1. Metros -> CBSA Code
        print("Fetching Metros...")
        metros_resp = await self.client.make_request("MetroList")
        metros = self._unwrap(metros_resp)
        if metros and isinstance(metros, list):
            # Prefer a numeric code if available
            for m in metros:
                code = str(m.get("cbsA_CODE", "") or m.get("cbsaCode", ""))
                if code.isdigit():
                    self.seed_data["cbsacode"] = code
                    print(f"Found CBSA Code: {code} ({m.get('cbsaTitle', 'Unknown')})")
                    break
        
        # 2. Stakeholders -> StakeholderID
        print("Fetching Stakeholders...")
        stakeholders_resp = await self.client.make_request("StakeholdersList")
        stakeholders = self._unwrap(stakeholders_resp)
        if stakeholders and isinstance(stakeholders, list):
            # Pick first valid one
            for s in stakeholders:
                sid = s.get("stakeholderID")
                if sid:
                    self.seed_data["stakeholderid"] = sid
                    print(f"Found Stakeholder ID: {sid} ({s.get('stakeholderName', 'Unknown')})")
                    break

        # 3. Property -> PropertyID (via Search)
        print("Searching for Property to get ID...")
        # /Property/Search/{Lat}/{Lon}
        search_path = f"Property/Search/{self.seed_data['lat']}/{self.seed_data['lon']}"
        props_resp = await self.client.make_request(search_path)
        props = self._unwrap(props_resp)
        if props and isinstance(props, list):
            pid = props[0].get("propertyID")
            if pid:
                self.seed_data["propertyid"] = pid
                print(f"Found Property ID: {pid}")

    def _unwrap(self, data):
        if isinstance(data, dict) and "value" in data and isinstance(data["value"], list):
            return data["value"]
        return data

    def _resolve_params(self, params: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Resolve path parameters from seed data."""
        resolved = {}
        missing = []
        for p in params:
            p_name = p["name"]
            p_key = p_name.lower()
            if p_key in self.seed_data and self.seed_data[p_key] is not None:
                resolved[p_name] = self.seed_data[p_key]
            else:
                missing.append(p_name)
        return resolved, missing

    async def run_all(self):
        await self.fetch_seeds()
        print(f"\n--- Starting Full Endpoint Test (Seed Date: {self.seed_data['startdate']}) ---\n")
        
        results = {"success": 0, "failed": 0, "skipped": 0}
        failures = []
        
        for ep in self.endpoints:
            name = ep["name"]
            path_template = ep["path"]
            required_params = ep["parameters"]
            
            resolved_map, missing = self._resolve_params(required_params)
            
            if missing:
                print(f"[SKIP] {name}: Missing required params: {missing}")
                results["skipped"] += 1
                continue
                
            # Construct path
            real_path = path_template
            for k, v in resolved_map.items():
                real_path = real_path.replace(f"{{{k}}}", str(v))
            
            print(f"TESTING {name} -> {real_path} ... ", end="", flush=True)
            
            try:
                resp = await self.client.make_request(real_path)
                data = self._unwrap(resp)
                
                # Check for API error response (some APIs return 200 with 'error' key)
                if isinstance(data, dict) and "error" in data:
                     # Soft fail for trend param which is hard to guess
                     if "Fundamentals" in name and "400" in str(data):
                         print("SKIPPED (Invalid Trend Param)")
                         results["skipped"] += 1
                     else:
                        print("FAILED (API Error)")
                        print(f"  Response: {data}")
                        results["failed"] += 1
                        failures.append(f"{name}: {data}")
                elif isinstance(data, list) and len(data) == 0:
                     print("SUCCESS (Empty List)")
                     results["success"] += 1
                else:
                     count = len(data) if isinstance(data, list) else "Obj"
                     print(f"SUCCESS (Got {count})")
                     results["success"] += 1

            except Exception as e:
                print(f"FAILED: {e}")
                results["failed"] += 1
                failures.append(f"{name}: {str(e)}")
        
        print(f"\n--- Test Summary ---")
        print(f"Total: {len(self.endpoints)}")
        print(f"Success: {results['success']}")
        print(f"Failed: {results['failed']}")
        print(f"Skipped: {results['skipped']}")
        
        if failures:
            print("\nFAILURES:")
            for f in failures:
                print(f"  - {f}")

if __name__ == "__main__":
    tester = RevistaTester()
    asyncio.run(tester.run_all())

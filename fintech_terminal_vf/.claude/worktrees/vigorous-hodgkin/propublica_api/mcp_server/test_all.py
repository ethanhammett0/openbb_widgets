import asyncio
from propublica_client import ProPublicaClient
from utils import parse_docs

DOCS_PATH = "propublica_docs.json"

class ProPublicaTester:
    def __init__(self):
        self.client = ProPublicaClient()
        self.endpoints = parse_docs(DOCS_PATH)

    async def run_all(self):
        print(f"\n--- Starting ProPublica API Test ---\n")
        
        results = {"success": 0, "failed": 0, "skipped": 0}
        
        # Test 1: Search Endpoint (Keyword)
        print("TESTING /search.json?q=propublica ... ", end="", flush=True)
        try:
            resp = await self.client.make_request("search.json", params={"q": "propublica"})
            if "organizations" in resp:
                count = len(resp["organizations"])
                print(f"SUCCESS (Found {count} orgs)")
                results["success"] += 1
                
                # Grab a real EIN for next test if available
                if count > 0:
                    self.ein = resp["organizations"][0]["ein"]
            else:
                print(f"FAILED (Unexpected format: {resp.keys()})")
                results["failed"] += 1
        except Exception as e:
            print(f"FAILED: {e}")
            results["failed"] += 1

        # Test 2: Search Endpoint (State)
        print("TESTING /search.json?state[id]=NY ... ", end="", flush=True)
        try:
            resp = await self.client.make_request("search.json", params={"state[id]": "NY"})
            if "organizations" in resp:
                count = len(resp["organizations"])
                print(f"SUCCESS (Found {count} orgs)")
                results["success"] += 1
            else:
                 print(f"FAILED (Unexpected format)")
                 results["failed"] += 1
        except Exception as e:
            print(f"FAILED: {e}")
            results["failed"] += 1

        # Test 3: Organization Detail Endpoint
        if hasattr(self, 'ein'):
            print(f"TESTING /organizations/{self.ein}.json ... ", end="", flush=True)
            try:
                resp = await self.client.make_request(f"organizations/{self.ein}.json")
                if "organization" in resp:
                     print(f"SUCCESS (Retrieved {resp['organization']['name']})")
                     results["success"] += 1
                else:
                     print(f"FAILED (Unexpected format)")
                     results["failed"] += 1
            except Exception as e:
                print(f"FAILED: {e}")
                results["failed"] += 1
        else:
             print("TESTING /organizations/{ein}.json ... SKIPPED (No EIN found)")
             results["skipped"] += 1

        print(f"\n--- Test Summary ---")
        print(f"Success: {results['success']}")
        print(f"Failed: {results['failed']}")
        print(f"Skipped: {results['skipped']}")

if __name__ == "__main__":
    tester = ProPublicaTester()
    asyncio.run(tester.run_all())

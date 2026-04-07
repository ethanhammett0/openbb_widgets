from ddgs import DDGS
import json

try:
    print("Attempting search...")
    results = DDGS().text("OpenBB", max_results=5)
    print("Search finished.")
    print(json.dumps(list(results), indent=2))
except Exception as e:
    print(f"Error: {e}")

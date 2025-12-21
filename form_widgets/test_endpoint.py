import requests
import sys

try:
    print("Testing http://localhost:7779/apps.json...")
    response = requests.get("http://localhost:7779/apps.json", timeout=5)
    print(f"Status Code: {response.status_code}")
    print("Response Content:")
    print(response.text[:500]) # Print first 500 chars
    
    if response.status_code == 200:
        print("\nSUCCESS: apps.json is accessible.")
    else:
        print("\nFAILURE: Server returned an error.")
        
except requests.exceptions.ConnectionError:
    print("\nFAILURE: Could not connect to server. Is run.bat running?")
except Exception as e:
    print(f"\nFAILURE: {e}")

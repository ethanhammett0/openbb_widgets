import requests
import json
import time
import subprocess
import sys
import os

def test_endpoint():
    url = "http://localhost:8002/agent/scrape_context"
    payload = {"prompt": "Latest regulatory changes for private credit in EU", "limit": 3}
    
    print(f"Sending request to {url} with payload: {payload}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print("\nResponse Status Code:", response.status_code)
        print("\nResponse Body:")
        print(json.dumps(data, indent=2))
        
        # Basic validation
        if "content" in data and "data_format" in data:
            print("\nSUCCESS: Response structure is valid.")
            if data["data_format"]["parse_as"] == "table":
                print("SUCCESS: data_format.parse_as is 'table'.")
            else:
                print(f"FAILURE: data_format.parse_as is '{data['data_format']['parse_as']}', expected 'table'.")
        else:
            print("\nFAILURE: Response missing 'content' or 'data_format'.")
            
    except requests.exceptions.ConnectionError:
        print("\nFAILURE: Could not connect to the server. Is it running?")
    except Exception as e:
        print(f"\nFAILURE: An error occurred: {e}")

if __name__ == "__main__":
    # Start the server in a separate process
    server_process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    print("Waiting for server to start...")
    time.sleep(5) # Give it some time to start
    
    try:
        test_endpoint()
    finally:
        print("\nStopping server...")
        server_process.terminate()
        stdout, stderr = server_process.communicate()
        if stdout:
            print(f"\nServer Output:\n{stdout.decode()}")
        if stderr:
            print(f"\nServer Errors:\n{stderr.decode()}")

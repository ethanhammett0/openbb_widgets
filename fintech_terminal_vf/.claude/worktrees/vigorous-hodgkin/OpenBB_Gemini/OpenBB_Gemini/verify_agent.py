import requests
import time
import sys

def verify():
    base_url = "http://localhost:8000"
    print(f"Checking {base_url}...")
    
    # Retry loop for server startup
    for i in range(10):
        try:
            # Check health
            resp = requests.get(f"{base_url}/")
            if resp.status_code == 200:
                print("✅ Health check passed!")
                break
        except requests.exceptions.ConnectionError:
            print(f"Waiting for server... ({i+1}/10)")
            time.sleep(2)
    else:
        print("❌ Server failed to start.")
        sys.exit(1)

    # Check agents.json
    try:
        resp = requests.get(f"{base_url}/agents.json")
        if resp.status_code == 200:
            data = resp.json()
            if "gemini-agent" in data:
                print("✅ Agent discovery verified!")
                print("Agent config:", data["gemini-agent"])
            else:
                print("❌ Agent not found in agents.json")
                sys.exit(1)
        else:
            print(f"❌ agents.json check failed: {resp.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Verification error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify()

import requests
import json

def check_endpoint(url):
    print(f"Checking {url}...")
    try:
        resp = requests.get(url)
        print(f"Status: {resp.status_code}")
        try:
            data = resp.json()
            print("JSON Content (first 100 chars):")
            print(str(data)[:100])
        except:
            print("Response is not JSON")
            print(resp.text[:100])
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    check_endpoint("http://localhost:8000/")
    check_endpoint("http://localhost:8000/widgets.json")
    check_endpoint("http://localhost:8000/health")

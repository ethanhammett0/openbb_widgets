import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
print(f"Testing API Key: {api_key[:5]}... (Length: {len(api_key) if api_key else 0})")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("✅ Success! Key is valid. Available models:")
        models = response.json().get('models', [])
        for m in models:
            if 'gemini' in m['name']:
                print(f" - {m['name']}")
    else:
        print("❌ API Key Failed.")
        print(response.text)
except Exception as e:
    print(f"Error: {e}")

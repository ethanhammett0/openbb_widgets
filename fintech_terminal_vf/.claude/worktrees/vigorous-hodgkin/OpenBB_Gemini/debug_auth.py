import os
from dotenv import load_dotenv

print("Loading .env...")
loaded = load_dotenv()
print(f"load_dotenv returned: {loaded}")

google_key = os.getenv("GOOGLE_API_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")

def mask_key(k):
    if not k: return "None"
    if len(k) < 8: return "Too Short!"
    return f"{k[:4]}...{k[-4:]} (Length: {len(k)})"

print(f"GOOGLE_API_KEY: {mask_key(google_key)}")
print(f"GEMINI_API_KEY: {mask_key(gemini_key)}")

if os.path.exists(".env"):
    print(".env file exists")
else:
    print(".env file NOT found")

if os.path.exists(".env.txt"):
    print(".env.txt file exists (Did you save it with .txt extension?)")

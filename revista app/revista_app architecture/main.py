import os
import sys
import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the OpenBB router and core logic for startup check
from openbb_revista.router import router as revista_router
from openbb_revista.search import search_revista

# Create FastAPI app
app = FastAPI(title="OpenBB Revista Workspace")

# CORS Setup
origins = [
    "https://pro.openbb.co",
    "https://pro.openbb.dev",
    "http://localhost:1420",
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Widgets Config
WIDGETS_FILE = Path("workspace_config/widgets.json")

@app.get("/")
def read_root():
    return {"Info": "Revista OpenBB Backend Running"}

@app.get("/widgets.json")
def get_widgets():
    if WIDGETS_FILE.exists():
        with open(WIDGETS_FILE, "r") as f:
            return json.load(f)
    return {"error": "widgets.json not found"}

@app.get("/apps.json")
def get_apps():
    apps_file = Path("workspace_config/apps.json")
    if apps_file.exists():
        with open(apps_file, "r") as f:
            return json.load(f)
    return []

@app.get("/health")
async def health_check():
    """Diagnostic endpoint to check API keys and connectivity."""
    import aiohttp
    from openbb_revista.constants import REVISTA_BASE_URL
    
    status = {
        "status": "ok",
        "revista_api_key": False,
        "google_maps_api_key": False,
        "revista_connection": False,
        "google_connection": False,
        "errors": []
    }

    # Check Keys
    rev_key = os.getenv("REVISTA_API_KEY")
    goog_key = os.getenv("GOOGLE_MAPS_API_KEY")

    if rev_key: status["revista_api_key"] = True
    else: status["errors"].append("REVISTA_API_KEY missing")

    if goog_key: status["google_maps_api_key"] = True
    else: status["errors"].append("GOOGLE_MAPS_API_KEY missing")

    # Check Connectivity
    async with aiohttp.ClientSession() as session:
        # Revista Ping (MetroList is a lightweight endpoint)
        if rev_key:
            try:
                async with session.get(f"{REVISTA_BASE_URL}/MetroList?ApiKey={rev_key}") as resp:
                    if resp.status == 200:
                        status["revista_connection"] = True
                    else:
                        status["errors"].append(f"Revista API Error: {resp.status}")
            except Exception as e:
                status["errors"].append(f"Revista Connection Failed: {str(e)}")
        
        # Google Maps Ping (Static Map)
        if goog_key:
            try:
                url = f"https://maps.googleapis.com/maps/api/staticmap?center=40.714728,-73.998672&zoom=12&size=400x400&key={goog_key}"
                async with session.get(url) as resp:
                    if resp.status == 200:
                        status["google_connection"] = True
                    else:
                        status["errors"].append(f"Google Maps API Error: {resp.status}")
            except Exception as e:
                status["errors"].append(f"Google Connection Failed: {str(e)}")

    if status["errors"]:
        status["status"] = "error"

    return status

# Include the OpenBB router
# OpenBB Router needs to be included in a specific way if using openbb-core as the main app,
# but here we are mounting it to a standalone FastAPI app.
# The OpenBB Router object has an .api_router property which is an APIRouter.
app.include_router(revista_router.api_router)

# Startup verification block
@app.on_event("startup")
async def startup_event():
    print("Starting OpenBB Revista App...")
    
    API_KEY = os.getenv("REVISTA_API_KEY")
    GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

    if not API_KEY:
        print("WARNING: REVISTA_API_KEY environment variable not set.")
    else:
        print("REVISTA_API_KEY found.")

    if not GOOGLE_KEY:
        print("WARNING: GOOGLE_MAPS_API_KEY environment variable not set.")
    else:
        print("GOOGLE_MAPS_API_KEY found.")

    if API_KEY:
        print("\n--- Running Startup Self-Test ---")
        try:
            # Smoke test: Search for a known property ID or generic term
            test_query = "City MD"
            print(f"Executing live search for '{test_query}'...")
            df = await search_revista(test_query)
            
            if not df.empty and 'property_id' in df.columns:
                print(f"✅ Success! Found {len(df)} property record(s).")
                print(f"   First Result: {df.iloc[0]['propertyName']} ({df.iloc[0]['address']})")
            elif 'Error' in df.columns:
                print(f"❌ API returned error: {df.iloc[0]['Error']}")
            else:
                print("⚠️ Search returned no results.")
        except Exception as e:
            print(f"❌ Startup test failed with exception: {e}")
        print("---------------------------------\n")

    print("Ready to serve requests.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

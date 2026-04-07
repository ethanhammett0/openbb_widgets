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
            test_query = "146507"
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
    uvicorn.run(app, host="0.0.0.0", port=8000)

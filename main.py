import os
import json
import asyncio
from pathlib import Path
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from openbb_revista.router import kpis, map as map_router, summary, table, property_overview, property_transactions, property_owner
from openbb_revista.models import KPIModel, PropertyRecord, PropertyOverviewModel, TransactionModel, OwnerModel

# Initialize FastAPI
app = FastAPI(
    title="Revista Real Estate API",
    description="Backend for Revista OpenBB widgets",
    version="0.1.0"
)

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
with open(WIDGETS_FILE, "r") as f:
    WIDGETS_CONFIG = json.load(f)

@app.get("/")
def read_root():
    return {"Info": "Revista OpenBB Backend Running"}

@app.get("/widgets.json")
def get_widgets():
    return WIDGETS_CONFIG

@app.get("/apps.json")
def get_apps():
    return JSONResponse(
        content=json.load(open("apps.json"))
    )

# Wrapper endpoints to expose router logic via FastAPI

@app.get("/revista/kpis")
async def get_kpis(cbsa_code: str = "34980", property_type: str = "MOB"):
    result = await kpis(cbsa_code=cbsa_code, property_type=property_type)
    return result.results

@app.get("/revista/map")
async def get_map(cbsa_code: str = "34980"):
    result = await map_router(cbsa_code=cbsa_code)
    if isinstance(result.results, str):
        return json.loads(result.results)
    return result.results

@app.get("/revista/summary")
async def get_summary(cbsa_code: str = "34980"):
    result = await summary(cbsa_code=cbsa_code)
    return result.results

@app.get("/revista/table")
async def get_table(cbsa_code: str = "34980"):
    result = await table(cbsa_code=cbsa_code)
    return result.results

@app.get("/revista/property_overview")
async def get_property_overview(address: str = "1000 Physicians Way, Franklin, TN"):
    result = await property_overview(address=address)
    # result.results is now a Markdown string
    return result.results

@app.get("/revista/property_transactions")
async def get_property_transactions(address: str = "1000 Physicians Way, Franklin, TN"):
    result = await property_transactions(address=address)
    return result.results

@app.get("/revista/property_owner")
async def get_property_owner(address: str = "1000 Physicians Way, Franklin, TN"):
    result = await property_owner(address=address)
    # result.results is now a Markdown string
    return result.results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

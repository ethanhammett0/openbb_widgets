import os
import json
import asyncio
from pathlib import Path
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from openbb_revista.router import kpis, map as map_router, summary, table
from openbb_revista.models import KPIModel, PropertyRecord

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
# We load the static widgets.json we created earlier, but modify the endpoint URLs
# to match the hosted paths (which are relative to this server)
WIDGETS_FILE = Path("workspace_config/widgets.json")
with open(WIDGETS_FILE, "r") as f:
    WIDGETS_CONFIG = json.load(f)

# Helper to strip "revista/" prefix from endpoints in widgets.json if needed,
# or map them to our FastAPI routes.
# In widgets.json we defined endpoints like "revista/kpis".
# FastAPI will serve them at /revista/kpis naturally if we include the router,
# OR we can define them explicitly here.
# Since we have logic in router.py that uses OpenBB Router, we can try to adapt it
# or just wrap the functions.

@app.get("/")
def read_root():
    return {"Info": "Revista OpenBB Backend Running"}

@app.get("/widgets.json")
def get_widgets():
    # Return the loaded widgets config
    # Ensure the structure matches what OpenBB expects.
    # The file workspace_config/widgets.json is a dict of widget_id -> config.
    return WIDGETS_CONFIG

@app.get("/apps.json")
def get_apps():
    return JSONResponse(
        content=json.load(open("apps.json"))
    )

# Wrapper endpoints to expose router logic via FastAPI
# Note: The original router functions are async and return OBBject.
# We need to unwrap OBBject and return JSONResponse or dict.

@app.get("/revista/kpis")
async def get_kpis(cbsa_code: str = "34980", property_type: str = "MOB"):
    result = await kpis(cbsa_code=cbsa_code, property_type=property_type)
    # result is OBBject. results is List[KPIModel].
    # Pydantic models can be returned directly in FastAPI, but OBBject wrapper might need handling.
    return result.results

@app.get("/revista/map")
async def get_map(cbsa_code: str = "34980"):
    result = await map_router(cbsa_code=cbsa_code)
    # result.results is a JSON string (Plotly).
    # We should parse it back to dict so FastAPI sends it as JSON,
    # OR return it as raw string if widget expects it (but usually widget expects JSON object).
    # The router logic returned `fig.to_json()`.
    return json.loads(result.results)

@app.get("/revista/summary")
async def get_summary(cbsa_code: str = "34980"):
    result = await summary(cbsa_code=cbsa_code)
    # result.results is a Markdown string.
    # The widget type is "markdown", so it expects a string or {content: str}?
    # Usually markdown widgets expect just the text or a wrapper.
    # Let's check the reference: It returns HTMLResponse for HTML widgets.
    # For markdown, simple string or JSON with a specific key is common.
    # OpenBB standard markdown widget often expects raw text or a specific field.
    # We will return it as a plain string response or wrapped in JSON.
    # Returning just the string usually works for text/markdown endpoints in some contexts,
    # but standard JSON API practice is `{"data": ...}`.
    # However, OpenBB widget config might specify `dataKey` if it's nested.
    # Let's return the string directly for now, or strictly follow the return type.
    return result.results

@app.get("/revista/table")
async def get_table(cbsa_code: str = "34980"):
    result = await table(cbsa_code=cbsa_code)
    return result.results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

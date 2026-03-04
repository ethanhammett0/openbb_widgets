"""
Structured Finance App — Unified Backend (port 7800)
Combines: Markets Monitor | Healthcare Portfolio | Salesforce Forms | SharePoint Docs
"""
import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.markets    import router as markets_router
from routes.portfolio  import router as portfolio_router
from routes.forms      import router as forms_router
from routes.sharepoint import router as sharepoint_router

BASE_DIR = Path(__file__).parent.resolve()

app = FastAPI(title="Structured Finance App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pro.openbb.co",
        "https://pro.openbb.dev",
        "https://excel.openbb.co",
        "http://localhost:1420",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core discovery endpoints ──────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Structured Finance App — Unified Backend", "port": 7800}

@app.get("/widgets.json")
def get_widgets():
    with open(BASE_DIR / "widgets.json") as f:
        return json.load(f)

@app.get("/apps.json")
def get_apps():
    return JSONResponse(content=json.load(open(BASE_DIR / "apps.json")))

# ── Mount sub-routers (no prefix — all endpoints live at root level) ──────────
app.include_router(markets_router)
app.include_router(portfolio_router)
app.include_router(forms_router)
app.include_router(sharepoint_router)

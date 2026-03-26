"""
Fintech Equity Research Terminal — Main FastAPI Application
Pre-loads all data at startup, serves from memory cache.
"""
import json
import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: preload data in background thread so server starts immediately."""
    import asyncio
    from preloader import load_all_data, background_refresh

    # Start data load in a background thread (non-blocking)
    thread = threading.Thread(target=load_all_data, daemon=True)
    thread.start()
    logger.info("Data pre-load started in background thread")

    # Start periodic refresh task
    task = asyncio.create_task(background_refresh(interval_minutes=15))

    yield

    task.cancel()


app = FastAPI(title="Fintech Research Terminal", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pro.openbb.co",
        "https://pro.openbb.dev",
        "http://localhost:1420",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Import tab routers ──
from routes_pulse import router as pulse_router
from routes_factors import router as factors_router
from routes_attribution import router as attribution_router
from routes_performance import router as performance_router
from routes_pairs import router as pairs_router
from routes_corporate import router as corporate_router
from routes_util import router as util_router

app.include_router(pulse_router)
app.include_router(factors_router)
app.include_router(attribution_router)
app.include_router(performance_router)
app.include_router(pairs_router)
app.include_router(corporate_router)
app.include_router(util_router)


@app.get("/")
def root():
    from preloader import cache
    status = "loading" if cache.is_loading else "ready"
    tickers_loaded = len(cache.daily_returns)
    factor_shape = cache.factor_matrix.shape if cache.factor_matrix is not None and not cache.factor_matrix.empty else "not built"
    return {
        "info": "Fintech Equity Research Terminal API",
        "data_status": status,
        "tickers_cached": tickers_loaded,
        "factor_matrix": str(factor_shape),
        "last_refresh": str(cache.last_refresh) if cache.last_refresh else "never",
    }


@app.get("/widgets.json")
def get_widgets():
    with open(BASE_DIR / "widgets.json", "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/apps.json")
def get_apps():
    with open(BASE_DIR / "apps.json", "r", encoding="utf-8") as f:
        return json.load(f)

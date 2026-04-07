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

# Support both ODP-injected env vars and legacy .env file (fallback).
# Use explicit path so .env is found regardless of ODP's working directory.
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")
except ImportError:
    pass
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent


def _log_key_resolution():
    """Log where each API key was resolved from at startup — helps diagnose ODP injection."""
    import json, os
    from pathlib import Path as _Path

    sources = {}

    # Check env vars
    poly_env = os.getenv("POLYGON_API_KEY") or os.getenv("polygon_api_key") or os.getenv("massive_api_key")
    cg_env = os.getenv("COINGECKO_API_KEY") or os.getenv("coingecko_api_key")

    # Check ODP user_settings.json
    settings_path = _Path.home() / ".openbb_platform" / "user_settings.json"
    odp_creds = {}
    if settings_path.exists():
        try:
            odp_creds = json.load(open(settings_path, encoding="utf-8")).get("credentials", {})
        except Exception:
            pass

    poly_odp = odp_creds.get("polygon_api_key", "")
    cg_odp = odp_creds.get("coingecko_api_key", "")

    # Check local .env
    env_file = BASE_DIR / ".env"

    unresolved = []
    if not (poly_env or poly_odp):
        unresolved.append("POLYGON_API_KEY (required) — will 401")
    if not (cg_env or cg_odp):
        unresolved.append("COINGECKO_API_KEY (optional) — crypto data unavailable")

    if unresolved:
        logger.warning("── Unresolved API Keys ─────────────────────────────")
        for key in unresolved:
            logger.warning(f"  ✗ {key}")
        logger.warning(f"  ODP credentials file: {settings_path} ({'found' if settings_path.exists() else 'NOT FOUND'})")
        logger.warning(f"  Keys in ODP: {list(odp_creds.keys()) if odp_creds else '(none)'}")
        logger.warning("────────────────────────────────────────────────────")
    else:
        logger.info("API keys resolved ✓")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: preload data in background thread so server starts immediately."""
    import asyncio
    from preloader import load_all_data, background_refresh

    _log_key_resolution()

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
from routes_sec import router as sec_router
from routes_util import router as util_router
from routes_tradingview import router as tradingview_router
from routes_watchlist import router as watchlist_router

app.include_router(pulse_router)
app.include_router(factors_router)
app.include_router(attribution_router)
app.include_router(performance_router)
app.include_router(pairs_router)
app.include_router(corporate_router)
app.include_router(sec_router)
app.include_router(util_router)
app.include_router(tradingview_router)
app.include_router(watchlist_router)


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


@app.get("/debug/keys")
def debug_keys():
    """Shows key resolution status without exposing values. Hit this to diagnose 401s."""
    import json as _json, os as _os
    from pathlib import Path as _Path

    poly_env = _os.getenv("POLYGON_API_KEY") or _os.getenv("polygon_api_key") or _os.getenv("massive_api_key")
    cg_env = _os.getenv("COINGECKO_API_KEY") or _os.getenv("coingecko_api_key")

    settings_path = _Path.home() / ".openbb_platform" / "user_settings.json"
    odp_creds = {}
    odp_file_found = settings_path.exists()
    if odp_file_found:
        try:
            odp_creds = _json.load(open(settings_path, encoding="utf-8")).get("credentials", {})
        except Exception as e:
            odp_creds = {"_error": str(e)}

    poly_odp = bool(odp_creds.get("polygon_api_key"))
    cg_odp = bool(odp_creds.get("coingecko_api_key"))

    return {
        "odp_user_settings": {
            "path": str(settings_path),
            "file_found": odp_file_found,
            "all_credential_keys": list(odp_creds.keys()),
        },
        "polygon_api_key": {
            "from_env": bool(poly_env),
            "from_odp": poly_odp,
            "resolved": bool(poly_env or poly_odp),
        },
        "coingecko_api_key": {
            "from_env": bool(cg_env),
            "from_odp": cg_odp,
            "resolved": bool(cg_env or cg_odp),
        },
    }


@app.get("/widgets.json")
def get_widgets():
    with open(BASE_DIR / "widgets.json", "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/apps.json")
def get_apps():
    with open(BASE_DIR / "apps.json", "r", encoding="utf-8") as f:
        return json.load(f)

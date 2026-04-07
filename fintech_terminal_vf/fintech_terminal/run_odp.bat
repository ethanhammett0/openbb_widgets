@echo off
REM ── Fintech Equity Research Terminal (Port 7779) ──
REM API keys are loaded from ODP user_settings.json or local .env fallback.
REM When launched via ODP, environment variables are injected automatically.
REM For standalone use, create a .env file from .env.example.

set POLYGON_API_KEY=%POLYGON_API_KEY%
set COINGECKO_API_KEY=%COINGECKO_API_KEY%

python -m uvicorn main:app --host 0.0.0.0 --port 7779 --reload

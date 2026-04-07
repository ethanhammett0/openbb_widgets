@echo off
REM ── FinTech RSS News Flow (Port 7790) ──
REM No API keys required — uses public RSS feeds only.

python -m uvicorn main:app --host 0.0.0.0 --port 7790 --reload

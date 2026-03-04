@echo off
echo ============================================================
echo   Structured Finance App  —  Unified Backend on port 7800
echo ============================================================
pip install -r requirements.txt --quiet
python -m uvicorn main:app --host 0.0.0.0 --port 7800 --reload

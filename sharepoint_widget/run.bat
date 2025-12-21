@echo off
pip install fastapi uvicorn
python -m uvicorn main:app --reload --port 8003

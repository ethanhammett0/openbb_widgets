@echo off
echo Starting OpenBB Workspace Backend...
uvicorn main:app --reload --host 0.0.0.0 --port 7779
pause

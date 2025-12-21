@echo off
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Gemini Agent*"
echo Starting Gemini Agent (Clean)...
uv run gemini_agent.py
pause

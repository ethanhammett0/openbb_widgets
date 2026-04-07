@echo off
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Gemini Agent*"
echo Starting Gemini Agent on Port 8013...
python gemini_agent.py
pause

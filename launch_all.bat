@echo off
echo ===================================================
echo   OpenBB Widgets ^& MCP Master Launcher
echo ===================================================
echo.

REM 1. Markets Monitor (Port 8000)
echo [1/8] Starting Markets Monitor...
start "Markets Monitor" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\markets_monitor" cmd /c "python main.py"

REM 2. Revista MCP (Port 8001)
echo [2/8] Starting Revista MCP...
start "Revista MCP" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\revista_api\mcp_server" cmd /c "python main.py --transport sse --port 8001"

REM 3. SharePoint Widget (Port 8003)
echo [3/8] Starting SharePoint Widget...
start "SharePoint Widget" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\sharepoint_widget" cmd /c "python -m uvicorn main:app --port 8003"

REM 4. Form Widgets (Port 8008)
echo [4/8] Starting Form Widgets...
start "Form Widgets" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\form_widgets" cmd /c "python -m uvicorn main:app --host 0.0.0.0 --port 8008"

REM 5. Sponsor Dashboard (Port 8009)
echo [5/8] Starting Sponsor Dashboard...
start "Sponsor Dashboard" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\sponsor_dashboard" cmd /c "python -m uvicorn main:app --host 0.0.0.0 --port 8009"

REM 6. Gemini Agent (Port 8013)
echo [6/8] Starting Gemini Agent...
start "Gemini Agent" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\OpenBB_Gemini" cmd /c "python gemini_agent.py"

REM 7. ProPublica MCP (Port 8021)
echo [7/8] Starting ProPublica MCP...
start "ProPublica MCP" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\propublica_api\mcp_server" cmd /c "python main.py --transport sse --port 8021"

REM 8. Portfolio Review (Port 8002)
echo [8/8] Starting Portfolio Review...
start "Portfolio Review" /d "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\portfolio_review" cmd /c "run.bat"

echo.
echo ===================================================
echo   All components are launching in separate windows.
echo   You can close this window now.
echo ===================================================
pause

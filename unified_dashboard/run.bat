@echo off
echo ========================================
echo  Unified HRE Dashboard with ngrok
echo ========================================
echo.
echo Installing dependencies...
pip install -r requirements.txt -q
echo.
echo Starting server with ngrok tunnel...
python run_with_ngrok.py
pause

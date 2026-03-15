@echo off
title ADB Commander Pro
color 0A
echo.
echo  ==========================================
echo   ^>_ ADB Commander Pro  v3.1
echo  ==========================================
echo.

where adb >nul 2>&1 || (
    echo  [WARN] adb not found in PATH!
    echo  Download: https://developer.android.com/studio/releases/platform-tools
    echo.
)

echo  [1/3] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt -q
if %errorlevel% neq 0 ( echo  [ERROR] pip install failed & pause & exit /b 1 )

echo  [2/3] Starting backend on 0.0.0.0:8000 (all interfaces)...
start "ADB Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --host 0.0.0.0 --reload --port 8000"
timeout /t 3 /nobreak >nul

echo  [3/3] Installing and starting frontend...
cd /d "%~dp0frontend"
call npm install --silent
start "ADB Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  ==========================================
echo   Local    : http://localhost:5173
echo   Network  : http://YOUR-LAN-IP:5173
echo   API Docs : http://localhost:8000/api/docs
echo.
echo   For remote access, open the app and go to
echo   Wireless ^> Remote Access tab ^> Start Tunnel
echo  ==========================================
echo.
start http://localhost:5173
pause

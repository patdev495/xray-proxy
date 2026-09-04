@echo off
title xray-proxy Dev Launcher
echo ==============================================
echo       xray-proxy Development Launcher
echo ==============================================
echo.

echo [1/2] Starting Backend FastAPI on port 8000...
start "xray-proxy Backend" cmd /k "cd /d %~dp0backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Starting Frontend Vite on port 5173...
start "xray-proxy Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ==============================================
echo Services started!
echo Frontend:    http://localhost:5173 (or 5174)
echo Backend API: http://127.0.0.1:8000
echo Swagger:     http://127.0.0.1:8000/docs
echo Admin Login: admin / adminpassword
echo ==============================================
echo.
pause

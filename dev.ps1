# Development launcher for xray-proxy
Write-Host "=== Starting xray-proxy Development Environment ===" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

# Launch Backend
Write-Host "[1/2] Launching Backend FastAPI (uv uvicorn on port 8000)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd `"$backendPath`"; uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

# Launch Frontend
Write-Host "[2/2] Launching Frontend React (Vite on port 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd `"$frontendPath`"; npm.cmd run dev"

Write-Host "`nServices running in background terminals!" -ForegroundColor Green
Write-Host "• Frontend UI:  http://localhost:5173 (or 5174)" -ForegroundColor Cyan
Write-Host "• Backend API:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "• API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "• Credentials:  admin / adminpassword`n" -ForegroundColor Magenta

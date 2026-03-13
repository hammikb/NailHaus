# NailHaus Development Server Starter (PowerShell)
Write-Host "`n=================================="
Write-Host "  NailHaus Development Environment"
Write-Host "==================================`n" -ForegroundColor Cyan

# Start backend server in background
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -WindowStyle Normal

# Wait for backend to initialize
Start-Sleep -Seconds 2

# Start frontend server in new window
Write-Host "Starting frontend server..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process -FilePath "cmd" -ArgumentList "/c cd `"$frontendPath`" && npm run dev" -WindowStyle Normal

Write-Host "`nServers starting:"-ForegroundColor Green
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nBoth windows should open automatically.`n" -ForegroundColor Gray

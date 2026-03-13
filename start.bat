@echo off
REM NailHaus Development Server Starter
REM This script starts both backend and frontend servers

echo.
echo ===================================
echo  NailHaus Development Environment
echo ===================================
echo.

REM Start backend in a new window
echo Starting backend server on http://localhost:3001...
start "NailHaus Backend" cmd /k "node server.js"

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start frontend in another new window
echo Starting frontend server on http://localhost:3000...
start "NailHaus Frontend" cmd /k "cd frontend && npm run dev"

REM Show status message
echo.
echo Both servers are starting...
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:3000
echo.
echo Close either window to stop that server.
echo.

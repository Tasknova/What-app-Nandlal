@echo off
echo Starting WhatsApp Business Hub Development Environment...
echo.

echo Starting Proxy Server on port 3001...
start "Proxy Server" cmd /k "node proxy-server.js"

echo Waiting 3 seconds for proxy server to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Development Server on port 5173...
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo Development environment started!
echo.
echo Frontend: http://localhost:5173
echo API Proxy: http://localhost:3001
echo.
echo Press any key to close this window...
pause > nul

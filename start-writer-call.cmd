@echo off
setlocal
cd /d "%~dp0"

start "" /min node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:3030

endlocal

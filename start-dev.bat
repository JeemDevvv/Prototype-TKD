@echo off
echo Clearing port 4000...
powershell -ExecutionPolicy Bypass -File kill-port.ps1
timeout /t 1 /nobreak >nul
echo Starting development server...
npm run dev




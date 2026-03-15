@echo off
echo ==========================================
echo POS Silent Printer Setup
echo ==========================================
echo.

// Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed! 
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo [1/3] Installing dependencies...
call npm install --no-audit

echo [2/3] Creating start shortcuts...
(
echo @echo off
echo cd /d "%%~dp0"
echo title POS Printer Server
echo echo Starting POS Printer Server...
echo node server.cjs
echo pause
) > start-printer.bat

echo [3/3] Setting up auto-start on boot...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\POSPrinterServer.bat"

(
echo @echo off
echo start /min "" "%~dp0start-printer.bat"
) > "%SHORTCUT_PATH%"

echo Configuration Complete!
echo.
echo 1. To start NOW: Double-click 'start-printer.bat'
echo 2. The server will now ALSO start automatically whenever Windows starts.
echo.
echo ==========================================
pause

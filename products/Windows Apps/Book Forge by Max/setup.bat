@echo off
chcp 65001 >nul
title Book Forge by Max - Environment Setup

echo ================================================================
echo        BOOK FORGE BY MAX - ENVIRONMENT SETUP ^& DEPENDENCIES
echo ================================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in your system PATH!
    echo.
    echo Book Forge requires Node.js for high-speed PDF rendering and text processing.
    echo Please install Node.js ^(LTS version recommended^):
    echo   https://nodejs.org/
    echo.
    echo Opening Node.js download page in your default browser...
    start https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Detected Node.js: %NODE_VER%
echo.

:: 2. Install required global npm packages
echo [*] Installing required publishing libraries:
echo     - puppeteer ^(Headless Browser Engine^)
echo     - pdf-lib ^(PDF Structuring ^& Outlines^)
echo     - pdf-parse ^(Text ^& Coordinate Extraction^)
echo     - markdown-it ^(Markdown to HTML Parser^)
echo     - @pdf-lib/fontkit ^(Embedded Font Engine^)
echo.
echo Please wait, this may take 15-45 seconds depending on your connection...
echo.

call npm install -g puppeteer pdf-lib pdf-parse markdown-it @pdf-lib/fontkit

if %ERRORLEVEL% equ 0 (
    echo.
    echo ================================================================
    echo [SUCCESS] All dependencies have been installed successfully!
    echo ================================================================
    echo.
    echo You can now run "Book Forge by Max.exe" and start publishing!
    echo.
) else (
    echo.
    echo ================================================================
    echo [WARNING] npm installation reported an issue ^(Code: %ERRORLEVEL%^).
    echo If permission was denied, please right-click this setup.bat
    echo and choose "Run as administrator".
    echo ================================================================
    echo.
)

pause

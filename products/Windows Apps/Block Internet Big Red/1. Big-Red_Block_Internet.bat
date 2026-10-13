@echo off
setlocal
cd /d "%~dp0"

:: Tu dong xin quyen Administrator neu chua co
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Dang khoi chay voi quyen Administrator...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0scripts\1. Big-Red_Block_Internet.ps1\"\"' -Verb RunAs"
    exit /b
)

:: Neu da co quyen Admin thi chay truc tiep
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\1. Big-Red_Block_Internet.ps1"
pause
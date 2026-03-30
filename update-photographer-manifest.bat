@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\update-photographer-manifest.ps1"
endlocal

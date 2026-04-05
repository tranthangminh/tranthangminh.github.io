@echo off
setlocal

set "SCRIPT_DIR=%~dp0scripts"

echo Updating cheat table manifest...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\update-cheat-tables.ps1"
if errorlevel 1 goto :error

echo.
echo Cheat table manifest updated successfully.
endlocal
exit /b 0

:error
echo.
echo Failed to update cheat table manifest.
endlocal
exit /b 1

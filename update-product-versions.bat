@echo off
setlocal

set "SCRIPT_DIR=%~dp0scripts"

echo Syncing product versions from products-version.json...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\update-product-versions.ps1"
if errorlevel 1 goto :error

echo.
echo Product versions updated successfully.
endlocal
exit /b 0

:error
echo.
echo Failed to update product versions.
endlocal
exit /b 1

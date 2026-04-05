@echo off
setlocal

set "SCRIPT_DIR=%~dp0scripts"

echo Updating photographer manifest...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\update-photographer-manifest.ps1"
if errorlevel 1 goto :error

echo.
echo Updating artist manifests...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\update-artist-manifests.ps1"
if errorlevel 1 goto :error

echo.
echo All image manifests updated successfully.
endlocal
exit /b 0

:error
echo.
echo Failed to update image manifests.
endlocal
exit /b 1

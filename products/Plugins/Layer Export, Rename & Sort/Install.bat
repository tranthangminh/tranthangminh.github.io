@echo off
setlocal EnableExtensions

rem Copies the Layer Export, Rename & Sort UXP panel into the per-user UXP plugin folder,
rem which Photoshop scans at startup. No admin rights, .ccx or UXP Developer Tools needed.

set "PLUGIN_ID=com.max.layerxrs"
set "SRC=%~dp0"
set "SRC=%SRC:~0,-1%"
set "DST=%APPDATA%\Adobe\UXP\Plugins\External\%PLUGIN_ID%"

if not exist "%SRC%\manifest.json" (
  echo [!] manifest.json was not found next to Install.bat.
  echo [!] Extract the whole plugin folder before running this file.
  goto fail
)

:check_photoshop_closed
tasklist /fi "imagename eq Photoshop.exe" 2>nul | find /i "Photoshop.exe" >nul
if errorlevel 1 goto install
echo [!] Photoshop is running. Close it, then press any key to continue.
pause >nul
goto check_photoshop_closed

:install
echo Installing to: "%DST%"
if exist "%DST%" rd /s /q "%DST%"
robocopy "%SRC%" "%DST%" manifest.json index.html /R:1 /W:1 >nul
if errorlevel 8 goto copy_failed
for %%f in (css js icons) do (
  robocopy "%SRC%\%%f" "%DST%\%%f" /E /XF *.ai /R:1 /W:1 >nul
  if errorlevel 8 goto copy_failed
)
echo [OK] Installed.

if exist "%APPDATA%\Adobe\UXP\PluginsInfo\v1\PS.json" goto warn_plugins_info
if exist "%CommonProgramFiles%\Adobe\UXP\PluginsInfo\v1\PS.json" goto warn_plugins_info
goto check_old_copies

:warn_plugins_info
echo.
echo [!] Creative Cloud keeps its own plugin list on this PC.
echo [!] If the panel does not appear, install the .ccx file instead.

:check_old_copies
for /d %%d in ("%ProgramFiles%\Adobe\Adobe Photoshop*") do (
  if exist "%%~fd\Plug-ins\%PLUGIN_ID%" (
    echo.
    echo [!] Old copy found: "%%~fd\Plug-ins\%PLUGIN_ID%"
    echo [!] Delete that folder, otherwise it can block this install.
  )
)

echo.
echo Done. Start Photoshop and open the panel from the Plugins menu.
pause
exit /b 0

:copy_failed
echo [!] Copy failed. Check that the folder is not open in another program.

:fail
echo.
pause
exit /b 1

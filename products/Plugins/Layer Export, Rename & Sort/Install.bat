@echo off
setlocal EnableExtensions

rem Copies the Layer Export, Rename & Sort UXP panel into the Plug-ins folder
rem of every Photoshop found on this PC. No .ccx or UXP Developer Tools needed.

set "PLUGIN_ID=com.max.layerxrs"
set "SRC=%~dp0"
set "SRC=%SRC:~0,-1%"
set "FOUND=0"
set "FAILED=0"
set "DONE=;"

net session >nul 2>&1
if not errorlevel 1 goto check_source

echo Requesting administrator rights...
set "SELF=%~f0"
powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList ('/c ' + [char]34 + [char]34 + $env:SELF + [char]34 + [char]34) -Verb RunAs"
if errorlevel 1 (
  echo [!] Administrator rights are required to write into Program Files.
  pause
)
exit /b

:check_source
if not exist "%SRC%\manifest.json" (
  echo [!] manifest.json was not found next to Install.bat.
  echo [!] Extract the whole plugin folder before running this file.
  goto fail
)

:check_photoshop_closed
tasklist /fi "imagename eq Photoshop.exe" 2>nul | find /i "Photoshop.exe" >nul
if errorlevel 1 goto find_photoshop
echo [!] Photoshop is running. Close it, then press any key to continue.
pause >nul
goto check_photoshop_closed

:find_photoshop
for /f "tokens=1,2,*" %%a in ('reg query "HKLM\SOFTWARE\Adobe\Photoshop" /s /v ApplicationPath 2^>nul') do (
  if /i "%%a"=="ApplicationPath" call :install "%%c"
)
for /d %%d in ("%ProgramFiles%\Adobe\Adobe Photoshop*") do call :install "%%~fd"

echo.
if "%FAILED%"=="1" goto fail
if "%FOUND%"=="0" (
  echo [!] No Photoshop installation was found.
  goto fail
)
echo Done. Start Photoshop and open the panel from the Plugins menu.
pause
exit /b 0

:fail
echo.
pause
exit /b 1

:install
set "PS_DIR=%~1"
if "%PS_DIR:~-1%"=="\" set "PS_DIR=%PS_DIR:~0,-1%"
if not exist "%PS_DIR%\Photoshop.exe" exit /b
echo "%DONE%" | find /i ";%PS_DIR%;" >nul
if not errorlevel 1 exit /b
set "DONE=%DONE%%PS_DIR%;"
set "DST=%PS_DIR%\Plug-ins\%PLUGIN_ID%"

echo.
echo Installing to: "%DST%"
if exist "%DST%" rd /s /q "%DST%"
robocopy "%SRC%" "%DST%" manifest.json index.html /R:1 /W:1 >nul
if errorlevel 8 goto copy_failed
for %%f in (css js icons) do (
  robocopy "%SRC%\%%f" "%DST%\%%f" /E /XF *.ai /R:1 /W:1 >nul
  if errorlevel 8 goto copy_failed
)
set /a FOUND+=1
echo [OK] Installed.
exit /b

:copy_failed
echo [!] Copy failed. Check that the folder is not open in another program.
set "FAILED=1"
exit /b

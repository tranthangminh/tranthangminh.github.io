@echo off
setlocal EnableDelayedExpansion
title Book Forge by Max - Universal Portable App Builder

:: Define ANSI Escape sequences for colors
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "RESET=!ESC![0m"
set "GREEN=!ESC![92m"
set "CYAN=!ESC![96m"
set "RED=!ESC![91m"
set "YELLOW=!ESC![93m"
set "GRAY=!ESC![90m"
set "BOLD=!ESC![1m"

echo !CYAN!================================================================!RESET!
echo !BOLD!!CYAN!          BOOK FORGE BY MAX PORTABLE APP BUILDER!RESET!
echo !CYAN!================================================================!RESET!
echo.

:: 1. Find C# compiler csc.exe
set "CSC="
if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    set "CSC=%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
) else if exist "%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe" (
    set "CSC=%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if "%CSC%"=="" (
    echo !RED![ERROR] Microsoft C# Compiler csc.exe not found on this system!RESET!
    echo Please ensure .NET Framework is installed.
    echo.
    pause
    exit /b 1
)

echo [*] Compiler : %CSC%
echo.

:: 2. Scan and build all projects matching src_*
set /a FOUND_COUNT=0
set /a SUCCESS_COUNT=0

for /d %%D in ("%~dp0src_*") do (
    set /a FOUND_COUNT+=1
    set "DIR_NAME=%%~nxD"
    set "APP_NAME=!DIR_NAME:~4!"

    echo !GRAY!----------------------------------------------------------------!RESET!
    echo [*] Project found : !CYAN!!DIR_NAME!!RESET!
    echo [*] Output binary : !BOLD!!APP_NAME!.exe!RESET!
    echo !GRAY!----------------------------------------------------------------!RESET!

    :: Terminate running instance if any to prevent file lock
    taskkill /F /IM "!APP_NAME!.exe" >nul 2>&1

    :: Compile C# source files recursively with embedded icon
    echo [*] Compiling source code...
    if exist "%~dp0!DIR_NAME!\app.ico" (
        "%CSC%" /nologo /target:winexe /optimize+ /codepage:65001 /win32icon:"%~dp0!DIR_NAME!\app.ico" /out:"%~dp0!APP_NAME!.exe" /recurse:"%~dp0!DIR_NAME!\*.cs"
    ) else (
        "%CSC%" /nologo /target:winexe /optimize+ /codepage:65001 /out:"%~dp0!APP_NAME!.exe" /recurse:"%~dp0!DIR_NAME!\*.cs"
    )

    if !ERRORLEVEL! equ 0 (
        echo !GREEN!!BOLD![OK] Successfully built: "%~dp0!APP_NAME!.exe"!RESET!
        set /a SUCCESS_COUNT+=1
    ) else (
        echo !RED!!BOLD![ERROR] Build failed for "!APP_NAME!"!RESET!
    )
)

if !FOUND_COUNT! equ 0 (
    echo !RED![ERROR] No source directory matching "src_*" found!RESET!
    pause
    exit /b 1
)

if !SUCCESS_COUNT! neq !FOUND_COUNT! goto :BUILD_SUMMARY

:: 3. Packaging Standalone Release ZIP
echo.
echo !CYAN!================================================================!RESET!
echo !BOLD!!CYAN!          PACKAGING STANDALONE RELEASE (.ZIP)!RESET!
echo !CYAN!================================================================!RESET!
echo.

set "DIST_TEMP=%~dp0_dist_temp"
set "PACKAGE_NAME=Book Forge by Max"
set "ZIP_NAME=Book Forge by Max v1.0 (Beta).zip"
set "DIST_FOLDER=%~dp0_dist_temp\Book Forge by Max"
for %%I in ("%~dp0..") do set "PARENT_DIR=%%~fI"
set "ZIP_OUT=!PARENT_DIR!\!ZIP_NAME!"

echo [*] Staging files for release package...
if exist "!DIST_TEMP!" rd /s /q "!DIST_TEMP!" >nul 2>&1
mkdir "!DIST_FOLDER!" >nul 2>&1

:: Copy Exe
if exist "%~dp0Book Forge by Max.exe" (
    copy /y "%~dp0Book Forge by Max.exe" "!DIST_FOLDER!\" >nul
)

:: Copy setup.bat and README.txt
if exist "%~dp0setup.bat" (
    copy /y "%~dp0setup.bat" "!DIST_FOLDER!\" >nul
)
if exist "%~dp0README.txt" (
    copy /y "%~dp0README.txt" "!DIST_FOLDER!\" >nul
)

:: Copy script folder recursively
if exist "%~dp0src_Book Forge by Max\script" (
    echo [*] Copying script engine...
    xcopy /e /i /y "%~dp0src_Book Forge by Max\script" "!DIST_FOLDER!\script" >nul
)

:: Copy Templates folder recursively
if exist "%~dp0src_Book Forge by Max\Templates" (
    echo [*] Copying document templates...
    xcopy /e /i /y "%~dp0src_Book Forge by Max\Templates" "!DIST_FOLDER!\Templates" >nul
)

echo [*] Compressing into release ZIP: !ZIP_NAME!...
if exist "!ZIP_OUT!" del /f /q "!ZIP_OUT!" >nul 2>&1
if exist "%~dp0!ZIP_NAME!" del /f /q "%~dp0!ZIP_NAME!" >nul 2>&1

where tar >nul 2>&1
if !ERRORLEVEL! equ 0 (
    tar.exe -a -c -f "!ZIP_OUT!" -C "!DIST_TEMP!" "!PACKAGE_NAME!"
) else (
    powershell -NoProfile -Command "Compress-Archive -Path '!DIST_FOLDER!' -DestinationPath '!ZIP_OUT!' -CompressionLevel Optimal -Force"
)

if exist "!ZIP_OUT!" (
    echo !GREEN!!BOLD![OK] Successfully created release ZIP:!RESET!
    echo     !CYAN!!ZIP_OUT!!RESET!
) else (
    echo !RED!!BOLD![ERROR] Failed to create release ZIP.!RESET!
)

:: Clean up staging directory
if exist "!DIST_TEMP!" rd /s /q "!DIST_TEMP!" >nul 2>&1

:BUILD_SUMMARY
echo.
echo !CYAN!================================================================!RESET!
if !SUCCESS_COUNT! equ !FOUND_COUNT! (
    echo !GREEN!!BOLD![COMPLETED] Build and packaging finished successfully.!RESET!
) else (
    echo !YELLOW!!BOLD![WARNING] Finished with errors: !SUCCESS_COUNT!/!FOUND_COUNT! built.!RESET!
)
echo !CYAN!================================================================!RESET!
echo.
pause

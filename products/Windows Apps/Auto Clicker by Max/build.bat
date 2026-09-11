@echo off
setlocal EnableDelayedExpansion
title Universal C# Portable App Builder

:: Define ANSI Escape sequences for individual colors
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "RESET=!ESC![0m"
set "GREEN=!ESC![92m"
set "CYAN=!ESC![96m"
set "RED=!ESC![91m"
set "YELLOW=!ESC![93m"
set "GRAY=!ESC![90m"
set "BOLD=!ESC![1m"

echo !CYAN!================================================================!RESET!
echo !BOLD!!CYAN!            UNIVERSAL C# PORTABLE APP BUILDER!RESET!
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

echo [*] Compiler: %CSC%
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

    :: Cleanup any rogue legacy folders or files in AutoClicker-Save&Load
    if exist "%~dp0AutoClicker-Save&Load\Templates" rd /s /q "%~dp0AutoClicker-Save&Load\Templates" >nul 2>&1
    if exist "%~dp0AutoClicker-Save&Load\AppSettings.json" del /f /q "%~dp0AutoClicker-Save&Load\AppSettings.json" >nul 2>&1

    :: Bundle template JSON files as embedded resources if present
    set "RES_ARGS="
    if exist "%%D\Template" (
        for %%F in ("%%D\Template\*.json") do (
            echo [*] Bundling Template: %%~nxF
            set "RES_ARGS=!RES_ARGS! /resource:"%%~fF","Template.%%~nxF""
        )
    )

    :: Check for application manifest
    set "MANIFEST_ARG="
    if exist "%%D\app.manifest" (
        set "MANIFEST_ARG=/win32manifest:"%%D\app.manifest""
    )

    :: Compile source files recursively (/nologo suppresses compiler banner)
    echo [*] Compiling source code...
    if exist "%%D\app.ico" (
        "%CSC%" /nologo /target:winexe /optimize+ /win32icon:"%%D\app.ico" !MANIFEST_ARG! /out:"%~dp0!APP_NAME!.exe" !RES_ARGS! /recurse:"%%D\*.cs"
    ) else (
        "%CSC%" /nologo /target:winexe /optimize+ !MANIFEST_ARG! /out:"%~dp0!APP_NAME!.exe" !RES_ARGS! /recurse:"%%D\*.cs"
    )

    if !ERRORLEVEL! equ 0 (
        set /a SUCCESS_COUNT+=1
        echo !GREEN![OK] Successfully built: "%~dp0!APP_NAME!.exe"!RESET!

        :: Copy exe one level up (next to the project folder)
        echo [*] Copying exe to parent folder...
        copy /Y "%~dp0!APP_NAME!.exe" "%~dp0..\" >nul
        if !ERRORLEVEL! equ 0 (
            echo !GREEN![OK] Copied: "%~dp0..\!APP_NAME!.exe"!RESET!
        ) else (
            echo !YELLOW![WARN] Copy failed for "!APP_NAME!"!RESET!
        )
    ) else (
        echo !RED![ERROR] Build failed for "!APP_NAME!"!RESET!
    )
    echo.
)

:: 3. Summary report
echo !CYAN!================================================================!RESET!
if !FOUND_COUNT! equ 0 (
    echo !YELLOW![WARNING] No directories matching 'src_AppName' pattern found!RESET!
    echo.
    echo Usage Guide:
    echo - Place your .cs source files in a folder named: src_AppName [e.g. src_AutoClicker]
    echo - Run build.bat to automatically generate AppName.exe [e.g. AutoClicker.exe]
) else (
    if !SUCCESS_COUNT! equ !FOUND_COUNT! (
        echo !GREEN!!BOLD![COMPLETED] All !SUCCESS_COUNT!/!FOUND_COUNT! application[s] built successfully.!RESET!
    ) else (
        echo !YELLOW![ATTENTION] Only !SUCCESS_COUNT!/!FOUND_COUNT! application[s] built successfully.!RESET!
    )
)
echo !CYAN!================================================================!RESET!
echo.
pause
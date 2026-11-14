@echo off
setlocal
title Claude Code
rem ==================================================
rem  Mo Claude Code ngay tai thu muc chua file nay.
rem  Chua cai Claude Code thi tu cai.
rem  Cach dung: double-click file nay.
rem ==================================================
cd /d "%~dp0"

rem --- 1. Kiem tra Git: chi canh bao, khong dung lai ---
where git >nul 2>nul
if errorlevel 1 (
  echo [CANH BAO] Khong thay lenh git trong PATH.
  echo Neu Claude bao thieu Git thi cai tai: https://git-scm.com/download/win
  echo.
)

rem --- 2. Tim lenh claude, chua co thi cai ---
call :addpath
where claude >nul 2>nul
if errorlevel 1 (
  echo Chua co Claude Code. Dang cai, vui long doi...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://claude.ai/install.ps1 | iex"
  call :addpath
)
where claude >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Cai xong nhung van khong tim thay lenh claude.
  echo Dong cua so nay, chay lai file mot lan nua.
  echo Neu van loi: chup man hinh nay gui cho Claude.
  pause
  exit /b 1
)

rem --- 3. Menu ---
:menu
echo.
echo Thu muc: %CD%
echo.
echo   1. Mo Claude (binh thuong)
echo   2. Mo Claude dieu khien tu app / dien thoai (remote-control)
echo   3. Cap nhat Claude Code len ban moi
echo   4. Thoat
echo.
choice /c 1234 /n /m "Chon 1, 2, 3 hoac 4: "
if errorlevel 4 exit /b 0
if errorlevel 3 (
  call claude update
  goto menu
)
if errorlevel 2 (
  call claude remote-control
  goto done
)
call claude

:done
echo.
echo Claude da dong.
pause
exit /b 0

rem --- Them cac thu muc cai claude thuong gap vao PATH cua cua so nay ---
:addpath
if exist "%USERPROFILE%\.local\bin\claude.exe" set "PATH=%USERPROFILE%\.local\bin;%PATH%"
if exist "%APPDATA%\npm\claude.cmd" set "PATH=%APPDATA%\npm;%PATH%"
exit /b 0

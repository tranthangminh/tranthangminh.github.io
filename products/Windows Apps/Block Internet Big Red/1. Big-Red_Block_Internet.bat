@echo off
setlocal

:: Script .ps1 tu xin quyen Administrator (UAC) neu chua co
set "PS1=%~dp0scripts\1. Big-Red_Block_Internet.ps1"
if exist "%PS1%" goto run
echo [!] Khong tim thay file: "%PS1%"
echo [!] Hay giai nen toan bo file .zip truoc khi chay file .bat nay.
pause
exit /b 1

:run
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"

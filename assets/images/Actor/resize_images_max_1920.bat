@echo off
setlocal

set "MAX=1920"
set "SUFFIX="
set "TARGETDIR=%~1"
if not defined TARGETDIR set "TARGETDIR=%~dp0"

if not exist "%TARGETDIR%\" (
    echo Thu muc khong hop le: "%TARGETDIR%"
    exit /b 1
)

pushd "%TARGETDIR%" >nul || (
    echo Khong mo duoc thu muc: "%TARGETDIR%"
    exit /b 1
)

set "OUTDIR=Resize Images Max 1920"
set "FOUND=0"

where magick >nul 2>nul
if errorlevel 1 (
    echo Khong tim thay lenh "magick".
    echo Cai ImageMagick roi mo lai file .bat nay nha.
    popd
    exit /b 1
)

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

for /f "delims=" %%F in ('dir /b /a-d *.jpg *.jpeg *.png *.webp *.bmp *.tif *.tiff 2^>nul') do (
    set "FOUND=1"
    for /f "tokens=1,2" %%A in ('magick identify -format "%%w %%h" "%%F"') do (
        if %%A GTR %MAX% (
            echo Resize: %%F
            magick "%%F" -resize "%MAX%x%MAX%>" "%OUTDIR%\%%~nF%SUFFIX%%%~xF"
        ) else (
            if %%B GTR %MAX% (
                echo Resize: %%F
                magick "%%F" -resize "%MAX%x%MAX%>" "%OUTDIR%\%%~nF%SUFFIX%%%~xF"
            ) else (
                echo Keep: %%F
                copy /Y "%%F" "%OUTDIR%\%%~nF%SUFFIX%%%~xF" >nul
            )
        )
    )
)

if "%FOUND%"=="0" (
    echo Khong tim thay anh nao trong thu muc hien tai.
) else (
    echo.
    echo Xong. Tat ca anh nam trong thu muc "%OUTDIR%".
)

popd
endlocal

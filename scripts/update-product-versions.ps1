param(
    [string]$JsonFile
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not $JsonFile) {
    $JsonFile = Join-Path $projectRoot 'products\products-version.json'
}

if (-not (Test-Path -LiteralPath $JsonFile)) {
    throw "Version JSON file not found: $JsonFile"
}

$rawJson = [System.IO.File]::ReadAllText($JsonFile, [System.Text.Encoding]::UTF8)
$data = $rawJson | ConvertFrom-Json

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "         PRODUCT VERSIONS SYNCHRONIZATION ENGINE                " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[*] Source: $JsonFile`n" -ForegroundColor Gray

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# -----------------------------------------------------------------------------
# 1. AUTO CLICKER SYNC
# -----------------------------------------------------------------------------
if ($data.'auto-clicker') {
    $acName = $data.'auto-clicker'.name
    $acVer = $data.'auto-clicker'.version
    $acTitle = "$acName v$acVer"
    Write-Host "[*] Processing 'auto-clicker' -> Version: $acVer ($acTitle)" -ForegroundColor Yellow

    # 1.1 products/auto-clicker.html
    $acHtmlPath = Join-Path $projectRoot 'products\auto-clicker.html'
    if (Test-Path -LiteralPath $acHtmlPath) {
        $html = [System.IO.File]::ReadAllText($acHtmlPath, [System.Text.Encoding]::UTF8)
        $html = [System.Text.RegularExpressions.Regex]::Replace($html, '(?<=<meta\s+name=["'']app-latest-version["'']\s+content=["''])[^"'']+', $acVer)
        $html = [System.Text.RegularExpressions.Regex]::Replace($html, '(?<="softwareVersion":\s*")[^"]+', $acVer)
        $html = [System.Text.RegularExpressions.Regex]::Replace($html, '(?<=<span\s+data-i18n=["'']autoClicker\.title["'']>)[^<]+', $acTitle)
        [System.IO.File]::WriteAllText($acHtmlPath, $html, $utf8NoBom)
        Write-Host "    [OK] products/auto-clicker.html synced" -ForegroundColor Green
    }

    # 1.2 products/auto-clicker-i18n.js
    $acI18nPath = Join-Path $projectRoot 'products\auto-clicker-i18n.js'
    if (Test-Path -LiteralPath $acI18nPath) {
        $i18n = [System.IO.File]::ReadAllText($acI18nPath, [System.Text.Encoding]::UTF8)
        $i18n = [System.Text.RegularExpressions.Regex]::Replace($i18n, "title:\s*'Auto Clicker by Max v[^']+'", "title: '$acTitle'")
        [System.IO.File]::WriteAllText($acI18nPath, $i18n, $utf8NoBom)
        Write-Host "    [OK] products/auto-clicker-i18n.js synced" -ForegroundColor Green
    }

    # 1.3 products/products.html (legacy bridge)
    $bridgeHtmlPath = Join-Path $projectRoot 'products\products.html'
    if (Test-Path -LiteralPath $bridgeHtmlPath) {
        $bridge = [System.IO.File]::ReadAllText($bridgeHtmlPath, [System.Text.Encoding]::UTF8)
        $bridge = [System.Text.RegularExpressions.Regex]::Replace($bridge, '(?<=<title>)[^<]+', $acTitle)
        $bridge = [System.Text.RegularExpressions.Regex]::Replace($bridge, '(?<=<meta\s+name=["'']app-latest-version["'']\s+content=["''])[^"'']+', $acVer)
        $bridge = [System.Text.RegularExpressions.Regex]::Replace($bridge, '(?<=<meta\s+name=["'']auto-clicker-latest-version["'']\s+content=["''])[^"'']+', $acVer)
        [System.IO.File]::WriteAllText($bridgeHtmlPath, $bridge, $utf8NoBom)
        Write-Host "    [OK] products/products.html (legacy bridge) synced" -ForegroundColor Green
    }

    # 1.4 products.html (main catalog)
    $catHtmlPath = Join-Path $projectRoot 'products.html'
    if (Test-Path -LiteralPath $catHtmlPath) {
        $cat = [System.IO.File]::ReadAllText($catHtmlPath, [System.Text.Encoding]::UTF8)
        $cat = [System.Text.RegularExpressions.Regex]::Replace($cat, 'alt="Auto Clicker by Max v[^"]+ Preview"', "alt=""$acTitle Preview""")
        $cat = [System.Text.RegularExpressions.Regex]::Replace($cat, '(?<=<h3\s+class=["'']product-card-title["'']\s+data-i18n=["'']productsCatalog\.autoclicker\.title["'']>)[^<]+', $acTitle)
        $cat = [System.Text.RegularExpressions.Regex]::Replace($cat, 'title="Tải về Auto Clicker by Max v[^"]+ \(\.exe\)"', "title=""Tải về $acTitle (.exe)""")
        $cat = [System.Text.RegularExpressions.Regex]::Replace($cat, 'aria-label="Tải về Auto Clicker by Max v[^"]+"', "aria-label=""Tải về $acTitle""")
        [System.IO.File]::WriteAllText($catHtmlPath, $cat, $utf8NoBom)
        Write-Host "    [OK] products.html synced" -ForegroundColor Green
    }

    # 1.5 products-i18n.js (catalog i18n)
    $catI18nPath = Join-Path $projectRoot 'products-i18n.js'
    if (Test-Path -LiteralPath $catI18nPath) {
        $catI18n = [System.IO.File]::ReadAllText($catI18nPath, [System.Text.Encoding]::UTF8)
        $catI18n = [System.Text.RegularExpressions.Regex]::Replace($catI18n, "title:\s*'Auto Clicker by Max v[^']+'", "title: '$acTitle'")
        $catI18n = [System.Text.RegularExpressions.Regex]::Replace($catI18n, "downloadTitle:\s*'Tải về Auto Clicker by Max v[^']+'", "downloadTitle: 'Tải về $acTitle (.exe)'")
        $catI18n = [System.Text.RegularExpressions.Regex]::Replace($catI18n, "downloadAria:\s*'Tải về Auto Clicker by Max v[^']+'", "downloadAria: 'Tải về $acTitle'")
        $catI18n = [System.Text.RegularExpressions.Regex]::Replace($catI18n, "downloadTitle:\s*'Download Auto Clicker by Max v[^']+'", "downloadTitle: 'Download $acTitle (.exe)'")
        $catI18n = [System.Text.RegularExpressions.Regex]::Replace($catI18n, "downloadAria:\s*'Download Auto Clicker by Max v[^']+'", "downloadAria: 'Download $acTitle'")
        [System.IO.File]::WriteAllText($catI18nPath, $catI18n, $utf8NoBom)
        Write-Host "    [OK] products-i18n.js synced" -ForegroundColor Green
    }
}

# -----------------------------------------------------------------------------
# 2. BOOK FORGE SYNC
# -----------------------------------------------------------------------------
if ($data.'book-forge') {
    $bfName = $data.'book-forge'.name
    $bfVer = $data.'book-forge'.version
    Write-Host "`n[*] Processing 'book-forge' -> Version: $bfVer" -ForegroundColor Yellow

    # products/book-forge.html
    $bfHtmlPath = Join-Path $projectRoot 'products\book-forge.html'
    if (Test-Path -LiteralPath $bfHtmlPath) {
        $html = [System.IO.File]::ReadAllText($bfHtmlPath, [System.Text.Encoding]::UTF8)
        $html = [System.Text.RegularExpressions.Regex]::Replace($html, '(?<=<meta\s+name=["'']app-latest-version["'']\s+content=["''])[^"'']+', $bfVer)
        [System.IO.File]::WriteAllText($bfHtmlPath, $html, $utf8NoBom)
        Write-Host "    [OK] products/book-forge.html synced" -ForegroundColor Green
    }
}

Write-Host "`n[SUCCESS] All product versions and UI titles synchronized flawlessly!`n" -ForegroundColor Cyan

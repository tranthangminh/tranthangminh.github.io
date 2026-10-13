# ================================================================
# ADOBE ULTIMATE BLOCKER - POWERSHELL ENGINE
# ================================================================

# Tu dong kiem tra va yeu cau quyen Administrator (UAC)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Dang yeu cau quyen Administrator (UAC)..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

function Show-Menu {
    Clear-Host
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "         CONG CU CHAN KET NOI ADOBE TRIET DE (FIX POPUP)        " -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  [1] CHAN TRIET DE (Tat App + Xoa Cache + Firewall + Hosts + AGS)" -ForegroundColor Green
    Write-Host "  [2] Chi chan qua Windows Defender Firewall (Quet tat ca file .exe)"
    Write-Host "  [3] Chi cap nhat danh sach chan Domain qua File Hosts"
    Write-Host "  [4] Chi xoa bo nho dem ban quyen (SLCache & SLStore)"
    Write-Host "  [5] GO CHAN (Xoa tat ca Firewall rules & khoi phuc file Hosts)"
    Write-Host "  [6] Thoat"
    Write-Host "================================================================" -ForegroundColor Cyan
}

function Kill-AdobeProcesses {
    Write-Host "`n[*] Dang tat tat ca tien trinh Adobe de giai phong cache..." -ForegroundColor Cyan
    $procNames = @("Illustrator", "Photoshop", "Adobe*", "CCXProcess", "AGSService", "AdobeGCClient", "node", "CoreSync", "Acrobat")
    Get-Process | Where-Object { 
        $currName = $_.Name
        $procNames | Where-Object { $currName -like $_ }
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "[+] Da tat toan bo tien trinh Adobe!" -ForegroundColor Green
}

function Clear-AdobeCache {
    Write-Host "`n[*] Dang xoa bo nho dem ban quyen loi (SLCache & SLStore)..." -ForegroundColor Cyan
    $cachePaths = @(
        "${env:ProgramFiles(x86)}\Common Files\Adobe\SLCache",
        "$env:ProgramData\Adobe\SLStore"
    )
    foreach ($path in $cachePaths) {
        if (Test-Path $path) {
            Remove-Item "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  [+] Da xoa sach cache tai: $path" -ForegroundColor Green
        }
    }
}

function Add-FirewallRules {
    Write-Host "`n[*] Dang quet toan bo file .exe cua Adobe..." -ForegroundColor Cyan
    $targetDirs = @(
        "$env:ProgramFiles\Adobe",
        "${env:ProgramFiles(x86)}\Adobe",
        "$env:ProgramFiles\Common Files\Adobe",
        "${env:ProgramFiles(x86)}\Common Files\Adobe",
        "$env:ProgramData\Adobe",
        "$env:LocalAppData\Adobe",
        "$env:AppData\Adobe",
        "D:\Adobe",
        "D:\Program Files\Adobe"
    )

    $exeFiles = @()
    foreach ($dir in $targetDirs) {
        if (Test-Path $dir) {
            Write-Host "  [-] Quet thu muc: $dir" -ForegroundColor DarkGray
            $exeFiles += Get-ChildItem -Path $dir -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue
        }
    }

    $exeFiles = $exeFiles | Sort-Object FullName -Unique

    Write-Host "`n[*] Dang xoa cac rule Adobe cu de tranh trung lap..." -ForegroundColor Cyan
    Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "AdobeBlock*" } | Remove-NetFirewallRule -ErrorAction SilentlyContinue

    Write-Host "[*] Dang tao quy tac chan INBOUND va OUTBOUND cho $($exeFiles.Count) file .exe..." -ForegroundColor Cyan
    $count = 0
    foreach ($file in $exeFiles) {
        $outName = "AdobeBlock_OUT_" + $file.Name
        $inName  = "AdobeBlock_IN_" + $file.Name

        New-NetFirewallRule -DisplayName $outName -Direction Outbound -Program $file.FullName -Action Block -Profile Any -ErrorAction SilentlyContinue | Out-Null
        New-NetFirewallRule -DisplayName $inName  -Direction Inbound  -Program $file.FullName -Action Block -Profile Any -ErrorAction SilentlyContinue | Out-Null
        $count++
        Write-Host "  [x] Da chan: $($file.Name)" -ForegroundColor Yellow
    }
    Write-Host "`n[+] HOAN TAT! Da chan thanh cong $count file .exe trong Windows Firewall!" -ForegroundColor Green
}

function Update-HostsFile {
    Write-Host "`n[*] Dang cap nhat danh sach ten mien chan trong file HOSTS..." -ForegroundColor Cyan
    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    
    # Bo ReadOnly neu co
    if ((Get-Item $hostsPath).IsReadOnly) {
        Set-ItemProperty -Path $hostsPath -Name IsReadOnly -Value $false
    }

    # Sao luu hosts.bak
    if (-not (Test-Path "$hostsPath.bak")) {
        Copy-Item $hostsPath "$hostsPath.bak" -Force
        Write-Host "  [*] Da tao ban sao luu hosts.bak" -ForegroundColor DarkGray
    }

    $domains = @(
        "adobe.io",
        "cc-api-data.adobe.io",
        "cc-api-data-stage.adobe.io",
        "cctypekit.adobe.io",
        "ic.adobe.io",
        "1hzopx6rh7.adobe.io",
        "p13n.adobe.io",
        "da.adobe.io",
        "lcs-cops.adobe.io",
        "lcs-robs.adobe.io",
        "lcs-cpc.adobe.io",
        "lmlicenses.wip4.adobe.com",
        "lm.licenses.adobe.com",
        "activate.adobe.com",
        "practivate.adobe.com",
        "practivate-da1.adobe.com",
        "lm-prd-da1.licenses.adobe.com",
        "licenses.adobe.com",
        "license.adobe.com",
        "genuine.adobe.com",
        "prod.adobegenuine.com",
        "genuine-na.adobe.com",
        "c5.pat.adobegenuine.com",
        "assets.adobegenuine.com",
        "na1r.services.adobe.com",
        "hlrcv.stage.adobe.com",
        "uds.licenses.adobe.com",
        "licensing.adobe.com",
        "adobeid-na1.services.adobe.com",
        "3dns.adobe.com",
        "adobe-dns.adobe.com",
        "adobe-dns-2.adobe.com",
        "adobe-dns-3.adobe.com",
        "ereg.adobe.com",
        "activate-sea.adobe.com",
        "wwis-dubc1.adobe.com",
        "activate-sjc1.adobe.com",
        "adobe.activate.com",
        "adobestats.io"
    )

    $currentContent = Get-Content -Path $hostsPath -Raw -ErrorAction SilentlyContinue
    $newEntries = @()
    foreach ($d in $domains) {
        if ($currentContent -notmatch [regex]::Escape($d)) {
            $newEntries += "0.0.0.0 $d"
        }
    }

    if ($newEntries.Count -gt 0) {
        Add-Content -Path $hostsPath -Value ($newEntries -join "`r`n")
        Write-Host "  [+] Da them $($newEntries.Count) domain Adobe vao file hosts!" -ForegroundColor Green
    } else {
        Write-Host "  [+] File hosts da chua day du cac domain can chan." -ForegroundColor Green
    }

    Clear-DnsClientCache
    Write-Host "  [+] Da xoa cache DNS thanh cong!" -ForegroundColor Green
}

function Disable-AdobeServices {
    Write-Host "`n[*] Dang tat cac Service va Task chay ngam..." -ForegroundColor Cyan
    Get-Service -Name "AGSService", "AdobeARMservice", "AdobeUpdateService" -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Service $_ -Force -ErrorAction SilentlyContinue
        Set-Service $_ -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Host "  [+] Da vo hieu hoa service: $($_.Name)" -ForegroundColor Green
    }
    Get-ScheduledTask -TaskPath "\Adobe*" -ErrorAction SilentlyContinue | Disable-ScheduledTask -ErrorAction SilentlyContinue | Out-Null
    Get-ScheduledTask -TaskName "Adobe*" -ErrorAction SilentlyContinue | Disable-ScheduledTask -ErrorAction SilentlyContinue | Out-Null
    Write-Host "[+] Da vo hieu hoa cac Scheduled Tasks!" -ForegroundColor Green
}

function Remove-AllBlocks {
    Write-Host "`n[*] Dang xoa cac quy tac chan trong Windows Firewall..." -ForegroundColor Cyan
    Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "AdobeBlock*" } | Remove-NetFirewallRule -ErrorAction SilentlyContinue
    Write-Host "  [+] Da xoa sach toan bo rule Firewall cua Adobe!" -ForegroundColor Green

    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    if (Test-Path "$hostsPath.bak") {
        Copy-Item "$hostsPath.bak" $hostsPath -Force
        Write-Host "  [+] Da phuc hoi file hosts ve ban goc tu hosts.bak!" -ForegroundColor Green
    } else {
        $cleanLines = (Get-Content -Path $hostsPath) | Where-Object { $_ -notmatch "adobe" }
        Set-Content -Path $hostsPath -Value $cleanLines
        Write-Host "  [+] Da xoa cac dong lien quan toi Adobe trong hosts!" -ForegroundColor Green
    }
    Clear-DnsClientCache
}

# Vong lap Menu
do {
    Show-Menu
    $choice = Read-Host "Nhap lua chon cua ban (1-6)"
    switch ($choice) {
        "1" {
            Kill-AdobeProcesses
            Clear-AdobeCache
            Add-FirewallRules
            Update-HostsFile
            Disable-AdobeServices
            Write-Host "`n================================================================" -ForegroundColor Cyan
            Write-Host "        DA CHAN TRIET DE 100%! VUI LONG DOC HUONG DAN:        " -ForegroundColor Yellow
            Write-Host " 1. Mo 2. GenP-v4.2.1.exe -> Bam 'Search' -> Bam 'Patch' neu can. " -ForegroundColor Cyan
            Write-Host " 2. Mo lai Illustrator -> Popup da duoc go bo hoan toan.        " -ForegroundColor Green
            Write-Host "================================================================" -ForegroundColor Cyan
            Pause
        }
        "2" {
            Kill-AdobeProcesses
            Add-FirewallRules
            Pause
        }
        "3" {
            Update-HostsFile
            Pause
        }
        "4" {
            Kill-AdobeProcesses
            Clear-AdobeCache
            Write-Host "`n[+] Da xoa cache ban quyen xong! Hay mo GenP patch lai roi mo app." -ForegroundColor Green
            Pause
        }
        "5" {
            Remove-AllBlocks
            Pause
        }
        "6" {
            exit
        }
    }
} while ($choice -ne "6")

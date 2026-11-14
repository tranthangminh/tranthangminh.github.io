# ================================================================
# ADOBE ULTIMATE UNBLOCKER - POWERSHELL ENGINE
# ================================================================

# Tu dong kiem tra va yeu cau quyen Administrator (UAC)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Dang yeu cau quyen Administrator (UAC)..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$blockScriptPath = Join-Path $PSScriptRoot "1. Big-Red_Block_Internet.ps1"

function Show-Menu {
    Clear-Host
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "             CONG CU GO CHAN KET NOI MANG ADOBE                 " -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  [1] GO CHAN TOAN DIEN (File goc CC + Firewall + Hosts + Services + Tasks)" -ForegroundColor Green
    Write-Host "  [2] Chi xoa cac quy tac trong Windows Defender Firewall"
    Write-Host "  [3] Chi go chan Domain trong file Hosts"
    Write-Host "  [4] Chi bat lai Services & Scheduled Tasks cua Adobe"
    Write-Host "  [5] Khoi phuc file goc Creative Cloud (sua loi cai app bi 'Waiting')"
    Write-Host "  [6] Thoat"
    Write-Host "================================================================" -ForegroundColor Cyan
}

function Remove-FirewallRules {
    Write-Host "`n[*] Dang quet va xoa cac quy tac Adobe trong Windows Firewall..." -ForegroundColor Cyan
    $rules = Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "AdobeBlock*" }
    $count = ($rules | Measure-Object).Count

    if ($count -gt 0) {
        $rules | Remove-NetFirewallRule -ErrorAction SilentlyContinue
        Write-Host "  [+] Da xoa thanh cong $count quy tac (Rules) trong Windows Firewall!" -ForegroundColor Green
    } else {
        Write-Host "  [+] Khong tim thay quy tac nao mang ten 'AdobeBlock' can xoa." -ForegroundColor DarkGray
    }
}

# Doc danh sach domain tu script Block de khong phai chep lai 237 dong
function Get-BlockedDomains {
    if (-not (Test-Path $blockScriptPath)) { return @() }
    $source = Get-Content -Path $blockScriptPath -Raw
    $listMatch = [regex]::Match($source, '\$domains\s*=\s*@\(([\s\S]*?)\)')
    if (-not $listMatch.Success) { return @() }
    return [regex]::Matches($listMatch.Groups[1].Value, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value.ToLower() }
}

function Restore-HostsFile {
    Write-Host "`n[*] Dang go chan Domain trong file Hosts..." -ForegroundColor Cyan
    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"

    if (-not (Test-Path $hostsPath)) {
        Write-Host "  [!] Khong tim thay file hosts tai: $hostsPath" -ForegroundColor Red
        return
    }

    try {
        # Bo ReadOnly neu co
        if ((Get-Item $hostsPath).IsReadOnly) {
            Set-ItemProperty -Path $hostsPath -Name IsReadOnly -Value $false -ErrorAction Stop
        }

        $domains = Get-BlockedDomains
        if ($domains.Count -gt 0) {
            # Chi xoa dung cac dong "0.0.0.0 <domain>" do script Block them vao, giu nguyen phan con lai
            $domainSet = New-Object 'System.Collections.Generic.HashSet[string]' -ArgumentList (,[string[]]$domains)
            $lines = @(Get-Content -Path $hostsPath -ErrorAction Stop)
            $cleanLines = $lines | Where-Object {
                -not ($_ -match '^\s*0\.0\.0\.0\s+(\S+)\s*$' -and $domainSet.Contains($Matches[1].ToLower()))
            }
            $removed = $lines.Count - @($cleanLines).Count
            Set-Content -Path $hostsPath -Value $cleanLines -ErrorAction Stop
            Write-Host "  [+] Da xoa $removed dong chan Domain khoi file hosts!" -ForegroundColor Green

            # Lam moi hosts.bak bang ban sach de lan chan sau khong phai dung ban sao luu cu
            Copy-Item $hostsPath "$hostsPath.bak" -Force -ErrorAction Stop
            Write-Host "  [+] Da cap nhat ban sao luu hosts.bak theo file hosts hien tai." -ForegroundColor DarkGray
        } elseif (Test-Path "$hostsPath.bak") {
            Copy-Item "$hostsPath.bak" $hostsPath -Force -ErrorAction Stop
            Write-Host "  [!] Khong doc duoc danh sach Domain tu: $blockScriptPath" -ForegroundColor Yellow
            Write-Host "  [+] Da khoi phuc file hosts tu ban sao luu: hosts.bak" -ForegroundColor Green
        } else {
            $lines = Get-Content -Path $hostsPath -ErrorAction Stop
            $cleanLines = $lines | Where-Object { $_ -notmatch "(?i)adobe" }
            Set-Content -Path $hostsPath -Value $cleanLines -ErrorAction Stop
            Write-Host "  [!] Khong doc duoc danh sach Domain va khong co hosts.bak." -ForegroundColor Yellow
            Write-Host "  [+] Da loai bo cac dong chua 'adobe' khoi file hosts!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [!] Khong ghi duoc file hosts: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  [!] Kiem tra phan mem diet virus co dang khoa file hosts khong, roi chay lai." -ForegroundColor Yellow
        return
    }

    Clear-DnsClientCache
    Write-Host "  [+] Da xoa cache DNS he thong thanh cong!" -ForegroundColor Green
}

function Enable-AdobeServices {
    Write-Host "`n[*] Dang bat lai cac Service Adobe (Automatic + Running)..." -ForegroundColor Cyan
    # Ban UnBlock cu chi dua service ve Manual va khong chay lai, nen khong chi xu ly service dang Disabled.
    # Creative Cloud can AdobeUpdateService (ElevationManager) dang chay moi cai/cap nhat duoc app.
    Get-Service -Name "AGSService", "AdobeARMservice", "AdobeUpdateService" -ErrorAction SilentlyContinue | ForEach-Object {
        $svcName = $_.Name
        try {
            if ($_.StartType -ne "Automatic") {
                Set-Service -Name $svcName -StartupType Automatic -ErrorAction Stop
            }
            if ($_.Status -ne "Running") {
                Start-Service -Name $svcName -ErrorAction Stop
            }
            Write-Host "  [+] Service '$svcName': Automatic, dang chay." -ForegroundColor Green
        } catch {
            Write-Host "  [!] Loi service '$svcName': $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Write-Host "`n[*] Dang bat lai cac Scheduled Tasks cua Adobe..." -ForegroundColor Cyan
    $tasks = @(Get-ScheduledTask -TaskPath "\Adobe*" -ErrorAction SilentlyContinue) + @(Get-ScheduledTask -TaskName "Adobe*" -ErrorAction SilentlyContinue)
    # Mot task co the khop ca 2 bo loc tren, nen loc trung theo TaskPath + TaskName
    $tasks = $tasks | Where-Object { $_ -and $_.State -eq "Disabled" } | Sort-Object { $_.TaskPath + $_.TaskName } -Unique
    $count = 0
    foreach ($task in $tasks) {
        try {
            Enable-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction Stop | Out-Null
            $count++
        } catch {
            Write-Host "  [!] Khong bat lai duoc task '$($task.TaskName)': $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host "  [+] Da bat lai $count Scheduled Task!" -ForegroundColor Green
}

# File Creative Cloud bi patch se hong chu ky, Adobe Installer tu choi ket noi nen cai app bi treo "Waiting"
function Restore-CreativeCloudFiles {
    param(
        [string[]]$Roots = @(
            "${env:ProgramFiles(x86)}\Common Files\Adobe\Adobe Desktop Common",
            "$env:ProgramFiles\Adobe\Adobe Creative Cloud"
        )
    )
    Write-Host "`n[*] Dang tim file Creative Cloud bi sua (co ban .bak goc)..." -ForegroundColor Cyan

    # Chi khoi phuc khi file hien tai hong chu ky VA ban .bak co chu ky hop le
    $pairs = @(foreach ($root in $Roots) {
        if (-not (Test-Path $root)) { continue }
        Get-ChildItem -Path $root -Filter "*.bak" -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            $target = $_.FullName.Substring(0, $_.FullName.Length - 4)
            if ((Test-Path $target) -and
                (Get-AuthenticodeSignature $target).Status -ne "Valid" -and
                (Get-AuthenticodeSignature $_.FullName).Status -eq "Valid") {
                [pscustomobject]@{ Backup = $_.FullName; Target = $target }
            }
        }
    })

    if ($pairs.Count -eq 0) {
        Write-Host "  [+] Khong co file Creative Cloud nao can khoi phuc." -ForegroundColor DarkGray
        return
    }

    # Tat Creative Cloud de giai phong file, giu lai AdobeUpdateService vi CC can no dang chay de cai app
    Write-Host "[*] Dang tat Creative Cloud de giai phong file..." -ForegroundColor Cyan
    Get-Process | Where-Object {
        $procPath = $_.Path
        $_.Name -ne "AdobeUpdateService" -and $procPath -and ($Roots | Where-Object { $procPath -like "$_\*" })
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    $count = 0
    foreach ($pair in $pairs) {
        try {
            Copy-Item $pair.Backup $pair.Target -Force -ErrorAction Stop
            $count++
            Write-Host "  [+] Da khoi phuc: $($pair.Target)" -ForegroundColor Green
        } catch {
            Write-Host "  [!] Khong khoi phuc duoc: $($pair.Target) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host "[+] Da khoi phuc $count/$($pairs.Count) file. Hay mo lai Creative Cloud." -ForegroundColor Green
}

# Vong lap Menu
do {
    Show-Menu
    $choice = Read-Host "Nhap lua chon cua ban (1-6)"
    switch ($choice) {
        "1" {
            Restore-CreativeCloudFiles
            Remove-FirewallRules
            Restore-HostsFile
            Enable-AdobeServices
            Write-Host "`n================================================================" -ForegroundColor Cyan
            Write-Host "               DA GO CHAN ADOBE TOAN DIEN 100%!                " -ForegroundColor Green
            Write-Host " Cac ung dung Adobe hien tai da co the ket noi mang binh thuong. " -ForegroundColor Yellow
            Write-Host " Hay mo lai Creative Cloud de cai / cap nhat app.                " -ForegroundColor Yellow
            Write-Host "================================================================" -ForegroundColor Cyan
            Pause
        }
        "2" {
            Remove-FirewallRules
            Pause
        }
        "3" {
            Restore-HostsFile
            Pause
        }
        "4" {
            Enable-AdobeServices
            Pause
        }
        "5" {
            Restore-CreativeCloudFiles
            Pause
        }
        "6" {
            exit
        }
    }
} while ($choice -ne "6")

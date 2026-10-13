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

function Show-Menu {
    Clear-Host
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "             CONG CU GO CHAN KET NOI MANG ADOBE                 " -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  [1] GO CHAN TOAN DIEN (Xoa Firewall + Khoi phuc Hosts + Services)" -ForegroundColor Green
    Write-Host "  [2] Chi xoa cac quy tac trong Windows Defender Firewall"
    Write-Host "  [3] Chi khoi phuc file Hosts ve ban goc (Bo chan Domain)"
    Write-Host "  [4] Thoat"
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

function Restore-HostsFile {
    Write-Host "`n[*] Dang khoi phuc file Hosts he thong..." -ForegroundColor Cyan
    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"

    if (Test-Path $hostsPath) {
        # Bo ReadOnly neu co
        if ((Get-Item $hostsPath).IsReadOnly) {
            Set-ItemProperty -Path $hostsPath -Name IsReadOnly -Value $false
        }

        # Neu co ban sao luu hosts.bak thi khoi phuc tu ban do
        if (Test-Path "$hostsPath.bak") {
            Copy-Item "$hostsPath.bak" $hostsPath -Force
            Write-Host "  [+] Da khoi phuc thanh cong tu ban sao luu: hosts.bak" -ForegroundColor Green
        } else {
            # Neu khong co ban sao luu thi loc bo cac dong chua 'adobe'
            $lines = Get-Content -Path $hostsPath -ErrorAction SilentlyContinue
            $cleanLines = $lines | Where-Object { $_ -notmatch "(?i)adobe" }
            Set-Content -Path $hostsPath -Value $cleanLines
            Write-Host "  [+] Da loai bo cac dong chan Adobe khoi file hosts!" -ForegroundColor Green
        }

        Clear-DnsClientCache
        Write-Host "  [+] Da xoa cache DNS he thong thanh cong!" -ForegroundColor Green
    } else {
        Write-Host "  [!] Khong tim thay file hosts tai: $hostsPath" -ForegroundColor Red
    }
}

function Enable-AdobeServices {
    Write-Host "`n[*] Dang khoi phuc trang thai cac Service Adobe..." -ForegroundColor Cyan
    $services = @("AdobeARMservice", "AdobeUpdateService")
    foreach ($s in $services) {
        $svc = Get-Service -Name $s -ErrorAction SilentlyContinue
        if ($svc) {
            Set-Service -Name $s -StartupType Manual -ErrorAction SilentlyContinue
            Write-Host "  [+] Da chuyen service '$s' ve che do Manual." -ForegroundColor Green
        }
    }
}

# Vong lap Menu
do {
    Show-Menu
    $choice = Read-Host "Nhap lua chon cua ban (1-4)"
    switch ($choice) {
        "1" {
            Remove-FirewallRules
            Restore-HostsFile
            Enable-AdobeServices
            Write-Host "`n================================================================" -ForegroundColor Cyan
            Write-Host "               DA GO CHAN ADOBE TOAN DIEN 100%!                " -ForegroundColor Green
            Write-Host " Cac ung dung Adobe hien tai da co the ket noi mang binh thuong. " -ForegroundColor Yellow
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
            exit
        }
    }
} while ($choice -ne "4")

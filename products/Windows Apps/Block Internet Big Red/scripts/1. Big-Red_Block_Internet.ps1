# ================================================================
# BIG RED ULTIMATE BLOCKER - POWERSHELL ENGINE
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
    Write-Host "      CONG CU CHAN KET NOI BIG RED TRIET DE (FIX POPUP)         " -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  [1] CHAN TRIET DE (Tat App + Xoa Cache + Firewall + Hosts + AGS)" -ForegroundColor Green
    Write-Host "  [2] Chi chan qua Windows Defender Firewall (Quet tat ca file .exe)"
    Write-Host "  [3] Chi cap nhat danh sach chan Domain qua File Hosts (237 Domains)"
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
        "$env:ProgramData\Adobe\SLStore",
        "$env:LocalAppData\Adobe\OOBE\opcart"
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
    Write-Host "`n[*] Dang cap nhat danh sach 237 ten mien chan trong file HOSTS..." -ForegroundColor Cyan
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
        "0bj2epfqn1.adobestats.io",
        "0mo5a70cqa.adobe.io",
        "0n8wirm0nv.adobestats.io",
        "0ojupfm51u.adobe.io",
        "124hzdrtoi.adobestats.io",
        "17ov1u3gio.adobestats.io",
        "17vpu0xkm6.adobestats.io",
        "1ei1f4k9yk.adobestats.io",
        "1hzopx6rh7.adobe.io",
        "1ngcws40i2.adobestats.io",
        "1qwiekvkux.adobestats.io",
        "1tw2l9x7xb.adobestats.io",
        "1unk1rv07w.adobestats.io",
        "1xuyy0mk2p.adobestats.io",
        "220zxtbjjl.adobestats.io",
        "22gda3bxkb.adobe.io",
        "23ynjitwt5.adobe.io",
        "2621x1nzeq.adobestats.io",
        "28t4psttw7.adobestats.io",
        "2dhh9vsp39.adobestats.io",
        "2eiuxr4ky7.adobestats.io",
        "2ftem87osk.adobe.io",
        "2o3c6rbyfr.adobestats.io",
        "2qj10f8rdg.adobestats.io",
        "2qjz50z5lf.adobestats.io",
        "31q40256l4.adobestats.io",
        "34modi5s5d.adobestats.io",
        "34u96h6rvn.adobestats.io",
        "3aqshzqv3w.adobestats.io",
        "3ca52znvmj.adobe.io",
        "3d3wqt96ht.adobe.io",
        "3d5vic7so2.adobestats.io",
        "3dns.adobe.com",
        "3jq65qgxeh.adobestats.io",
        "3odrrlydxt.adobestats.io",
        "3u6k9as4bj.adobestats.io",
        "3uyby7kphu.adobestats.io",
        "3xuuprv9lg.adobestats.io",
        "41yq116gxd.adobestats.io",
        "44qnmxgtif.adobestats.io",
        "4dviy9tb3o.adobestats.io",
        "4fmzz4au8r.adobestats.io",
        "50sxgwgngu.adobestats.io",
        "54cu4v5twu.adobestats.io",
        "561r5c3bz1.adobestats.io",
        "5ky0dijg73.adobestats.io",
        "5m62o8ud26.adobestats.io",
        "69rxfbohle.adobestats.io",
        "6eidhihhci.adobestats.io",
        "6j0onv1tde.adobestats.io",
        "7g2gzgk9g1.adobe.io",
        "7l4xxjhvkt.adobestats.io",
        "7m31guub0q.adobe.io",
        "7sj9n87sls.adobe.io",
        "85n85uoa1h.adobestats.io",
        "8ncdzpmmrg.adobe.io",
        "99pfl4vazm.adobestats.io",
        "9iay914wzy.adobestats.io",
        "9uffo0j6wj.adobestats.io",
        "a1815.dscr.akamai.net",
        "a1y2b7wsna.adobestats.io",
        "activate.adobe.com",
        "activate-sea.adobe.com",
        "activate-sjc1.adobe.com",
        "adobe.activate.com",
        "adobe.io",
        "adobe-dns.adobe.com",
        "adobe-dns-2.adobe.com",
        "adobe-dns-3.adobe.com",
        "adobeid-na1.services.adobe.com",
        "adobestats.io",
        "agxqobl83f.adobestats.io",
        "aoorovjtha.adobe.io",
        "assets.adobegenuine.com",
        "bk7y1gneyk.adobestats.io",
        "bs2yhuojzm.adobestats.io",
        "c5.pat.adobegenuine.com",
        "cc-api-data.adobe.com",
        "cc-api-data.adobe.io",
        "cc-api-data-stage.adobe.io",
        "cctypekit.adobe.io",
        "cd536oo20y.adobe.io",
        "cr2fouxnpm.adobestats.io",
        "curbpindd3.adobestats.io",
        "cv218qmzox6.prod.cloud.adobe.io",
        "cv24b15c1z0.prod.cloud.adobe.io",
        "cv24v41zibm.prod.cloud.adobe.io",
        "cv256ds6c99.prod.cloud.adobe.io",
        "cv2b0yc07ls.prod.cloud.adobe.io",
        "cv2bqhsp36w.prod.cloud.adobe.io",
        "cv2fcqvzl1r.prod.cloud.adobe.io",
        "cv2l4573ukh.prod.cloud.adobe.io",
        "cv2nn9r0j2r.prod.cloud.adobe.io",
        "cv2ska86hnt.prod.cloud.adobe.io",
        "cv2ys4tjt9x.prod.cloud.adobe.io",
        "cv2yt8sqmh0.prod.cloud.adobe.io",
        "cv2zp87w2eo.prod.cloud.adobe.io",
        "da.adobe.io",
        "dfnm3epsb7.adobestats.io",
        "dx0nvmv4hz.adobestats.io",
        "dxyeyf6ecy.adobe.io",
        "dyv9axahup.adobestats.io",
        "eftcpaiu36.adobestats.io",
        "eq7dbze88m.adobestats.io",
        "ereg.adobe.com",
        "esx6aswt5e.adobestats.io",
        "eyiu19jd5w.adobestats.io",
        "ffs3xik41x.adobestats.io",
        "fgh5v09kcn.adobe.io",
        "fqaq3pq1o9.adobe.io",
        "g3y09mbaam.adobestats.io",
        "g9cli80sqp.adobestats.io",
        "genuine.adobe.com",
        "genuine-na.adobe.com",
        "gocart-web-prod-ue1-alb-1461435473.us-east-1.elb.amazonaws.com",
        "guzg78logz.adobe.io",
        "helpexamples.com",
        "hjs70w1pdi.adobestats.io",
        "hlrcv.stage.adobe.com",
        "hwfqhlenbg.adobestats.io",
        "i2x2ius9o5.adobestats.io",
        "i7pq6fgbsl.adobe.io",
        "ic.adobe.io",
        "ij0gdyrfka.adobe.io",
        "ims-na1.adobelogin.com.cdn.cloudflare.net",
        "iv218qmzox6.prod.cloud.adobe.io",
        "iv24b15c1z0.prod.cloud.adobe.io",
        "iv24v41zibm.prod.cloud.adobe.io",
        "iv256ds6c99.prod.cloud.adobe.io",
        "iv2b0yc07ls.prod.cloud.adobe.io",
        "iv2bqhsp36w.prod.cloud.adobe.io",
        "iv2fcqvzl1r.prod.cloud.adobe.io",
        "iv2l4573ukh.prod.cloud.adobe.io",
        "iv2nn9r0j2r.prod.cloud.adobe.io",
        "iv2ska86hnt.prod.cloud.adobe.io",
        "iv2ys4tjt9x.prod.cloud.adobe.io",
        "iv2yt8sqmh0.prod.cloud.adobe.io",
        "iv2zp87w2eo.prod.cloud.adobe.io",
        "ivbnpthtl2.adobe.io",
        "jaircqa037.adobestats.io",
        "jc95y2v12r.adobe.io",
        "je5ufnklzs.adobestats.io",
        "jmx50quqz0.adobestats.io",
        "jsxfc5yij1.adobestats.io",
        "kgj0gsg3cf.adobestats.io",
        "klw4np5a1x.adobestats.io",
        "kwi5n2ruax.adobestats.io",
        "l558s6jwzy.adobestats.io",
        "lcs-cops.adobe.io",
        "lcs-cpc.adobe.io",
        "lcs-robs.adobe.io",
        "license.adobe.com",
        "licenses.adobe.com",
        "licensing.adobe.com",
        "lm.licenses.adobe.com",
        "lmlicenses.wip4.adobe.com",
        "lm-prd-da1.licenses.adobe.com",
        "lnwbupw1s7.adobestats.io",
        "lre1kgz2u4.adobe.io",
        "lz2x4rks1u.adobestats.io",
        "m59b4msyph.adobe.io",
        "m59cps6x3n.adobestats.io",
        "mpsige2va9.adobestats.io",
        "n746qg9j4i.adobestats.io",
        "na1r.services.adobe.com",
        "nh8wam2qd9.adobestats.io",
        "nhc73ypmli.adobestats.io",
        "o1383653.ingest.sentry.io",
        "o987771.ingest.us.sentry.io",
        "oxiz2n3i4v.adobestats.io",
        "p0bjuoe16a.adobe.io",
        "p13n.adobe.io",
        "p50zgina3e.adobestats.io",
        "p7uxzbht8h.adobe.io",
        "pc6sk9bygv.adobestats.io",
        "ph0f2h2csf.adobe.io",
        "pljm140ld1.adobestats.io",
        "pojvrj7ho5.adobe.io",
        "ppn4fq68w7.adobestats.io",
        "practivate.adobe.com",
        "practivate-da1.adobe.com",
        "prod.adobegenuine.com",
        "pv218qmzox6.prod.cloud.adobe.io",
        "pv24b15c1z0.prod.cloud.adobe.io",
        "pv24v41zibm.prod.cloud.adobe.io",
        "pv256ds6c99.prod.cloud.adobe.io",
        "pv2b0yc07ls.prod.cloud.adobe.io",
        "pv2bqhsp36w.prod.cloud.adobe.io",
        "pv2fcqvzl1r.prod.cloud.adobe.io",
        "pv2l4573ukh.prod.cloud.adobe.io",
        "pv2nn9r0j2r.prod.cloud.adobe.io",
        "pv2ska86hnt.prod.cloud.adobe.io",
        "pv2ys4tjt9x.prod.cloud.adobe.io",
        "pv2yt8sqmh0.prod.cloud.adobe.io",
        "pv2zp87w2eo.prod.cloud.adobe.io",
        "q9hjwppxeq.adobestats.io",
        "r3zj0yju1q.adobe.io",
        "r5hacgq5w6.adobe.io",
        "r9r6oomgms.adobestats.io",
        "rb0u8l34kr.adobestats.io",
        "rj669kv2lc.adobestats.io",
        "rm3xrk61n1.adobestats.io",
        "rmnia8d0tr.adobestats.io",
        "skg7pqn0al.adobestats.io",
        "ssrtnxk6uq6x.sf7e3.adobestats.io",
        "t9phy8ywkd.adobestats.io",
        "u31z50xvp9.adobestats.io",
        "uds.licenses.adobe.com",
        "uf0onoepoe.adobestats.io",
        "ujqx8lhpz4.adobestats.io",
        "ura7zj55r9.adobestats.io",
        "v62vpzg2av.adobestats.io",
        "vajcbj9qgq.adobe.io",
        "vcorzsld2a.adobe.io",
        "vfsjlgw02v.adobestats.io",
        "vgetwxoqno.adobe.io",
        "vicsj37lhf.adobestats.io",
        "vrz9w7o7yv.adobestats.io",
        "wcxqmuxd4z.adobestats.io",
        "wtl71c0ylo.adobestats.io",
        "wwis-dubc1.adobe.com",
        "x0850n5e.1q9cz.adobestats.io",
        "x880ulw3h0.adobestats.io",
        "xbd20b9wqa.adobestats.io",
        "xesnl0ss94.adobestats.io",
        "y2r8jzsv4p.adobestats.io",
        "yb6j6g0r1n.adobestats.io",
        "yj8yx3y8zo.adobestats.io",
        "yri0bsu0ak.adobestats.io",
        "yshuhythub.adobestats.io",
        "yuzuoqo0il.adobestats.io",
        "zekdqanici.adobestats.io",
        "zmg3v61bbr.adobestats.io",
        "zr60t8ia88.adobestats.io",
        "zrao5tdh1t.adobestats.io",
        "zrbzvc9mel.adobestats.io",
        "zu8yy3jkaz.adobestats.io"
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
        Write-Host "  [+] Da them $($newEntries.Count) domain Adobe moi vao file hosts!" -ForegroundColor Green
    } else {
        Write-Host "  [+] File hosts da chua day du tat ca 237 domain can chan." -ForegroundColor Green
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
            Write-Host " 2. Neu app hien 'Subscription suspended', hay Dang xuat (Sign  " -ForegroundColor Yellow
            Write-Host "    Out) tai khoan Adobe tren app hoac Creative Cloud.          " -ForegroundColor Yellow
            Write-Host " 3. Mo lai app -> Su dung binh thuong 100%!                    " -ForegroundColor Green
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

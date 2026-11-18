<#
Runs the Auto Clicker tests. See README.md.

  .\run-tests.ps1 -Group ui            one group (ui, popup, engine, storage, target, common)
  .\run-tests.ps1 -Group ui,popup      several groups
  .\run-tests.ps1 -Changed             the groups for the files changed in git
  .\run-tests.ps1 -All                 everything (before a commit or a release)
  .\run-tests.ps1 -Tool PageShot       a tool: PageShot, RepeatClick, Speed, BrowserFocus
  -NoMouse                             skip the suites that move the real mouse
#>
param(
    [string[]]$Group = @(),
    [switch]$All,
    [switch]$Changed,
    [string]$Tool = "",
    [switch]$NoMouse
)

$ErrorActionPreference = 'Continue'
$tests = $PSScriptRoot
$appDir = Split-Path $tests -Parent
$src = Join-Path $appDir "src_Auto Clicker by Max"
$exe = Join-Path (Split-Path $appDir -Parent) "Auto Clicker by Max.exe"
$out = Join-Path $tests "out"
$shared = Join-Path $out "shared"
$csc = "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$allGroups = 'ui', 'popup', 'engine', 'storage', 'target', 'common'

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }

# ---------- build and compile only when something changed ----------
function Ensure-App {
    $newest = Get-ChildItem $src -Recurse -File -Include *.cs, *.svg, *.ico, *.manifest | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not (Test-Path $exe) -or $newest.LastWriteTime -gt (Get-Item $exe).LastWriteTime) {
        Say "Building the app ($($newest.Name) is newer than the exe)..."
        $log = cmd /c "`"$appDir\build.bat`" < nul"
        if (-not ($log -match 'Successfully built')) { $log | Select-String ' error ' | Select-Object -First 10 | ForEach-Object { Say $_ Red }; throw "Build failed" }
    }
}

function Compile($source, $target, $kind, [string[]]$refs) {
    $needed = -not (Test-Path $target) -or (Get-Item $source).LastWriteTime -gt (Get-Item $target).LastWriteTime -or (Get-Item $exe).LastWriteTime -gt (Get-Item $target).LastWriteTime
    if (-not $needed) { return }
    $cargs = @('/nologo', "/target:$kind", '/platform:anycpu', '/codepage:65001', "/out:$target", '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll')
    foreach ($r in $refs) { $cargs += "/r:$r" }
    $cargs += $source
    $msg = & $csc @cargs | Where-Object { $_ -match 'error' }
    if ($msg) { $msg | Select-Object -First 10 | ForEach-Object { Say $_ Red }; throw "Cannot compile $source" }
}

# A private folder per suite with its own copy of the app and a neutral config, so no test sees the user's settings
function Prepare-Dir($name, [switch]$Config) {
    $dir = Join-Path $out $name
    New-Item -ItemType Directory -Force $dir | Out-Null
    Copy-Item $exe (Join-Path $dir "Auto Clicker by Max.exe") -Force
    if ($Config) {
        $data = Join-Path $dir "AutoClicker-Save&Load"
        if (Test-Path -LiteralPath $data) { Remove-Item -LiteralPath $data -Recurse -Force }
        New-Item -ItemType Directory -Force $data | Out-Null
        Copy-Item (Join-Path $tests "shared\sample-config.json") (Join-Path $data "_AutoClickerConfig.json")
    }
    return $dir
}

function Prepare-Shared {
    New-Item -ItemType Directory -Force $shared | Out-Null
    Compile (Join-Path $tests "shared\WinTarget.cs") (Join-Path $shared "WinTarget.exe") 'winexe' @()
    Get-ChildItem $shared -Filter *.clicks | Remove-Item -Force
}

function Stop-Leftovers { Get-Process WinTarget, StatusUi, RunUiCheck, DialogUi, TargetUi, FixTest -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue }

# ---------- reading results ----------
function Count-Results([string[]]$lines) {
    $text = $lines -join "`n"
    $m = [regex]::Match($text, 'pass=(\d+) fail=(\d+)')
    if ($m.Success) { return @([int]$m.Groups[1].Value, [int]$m.Groups[2].Value) }
    $pass = @($lines | Where-Object { $_ -like 'PASS*' }).Count
    $fail = @($lines | Where-Object { $_ -like 'FAIL*' }).Count
    return @($pass, $fail)
}

$results = New-Object System.Collections.Generic.List[object]
function Add-Result($group, $name, $lines, $seconds, [string[]]$problems) {
    $c = Count-Results $lines
    $pass = $c[0]; $fail = $c[1] + @($problems).Count
    if ($pass + $fail -eq 0) { $fail = 1; $problems = @('no result') }
    foreach ($l in ($lines | Where-Object { $_ -like 'FAIL*' })) { Say "  $l" Red }
    foreach ($p in $problems) { if ($p) { Say "  FAIL $p" Red } }
    $results.Add([pscustomobject]@{ Group = $group; Suite = $name; Pass = $pass; Fail = $fail; Seconds = [math]::Round($seconds) })
    Say ("{0,-8} {1,-22} {2,4} passed {3,3} failed  {4,4}s" -f $group, $name, $pass, $fail, [math]::Round($seconds)) $(if ($fail) { 'Red' } else { 'Green' })
}

# Console suite: output on stdout
function Run-Console($group, $name, $source, $argLine, $timeoutSec) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $dir = Prepare-Dir $name
    $bin = Join-Path $dir "$name.exe"
    Compile $source $bin 'exe' @((Join-Path $dir "Auto Clicker by Max.exe"))
    $p = Start-Process -FilePath $bin -ArgumentList $argLine -WorkingDirectory $dir -NoNewWindow -PassThru -RedirectStandardOutput "$dir\out.txt" -RedirectStandardError "$dir\err.txt"
    $problems = @()
    if (-not $p.WaitForExit($timeoutSec * 1000)) { $p.Kill(); $problems += "timed out after ${timeoutSec}s" }
    if ((Get-Content "$dir\err.txt" -Raw) -match 'Unhandled Exception') { $problems += 'unhandled exception: ' + ((Get-Content "$dir\err.txt" | Select-Object -First 1)) }
    Stop-Leftovers
    Add-Result $group $name (Get-Content "$dir\out.txt" -Encoding UTF8) $sw.Elapsed.TotalSeconds $problems
}

# Window suite: writes its own result file
# -KeepConfig: the suite reads the settings an earlier run of it saved (TargetUi reopen after full)
function Run-Window($group, $name, $source, $argLine, $resultFile, $timeoutSec, [switch]$Reference, [switch]$KeepConfig) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $dir = Prepare-Dir $name -Config:(-not $KeepConfig)
    $bin = Join-Path $dir "$name.exe"
    $refs = @(); if ($Reference) { $refs = @((Join-Path $dir "Auto Clicker by Max.exe")) }
    Compile $source $bin 'winexe' $refs
    $res = Join-Path $dir $resultFile
    Remove-Item $res -ErrorAction SilentlyContinue
    $p = Start-Process -FilePath $bin -ArgumentList ($argLine -f $dir, $shared) -WorkingDirectory $dir -PassThru
    $problems = @()
    if (-not $p.WaitForExit($timeoutSec * 1000)) { $p.Kill(); $problems += "timed out after ${timeoutSec}s" }
    Stop-Leftovers
    $lines = @(); if (Test-Path $res) { $lines = Get-Content $res -Encoding UTF8 }
    Add-Result $group $name $lines $sw.Elapsed.TotalSeconds $problems
}

# FixTest runs once per case; the cases are split across groups
function Run-Fix($group, [string[]]$cases) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $dir = Prepare-Dir "FixTest"
    $bin = Join-Path $dir "FixTest.exe"
    Compile (Join-Path $tests "audit\FixTest.cs") $bin 'exe' @((Join-Path $dir "Auto Clicker by Max.exe"))
    $lines = New-Object System.Collections.Generic.List[string]
    $problems = @()
    $runCase = {
        param($argLine, $sec)
        $p = Start-Process -FilePath $bin -ArgumentList $argLine -WorkingDirectory $dir -NoNewWindow -PassThru -RedirectStandardOutput "$dir\o.txt" -RedirectStandardError "$dir\e.txt"
        if (-not $p.WaitForExit($sec * 1000)) { $p.Kill(); $script:fixProblems += "timed out: $argLine" }
        foreach ($l in (Get-Content "$dir\o.txt" -Encoding UTF8)) { $lines.Add($l) }
        if ((Get-Content "$dir\e.txt" -Raw) -match 'Unhandled Exception') { $script:fixProblems += "unhandled exception: $argLine" }
    }
    $script:fixProblems = @()
    foreach ($c in $cases) {
        switch ($c) {
            'startup' {
                & $runCase 'prepare' 60
                $cfg = Join-Path $dir "AutoClicker-Save&Load\_AutoClickerConfig.json"
                $full = [IO.File]::ReadAllText($cfg); [IO.File]::WriteAllText($cfg, $full.Substring(0, [int]($full.Length / 2)))
                & $runCase 'startup' 60
            }
            'hotkeytaken' {
                & $runCase 'prepare' 60
                $h = Start-Process -FilePath $bin -ArgumentList "holdf7 12" -WorkingDirectory $dir -NoNewWindow -PassThru -RedirectStandardOutput "$dir\h.txt"
                Start-Sleep -Milliseconds 800
                & $runCase 'hotkeytaken' 60
                if (-not $h.WaitForExit(14000)) { $h.Kill() }
                foreach ($l in (Get-Content "$dir\h.txt" -Encoding UTF8)) { $lines.Add($l) }
            }
            { $_ -in 'area', 'jitter', 'interval' } { & $runCase "engine `"$shared`" $c" 60 }
            { $_ -like 'responsive-*' } { & $runCase 'prepare' 60; & $runCase "responsive `"$shared`" $($c.Substring(11))" 70 }
            'limits' { & $runCase 'limits' 60 }
            default { & $runCase 'prepare' 60; & $runCase $c 60 }
        }
    }
    Stop-Leftovers
    Add-Result $group "FixTest" $lines $sw.Elapsed.TotalSeconds $script:fixProblems
}

function Run-Jump {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $dir = Prepare-Dir "JumpTest"
    $bin = Join-Path $dir "JumpTest.exe"
    Compile (Join-Path $tests "engine\JumpTest.cs") $bin 'exe' @((Join-Path $dir "Auto Clicker by Max.exe"))
    $p = Start-Process -FilePath $bin -ArgumentList "`"$shared`"" -WorkingDirectory $dir -NoNewWindow -PassThru -RedirectStandardOutput "$dir\out.txt" -RedirectStandardError "$dir\err.txt"
    $problems = @()
    if (-not $p.WaitForExit(120000)) { $p.Kill(); $problems += 'timed out' }
    Stop-Leftovers
    # Every jump case must behave exactly like the recorded reference
    $got = @(Get-Content "$dir\out.txt"); $want = @(Get-Content (Join-Path $tests "shared\jump-expected.txt"))
    $lines = @()
    for ($i = 0; $i -lt $want.Count; $i++) { if ($i -lt $got.Count -and $got[$i] -eq $want[$i]) { $lines += "PASS $($want[$i])" } else { $lines += "FAIL expected '$($want[$i])' got '$(if ($i -lt $got.Count) { $got[$i] })'" } }
    Add-Result 'engine' 'JumpTest' $lines $sw.Elapsed.TotalSeconds $problems
}

function Run-BookForgeSmoke {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $dir = Join-Path $out "BookForgeSmoke"; New-Item -ItemType Directory -Force $dir | Out-Null
    $bfSrc = Join-Path (Split-Path $appDir -Parent) "Book Forge by Max\src_Book Forge by Max"
    $check = Join-Path $dir "BookForgeCheck.exe"
    $newest = Get-ChildItem $bfSrc -Recurse -Filter *.cs | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not (Test-Path $check) -or $newest.LastWriteTime -gt (Get-Item $check).LastWriteTime) {
        $wpf = "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\WPF"
        $msg = & $csc /nologo /target:winexe /platform:anycpu /codepage:65001 /lib:"$wpf" /r:UIAutomationClient.dll,UIAutomationTypes.dll,WindowsBase.dll "/out:$check" "/recurse:$bfSrc\*.cs" | Where-Object { $_ -match 'error' }
        if ($msg) { Add-Result 'common' 'BookForgeSmoke' @() $sw.Elapsed.TotalSeconds @("Book Forge does not compile: $($msg | Select-Object -First 1)"); return }
    }
    $bin = Join-Path $dir "BookForgeSmoke.exe"
    Compile (Join-Path $tests "common\BookForgeSmoke.cs") $bin 'exe' @($check)
    $p = Start-Process -FilePath $bin -ArgumentList "`"$dir`"" -WorkingDirectory $dir -NoNewWindow -PassThru -RedirectStandardOutput "$dir\out.txt" -RedirectStandardError "$dir\err.txt"
    $problems = @(); if (-not $p.WaitForExit(60000)) { $p.Kill(); $problems += 'timed out' }
    Add-Result 'common' 'BookForgeSmoke' (Get-Content "$dir\out.txt" -Encoding UTF8) $sw.Elapsed.TotalSeconds $problems
}

# ---------- groups ----------
$mouseSuites = 'DialogUi', 'TargetTest', 'TargetUi'
function Run-Group($g) {
    switch ($g) {
        'ui' {
            Run-Window 'ui' 'StatusUi' (Join-Path $tests "ui\StatusUi.cs") '"{0}" "{1}"' 'status_ui.txt' 120 -Reference
            Run-Window 'ui' 'RunUiCheck' (Join-Path $tests "ui\RunUiCheck.cs") '"{0}"' 'run_results.txt' 120
            Run-Fix 'ui' @('hotkeyfree', 'hotkeytaken')
        }
        'popup' {
            if ($NoMouse) { Say "popup    DialogUi skipped (-NoMouse)" Yellow; return }
            Run-Window 'popup' 'DialogUi' (Join-Path $tests "popup\DialogUi.cs") '"{0}" "{1}"' 'dialog_results.txt' 150 -Reference
        }
        'engine' {
            Run-Console 'engine' 'RunStatsTest' (Join-Path $tests "engine\RunStatsTest.cs") 'x' 120
            Run-Console 'engine' 'PressClickTest' (Join-Path $tests "engine\PressClickTest.cs") 'x' 120
            Run-Console 'engine' 'RecTest' (Join-Path $tests "engine\RecTest.cs") 'x' 60
            Run-Jump
            Run-Fix 'engine' @('area', 'jitter', 'interval', 'limits', 'responsive-missing', 'responsive-repeat', 'responsive-click', 'responsive-simple1ms')
        }
        'storage' { Run-Fix 'storage' @('held', 'heldstart', 'cut', 'cutnobak', 'empty', 'bignum', 'hugexy', 'savefail', 'startup') }
        'target' {
            if ($NoMouse) { Say "target   TargetTest and TargetUi skipped (-NoMouse)" Yellow; return }
            Run-Console 'target' 'TargetTest' (Join-Path $tests "target\TargetTest.cs") "`"$shared`"" 240
            Run-Window 'target' "TargetUi" (Join-Path $tests "target\TargetUi.cs") '"{0}" "{1}" full' "target_full.txt" 240 -Reference
            Run-Window 'target' "TargetUi" (Join-Path $tests "target\TargetUi.cs") '"{0}" "{1}" reopen' "target_reopen.txt" 120 -Reference -KeepConfig
        }
        'common' {
            Run-Console 'common' 'UrlTest' (Join-Path $tests "common\UrlTest.cs") 'x' 30
            Run-Console 'common' 'IconNames' (Join-Path $tests "common\IconNames.cs") 'x' 30
            Run-BookForgeSmoke
        }
        default { Say "Unknown group '$g'. Groups: $($allGroups -join ', ')" Red }
    }
}

# Which groups a changed file needs. Anything not listed, and anything in Common, runs everything.
function Groups-ForChanges {
    $git = Get-Command git -ErrorAction SilentlyContinue
    $gitExe = if ($git) { $git.Source } else { Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop" -Recurse -Filter git.exe -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\cmd\\git\.exe$' } | Select-Object -First 1 -ExpandProperty FullName }
    if (-not $gitExe) { Say "git not found: running everything" Yellow; return $allGroups }
    $files = & $gitExe -C $appDir status --porcelain -- . 2>$null | ForEach-Object { $_.Substring(3).Trim('"') }
    $set = New-Object System.Collections.Generic.HashSet[string]
    foreach ($f in $files) {
        $n = $f -replace '\\', '/'
        if ($n -notmatch '\.(cs|svg|ico|manifest)$' -and $n -notmatch '/tests/') { continue }
        if ($n -match '/tests/(ui|popup|engine|storage|target|common)/') { [void]$set.Add($Matches[1]); continue }
        if ($n -match '/tests/audit/') { 'ui', 'engine', 'storage' | ForEach-Object { [void]$set.Add($_) }; continue }
        if ($n -match '/tests/shared/') { return $allGroups }
        if ($n -match '/Common/') { return $allGroups }
        if ($n -match 'Dialog|Popup|MessageBox') { [void]$set.Add('popup'); [void]$set.Add('ui'); continue }
        if ($n -match '/(MainForm|UI_|Localization/|Simple/UI_|Advanced/UI_|Feature_MapOverlay|Feature_MoveAndScale)') { [void]$set.Add('ui'); continue }
        if ($n -match '/(Simple/Engine_|Advanced/Engine_|Advanced/Core_|Feature_ActionRecorder|Core_RecordedTextBuffer|Core_CancellableSleep|Core_SmoothMouseMove|Core_PixelSampler)') { [void]$set.Add('engine'); continue }
        if ($n -match '/(Storage_|Advanced/Storage_|Advanced/Model_)') { [void]$set.Add('storage'); [void]$set.Add('engine'); continue }
        if ($n -match '/(Core_NativeMethods|Core_Target|Core_FocusGuard|Feature_CoordinatePicker|SpecialApps/)') { [void]$set.Add('target'); [void]$set.Add('engine'); continue }
        return $allGroups
    }
    if ($set.Count -eq 0) { Say "No app or test file changed." Yellow }
    return @($allGroups | Where-Object { $set.Contains($_) })
}

# ---------- tools ----------
function Run-Tool($name) {
    switch ($name) {
        'PageShot' {
            $dir = Prepare-Dir 'PageShot'
            $data = Join-Path $dir "AutoClicker-Save&Load"; New-Item -ItemType Directory -Force $data | Out-Null
            Copy-Item (Join-Path $tests "tools\pageshot-config.json") (Join-Path $data "_AutoClickerConfig.json") -Force
            Copy-Item (Join-Path $tests "tools\pageshot-script.json") (Join-Path $dir "All Action.json") -Force
            $bin = Join-Path $dir "PageShot.exe"
            Compile (Join-Path $tests "tools\PageShot.cs") $bin 'exe' @()
            $p = Start-Process -FilePath $bin -WorkingDirectory $dir -NoNewWindow -PassThru -RedirectStandardOutput "$dir\out.txt"
            if (-not $p.WaitForExit(60000)) { $p.Kill(); Say "PageShot timed out" Red }
            Get-Content "$dir\out.txt"; Say "Pictures: $dir\shot_simple.png, $dir\shot_asian.png"
        }
        'RepeatClick' { Prepare-Shared; Run-Console 'tool' 'RepeatClick' (Join-Path $tests "tools\RepeatClick.cs") "`"$shared`" 60" 240 }
        'Speed' {
            Prepare-Shared
            $dir = Prepare-Dir 'SpeedTest'; $bin = Join-Path $dir "SpeedTest.exe"
            Compile (Join-Path $tests "tools\SpeedTest.cs") $bin 'exe' @((Join-Path $dir "Auto Clicker by Max.exe"))
            & $bin $shared; Stop-Leftovers
        }
        'BrowserFocus' {
            $dir = Prepare-Dir 'BrowserFocus'; $bin = Join-Path $dir "BrowserFocus.exe"
            Compile (Join-Path $tests "tools\BrowserFocus.cs") $bin 'exe' @((Join-Path $dir "Auto Clicker by Max.exe"))
            & $bin $dir
        }
        default { Say "Unknown tool '$name'. Tools: PageShot, RepeatClick, Speed, BrowserFocus" Red }
    }
}

# ---------- main ----------
$total = [Diagnostics.Stopwatch]::StartNew()
Ensure-App
if ($Tool) { Run-Tool $Tool; return }

$groups = if ($All) { $allGroups } elseif ($Changed) { @(Groups-ForChanges) } else { $Group }
if (-not $groups -or $groups.Count -eq 0) { Say "Nothing to run. Use -Group, -Changed or -All." Yellow; return }
if (-not $NoMouse -and (@($groups) | Where-Object { $_ -in 'popup', 'target' })) { Say "These groups move the real mouse and bring windows to the front. Do not use the computer until they finish." Yellow }
Say ("Groups: " + ($groups -join ', '))
Prepare-Shared
foreach ($g in $groups) { Run-Group $g }

$pass = ($results | Measure-Object Pass -Sum).Sum; $fail = ($results | Measure-Object Fail -Sum).Sum
Say ""
Say ("TOTAL {0} passed, {1} failed in {2}s" -f $pass, $fail, [math]::Round($total.Elapsed.TotalSeconds)) $(if ($fail) { 'Red' } else { 'Green' })
if ($fail) { exit 1 }

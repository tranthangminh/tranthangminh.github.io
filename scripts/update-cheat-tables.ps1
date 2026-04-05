param(
    [string]$CheatTableDirectory,
    [string]$OutputFile,
    [string]$ArtworkOutputFile,
    [string]$ToolsPageFile,
    [string]$RemovalListFile
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $CheatTableDirectory) {
    $CheatTableDirectory = Join-Path $projectRoot 'assets\My Cheat Tables'
}
if (-not $OutputFile) {
    $OutputFile = Join-Path $projectRoot 'js\data\cheat-table-files.js'
}
if (-not $ArtworkOutputFile) {
    $ArtworkOutputFile = Join-Path $projectRoot 'js\data\cheat-table-artwork.js'
}
if (-not $ToolsPageFile) {
    $ToolsPageFile = Join-Path $projectRoot 'tools\index.html'
}
if (-not $RemovalListFile) {
    $RemovalListFile = Join-Path $projectRoot 'remove-cheat-tables.txt'
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$steamAppDetailsCache = @{}
$steamSearchAliases = @{
    '[PROTOTYPE®].CT' = 'PROTOTYPE'
    'Left 4 Dead 2 - Direct3D 9.CT' = 'Left 4 Dead 2'
    'Home Sheep Home Farmageddon Party Edition.CT' = 'Home Sheep Home: Farmageddon Party Edition'
    'Kink Inc Steam.CT' = 'Kink.Inc'
    'Grand Theft Auto San Andreas – The Definitive Edition  .CT' = 'Grand Theft Auto San Andreas The Definitive Edition'
    'Need for Speed™ Most Wanted.CT' = 'Need for Speed Most Wanted'
}

function Escape-JavaScriptString {
    param([string]$Value)

    return ($Value -replace '\\', '\\' -replace "'", "\'")
}

function Normalize-SteamSearchText {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ''
    }

    $normalized = $Value.ToLowerInvariant().Trim()
    $normalized = $normalized -replace '\.[a-z0-9]+$', ''
    $normalized = $normalized -replace '[-–—_:]+', ' '
    $normalized = $normalized -replace '[\[\]\(\)!®™''".,]', ''
    $normalized = $normalized -replace '\bdirect3d\s*9\b', ''
    $normalized = $normalized -replace '\bsteam\b', ''
    $normalized = $normalized -replace '\s+', ' '
    return $normalized.Trim()
}

function Get-OverrideImageUrlFromText {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $trimmedValue = $Value.Trim()
    if ($trimmedValue -match '^(https?://\S+)$') {
        return $matches[1]
    }

    return $null
}

function Get-ExcludedCheatTableNames {
    param([string]$FilePath)

    $excludedNames = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)

    if (-not (Test-Path -LiteralPath $FilePath)) {
        return $excludedNames
    }

    $entries = [System.IO.File]::ReadAllLines($FilePath)
    foreach ($entry in $entries) {
        $trimmedEntry = [string]$entry
        if ([string]::IsNullOrWhiteSpace($trimmedEntry)) {
            continue
        }

        $trimmedEntry = $trimmedEntry.Trim()
        if ($trimmedEntry.StartsWith('#')) {
            continue
        }

        [void]$excludedNames.Add($trimmedEntry)

        if ($trimmedEntry -notmatch '\.[^.]+$') {
            [void]$excludedNames.Add($trimmedEntry + '.CT')
        }
    }

    return $excludedNames
}

function Get-CompanionSteamInfo {
    param(
        [System.IO.FileInfo]$CheatTableFile,
        [string]$DirectoryPath
    )

    if (-not $CheatTableFile -or -not (Test-Path -LiteralPath $DirectoryPath)) {
        return $null
    }

    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($CheatTableFile.Name)
    if ([string]::IsNullOrWhiteSpace($baseName)) {
        return $null
    }

    $escapedBaseName = [Regex]::Escape($baseName.Trim())
    $txtFiles = Get-ChildItem -LiteralPath $DirectoryPath -File -Filter *.txt

    foreach ($txtFile in $txtFiles) {
        $txtBaseName = [System.IO.Path]::GetFileNameWithoutExtension($txtFile.Name)

        if ($txtBaseName -match ('^' + $escapedBaseName + '\s*-\s*(\d+)$')) {
            $txtContent = ([System.IO.File]::ReadAllText($txtFile.FullName)).Trim()
            return @{
                HasCompanion = $true
                AppId = $matches[1]
                OverrideImageSrc = Get-OverrideImageUrlFromText -Value $txtContent
            }
        }

        if ($txtBaseName -match ('^' + $escapedBaseName + '\s*-\s*\[SteamAppId\]$')) {
            $txtContent = ([System.IO.File]::ReadAllText($txtFile.FullName)).Trim()
            return @{
                HasCompanion = $true
                AppId = $null
                OverrideImageSrc = Get-OverrideImageUrlFromText -Value $txtContent
            }
        }

        if ($txtBaseName -eq $baseName) {
            $content = ([System.IO.File]::ReadAllText($txtFile.FullName)).Trim()
            return @{
                HasCompanion = $true
                AppId = $null
                OverrideImageSrc = Get-OverrideImageUrlFromText -Value $content
            }
        }
    }

    return $null
}

function Get-SteamAppDetailsById {
    param([string]$AppId)

    if ([string]::IsNullOrWhiteSpace($AppId)) {
        return $null
    }

    if ($steamAppDetailsCache.ContainsKey($AppId)) {
        return $steamAppDetailsCache[$AppId]
    }

    try {
        $detailsUri = 'https://store.steampowered.com/api/appdetails?appids=' + [Uri]::EscapeDataString($AppId) + '&l=english&cc=US'
        $detailsResponse = Invoke-RestMethod -Uri $detailsUri -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
        $appProperty = $detailsResponse.PSObject.Properties[$AppId]

        if ($appProperty -and $appProperty.Value.success -and $appProperty.Value.data.name) {
            $details = @{
                Title = [string]$appProperty.Value.data.name
                CapsuleImage = if ($appProperty.Value.data.capsule_image) { [string]$appProperty.Value.data.capsule_image } else { $null }
                HeaderImage = if ($appProperty.Value.data.header_image) { [string]$appProperty.Value.data.header_image } else { $null }
            }
            $steamAppDetailsCache[$AppId] = $details
            return $details
        }
    } catch {
        return $null
    }

    return $null
}

function Resolve-SteamArtwork {
    param(
        [string]$FileName,
        [string]$AppId,
        [string]$OverrideImageSrc,
        [bool]$HasCompanion = $false
    )

    if (-not [string]::IsNullOrWhiteSpace($AppId)) {
        $resolvedDetails = Get-SteamAppDetailsById -AppId $AppId
        $resolvedTitle = if ($resolvedDetails) { $resolvedDetails.Title } else { $null }
        $resolvedImageSrc = if ($resolvedDetails) {
            if (-not [string]::IsNullOrWhiteSpace($resolvedDetails.CapsuleImage)) {
                $resolvedDetails.CapsuleImage
            } elseif (-not [string]::IsNullOrWhiteSpace($resolvedDetails.HeaderImage)) {
                $resolvedDetails.HeaderImage
            } else {
                $null
            }
        } else {
            $null
        }

        return @{
            title = if (-not [string]::IsNullOrWhiteSpace($resolvedTitle)) { $resolvedTitle } else { [System.IO.Path]::GetFileNameWithoutExtension($FileName).Trim() }
            imageSrc = if (-not [string]::IsNullOrWhiteSpace($OverrideImageSrc)) { $OverrideImageSrc } elseif (-not [string]::IsNullOrWhiteSpace($resolvedImageSrc)) { $resolvedImageSrc } else { 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/' + $AppId + '/capsule_231x87.jpg' }
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($OverrideImageSrc)) {
        return @{
            title = [System.IO.Path]::GetFileNameWithoutExtension($FileName).Trim()
            imageSrc = $OverrideImageSrc
        }
    }

    if ($HasCompanion) {
        return @{
            title = [System.IO.Path]::GetFileNameWithoutExtension($FileName).Trim()
            imageSrc = $null
        }
    }

    $searchQuery = if ($steamSearchAliases.ContainsKey($FileName)) {
        $steamSearchAliases[$FileName]
    } else {
        [System.IO.Path]::GetFileNameWithoutExtension($FileName).Trim()
    }

    if ([string]::IsNullOrWhiteSpace($searchQuery)) {
        return $null
    }

    try {
        $searchUri = 'https://store.steampowered.com/api/storesearch/?term=' + [Uri]::EscapeDataString($searchQuery) + '&l=english&cc=US'
        $response = Invoke-RestMethod -Uri $searchUri -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
        $items = @($response.items)
        if (-not $items.Count) {
            return $null
        }

        $normalizedQuery = Normalize-SteamSearchText $searchQuery
        $bestMatch = $null

        foreach ($item in $items) {
            $normalizedName = Normalize-SteamSearchText $item.name

            if ($normalizedName -eq $normalizedQuery) {
                $bestMatch = $item
                break
            }

            if (-not $bestMatch -and (
                $normalizedName.StartsWith($normalizedQuery) -or
                $normalizedQuery.StartsWith($normalizedName) -or
                $normalizedName.Contains($normalizedQuery) -or
                $normalizedQuery.Contains($normalizedName)
            )) {
                $bestMatch = $item
            }
        }

        if (-not $bestMatch -and $items.Count -eq 1) {
            $bestMatch = $items[0]
        }

        if (-not $bestMatch) {
            return $null
        }

        return @{
            title = [string]$bestMatch.name
            imageSrc = [string]$bestMatch.tiny_image
        }
    } catch {
        return $null
    }
}

if (-not (Test-Path -LiteralPath $CheatTableDirectory)) {
    throw "Cheat table directory not found: $CheatTableDirectory"
}

$outputDirectory = Split-Path -Parent $OutputFile
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$artworkOutputDirectory = Split-Path -Parent $ArtworkOutputFile
if (-not (Test-Path -LiteralPath $artworkOutputDirectory)) {
    New-Item -ItemType Directory -Path $artworkOutputDirectory -Force | Out-Null
}

$excludedCheatTables = Get-ExcludedCheatTableNames -FilePath $RemovalListFile

$allCheatTableFiles = Get-ChildItem -LiteralPath $CheatTableDirectory -File |
    Where-Object { $_.Extension -match '^(?i)\.ct$' }

$cheatTableFiles = $allCheatTableFiles |
    Where-Object {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        -not ($excludedCheatTables.Contains($_.Name) -or $excludedCheatTables.Contains($baseName))
    } |
    Sort-Object Name

$excludedFileCount = $allCheatTableFiles.Count - $cheatTableFiles.Count

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('window.cheatTableFiles = [')

for ($index = 0; $index -lt $cheatTableFiles.Count; $index += 1) {
    $file = $cheatTableFiles[$index]
    $suffix = if ($index -lt ($cheatTableFiles.Count - 1)) { ',' } else { '' }
    $lines.Add("    '$(Escape-JavaScriptString $file.Name)'$suffix")
}

$lines.Add('];')
$lines.Add('')

$content = [string]::Join([Environment]::NewLine, $lines)
[System.IO.File]::WriteAllText($OutputFile, $content, $utf8NoBom)

$artworkEntries = [System.Collections.Generic.List[string]]::new()
$companionMatches = 0
$companionFallbackMatches = 0
$autoSearchMatches = 0

foreach ($file in $cheatTableFiles) {
    $companionInfo = Get-CompanionSteamInfo -CheatTableFile $file -DirectoryPath $CheatTableDirectory
    $hasCompanion = if ($companionInfo) { [bool]$companionInfo.HasCompanion } else { $false }
    $companionAppId = if ($companionInfo) { $companionInfo.AppId } else { $null }
    $overrideImageSrc = if ($companionInfo) { $companionInfo.OverrideImageSrc } else { $null }

    $artwork = Resolve-SteamArtwork -FileName $file.Name -AppId $companionAppId -OverrideImageSrc $overrideImageSrc -HasCompanion:$hasCompanion
    if (-not $artwork) {
        continue
    }

    if ($companionAppId) {
        $companionMatches += 1
    } elseif ($hasCompanion) {
        $companionFallbackMatches += 1
    } else {
        $autoSearchMatches += 1
    }

    $artworkEntries.Add("    '$(Escape-JavaScriptString $file.Name)': { title: '$(Escape-JavaScriptString $artwork.title)', imageSrc: '$(Escape-JavaScriptString $artwork.imageSrc)' }")
}

$artworkLines = [System.Collections.Generic.List[string]]::new()
$artworkLines.Add('window.cheatTableArtworkManifest = {')

for ($index = 0; $index -lt $artworkEntries.Count; $index += 1) {
    $suffix = if ($index -lt ($artworkEntries.Count - 1)) { ',' } else { '' }
    $artworkLines.Add($artworkEntries[$index] + $suffix)
}

$artworkLines.Add('};')
$artworkLines.Add('')

$artworkContent = [string]::Join([Environment]::NewLine, $artworkLines)
[System.IO.File]::WriteAllText($ArtworkOutputFile, $artworkContent, $utf8NoBom)

if (Test-Path -LiteralPath $ToolsPageFile) {
    $toolsPageContent = [System.IO.File]::ReadAllText($ToolsPageFile)
    $versionStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $updatedToolsPageContent = [System.Text.RegularExpressions.Regex]::Replace(
        $toolsPageContent,
        'cheat-table-files\.js\?v=[^"]+',
        "cheat-table-files.js?v=$versionStamp"
    )
    $updatedToolsPageContent = [System.Text.RegularExpressions.Regex]::Replace(
        $updatedToolsPageContent,
        'cheat-table-artwork\.js\?v=[^"]+',
        "cheat-table-artwork.js?v=$versionStamp"
    )

    if ($updatedToolsPageContent -ne $toolsPageContent) {
        [System.IO.File]::WriteAllText($ToolsPageFile, $updatedToolsPageContent, $utf8NoBom)
    }
}

Write-Host "Updated cheat table manifest:" $OutputFile
Write-Host "Cheat tables found:" $cheatTableFiles.Count
Write-Host "Excluded by remove-cheat-tables.txt:" $excludedFileCount
Write-Host "Updated cheat table artwork manifest:" $ArtworkOutputFile
Write-Host "Steam artwork matches:" $artworkEntries.Count
Write-Host "Companion TXT matches:" $companionMatches
Write-Host "Companion TXT without ID:" $companionFallbackMatches
Write-Host "Auto search matches:" $autoSearchMatches

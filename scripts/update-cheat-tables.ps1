param(
    [string]$CheatTableDirectory,
    [string]$OutputFile,
    [string]$ArtworkOutputFile,
    [string]$ToolsPageFile,
    [string]$MetadataFile
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
    $ToolsPageFile = Join-Path $projectRoot 'tools.html'
}
if (-not $MetadataFile) {
    $MetadataFile = Join-Path $CheatTableDirectory '_ID.txt'
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$steamAppDetailsCache = @{}

function Escape-JavaScriptString {
    param([string]$Value)

    return ($Value -replace '\\', '\\' -replace "'", "\'")
}

function Normalize-CheatTableKey {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ''
    }

    $normalized = $Value.Trim()
    $normalized = $normalized -replace '(?i)\.ct$', ''
    return $normalized.Trim()
}

function Get-OverrideImageUrl {
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

function Get-CheatTableMetadataState {
    param([string]$FilePath)

    $entries = @{}
    $excludedNames = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $isRemoveSection = $false

    if (-not (Test-Path -LiteralPath $FilePath)) {
        return @{
            Entries = $entries
            ExcludedNames = $excludedNames
        }
    }

    $lines = [System.IO.File]::ReadAllLines($FilePath)
    foreach ($line in $lines) {
        $trimmedLine = [string]$line
        if ([string]::IsNullOrWhiteSpace($trimmedLine)) {
            continue
        }

        $trimmedLine = $trimmedLine.Trim()
        if ($trimmedLine -eq '==Remove List==') {
            $isRemoveSection = $true
            continue
        }

        if ($trimmedLine.StartsWith('#')) {
            continue
        }

        if ($isRemoveSection) {
            [void]$excludedNames.Add($trimmedLine)

            if ($trimmedLine -notmatch '\.[^.]+$') {
                [void]$excludedNames.Add($trimmedLine + '.CT')
            }

            continue
        }

        $parts = ([string]$line).Split([char]9)
        if (-not $parts.Length) {
            continue
        }

        $rawName = if ($parts.Length -ge 1) { [string]$parts[0] } else { '' }
        $rawAppId = if ($parts.Length -ge 2) { [string]$parts[1] } else { '' }
        $rawImageUrl = if ($parts.Length -ge 3) { [string]::Join("`t", $parts[2..($parts.Length - 1)]) } else { '' }

        $key = Normalize-CheatTableKey -Value $rawName
        if ([string]::IsNullOrWhiteSpace($key)) {
            continue
        }

        $entries[$key] = @{
            AppId = if ($rawAppId.Trim() -match '^\d+$') { $rawAppId.Trim() } else { $null }
            ImageSrc = Get-OverrideImageUrl -Value $rawImageUrl
        }
    }

    return @{
        Entries = $entries
        ExcludedNames = $excludedNames
    }
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

function Get-FallbackSteamCapsuleImageUrl {
    param([string]$AppId)

    if ([string]::IsNullOrWhiteSpace($AppId)) {
        return $null
    }

    return 'https://cdn.akamai.steamstatic.com/steam/apps/' + [Uri]::EscapeDataString($AppId) + '/capsule_231x87.jpg'
}

function Resolve-CheatTableDisplayData {
    param(
        [string]$FileName,
        [hashtable]$MetadataEntries
    )

    $baseName = Normalize-CheatTableKey -Value ([System.IO.Path]::GetFileNameWithoutExtension($FileName))
    $metadata = if ($MetadataEntries.ContainsKey($baseName)) { $MetadataEntries[$baseName] } else { $null }
    $appId = if ($metadata) { $metadata.AppId } else { $null }
    $overrideImageSrc = if ($metadata) { $metadata.ImageSrc } else { $null }

    if (-not [string]::IsNullOrWhiteSpace($appId)) {
        $steamDetails = Get-SteamAppDetailsById -AppId $appId
        $steamTitle = if ($steamDetails) { $steamDetails.Title } else { $null }
        $steamImage = if ($steamDetails) {
            if (-not [string]::IsNullOrWhiteSpace($steamDetails.CapsuleImage)) {
                $steamDetails.CapsuleImage
            } elseif (-not [string]::IsNullOrWhiteSpace($steamDetails.HeaderImage)) {
                $steamDetails.HeaderImage
            } else {
                $null
            }
        } else {
            $null
        }
        $fallbackSteamImage = Get-FallbackSteamCapsuleImageUrl -AppId $appId

        return @{
            Title = if (-not [string]::IsNullOrWhiteSpace($steamTitle)) { $steamTitle } else { $baseName }
            ImageSrc = if (-not [string]::IsNullOrWhiteSpace($overrideImageSrc)) {
                $overrideImageSrc
            } elseif (-not [string]::IsNullOrWhiteSpace($steamImage)) {
                $steamImage
            } else {
                $fallbackSteamImage
            }
            HasAppId = $true
            HasOverrideImage = -not [string]::IsNullOrWhiteSpace($overrideImageSrc)
        }
    }

    return @{
        Title = $baseName
        ImageSrc = $overrideImageSrc
        HasAppId = $false
        HasOverrideImage = -not [string]::IsNullOrWhiteSpace($overrideImageSrc)
    }
}

if (-not (Test-Path -LiteralPath $CheatTableDirectory)) {
    throw "Cheat table directory not found: $CheatTableDirectory"
}

if (-not (Test-Path -LiteralPath $MetadataFile)) {
    [System.IO.File]::WriteAllText($MetadataFile, '', $utf8NoBom)
}

$outputDirectory = Split-Path -Parent $OutputFile
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$artworkOutputDirectory = Split-Path -Parent $ArtworkOutputFile
if (-not (Test-Path -LiteralPath $artworkOutputDirectory)) {
    New-Item -ItemType Directory -Path $artworkOutputDirectory -Force | Out-Null
}

$metadataState = Get-CheatTableMetadataState -FilePath $MetadataFile
$excludedCheatTables = $metadataState.ExcludedNames
$metadataEntries = $metadataState.Entries

$allCheatTableFiles = Get-ChildItem -LiteralPath $CheatTableDirectory -File |
    Where-Object { $_.Extension -match '^(?i)\.ct$' }

$cheatTableFiles = $allCheatTableFiles |
    Where-Object {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        -not ($excludedCheatTables.Contains($_.Name) -or $excludedCheatTables.Contains($baseName))
    } |
    Sort-Object Name

$excludedFileCount = $allCheatTableFiles.Count - $cheatTableFiles.Count

$fileLines = [System.Collections.Generic.List[string]]::new()
$fileLines.Add('window.cheatTableFiles = [')

for ($index = 0; $index -lt $cheatTableFiles.Count; $index += 1) {
    $file = $cheatTableFiles[$index]
    $suffix = if ($index -lt ($cheatTableFiles.Count - 1)) { ',' } else { '' }
    $fileLines.Add("    '$(Escape-JavaScriptString $file.Name)'$suffix")
}

$fileLines.Add('];')
$fileLines.Add('')
[System.IO.File]::WriteAllText($OutputFile, ([string]::Join([Environment]::NewLine, $fileLines)), $utf8NoBom)

$artworkLines = [System.Collections.Generic.List[string]]::new()
$artworkLines.Add('window.cheatTableArtworkManifest = {')

$steamIdCount = 0
$overrideImageCount = 0
$metadataOnlyCount = 0

for ($index = 0; $index -lt $cheatTableFiles.Count; $index += 1) {
    $file = $cheatTableFiles[$index]
    $displayData = Resolve-CheatTableDisplayData -FileName $file.Name -MetadataEntries $metadataEntries
    $imageLiteral = if (-not [string]::IsNullOrWhiteSpace($displayData.ImageSrc)) { "'$(Escape-JavaScriptString $displayData.ImageSrc)'" } else { 'null' }
    $suffix = if ($index -lt ($cheatTableFiles.Count - 1)) { ',' } else { '' }

    if ($displayData.HasAppId) {
        $steamIdCount += 1
    }
    if ($displayData.HasOverrideImage) {
        $overrideImageCount += 1
    }
    if ((-not $displayData.HasAppId) -and (-not $displayData.HasOverrideImage)) {
        $metadataOnlyCount += 1
    }

    $artworkLines.Add("    '$(Escape-JavaScriptString $file.Name)': { title: '$(Escape-JavaScriptString $displayData.Title)', imageSrc: $imageLiteral }$suffix")
}

$artworkLines.Add('};')
$artworkLines.Add('')
[System.IO.File]::WriteAllText($ArtworkOutputFile, ([string]::Join([Environment]::NewLine, $artworkLines)), $utf8NoBom)

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
Write-Host "Excluded by _ID.txt remove list:" $excludedFileCount
Write-Host "Metadata file:" $MetadataFile
Write-Host "Entries using Steam ID:" $steamIdCount
Write-Host "Entries using custom image link:" $overrideImageCount
Write-Host "Entries using CT name only:" $metadataOnlyCount
Write-Host "Updated cheat table artwork manifest:" $ArtworkOutputFile

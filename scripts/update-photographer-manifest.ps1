param(
    [string]$ImageDirectory,
    [string]$OutputFile
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ImageDirectory) {
    $ImageDirectory = Join-Path $projectRoot 'assets\images\Photographer'
}
if (-not $OutputFile) {
    $OutputFile = Join-Path $projectRoot 'js\data\photographer-images.js'
}

$supportedExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')

function Convert-ToAltText {
    param([string]$Name)

    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($Name)
    if ([string]::IsNullOrWhiteSpace($baseName)) {
        return 'Ảnh nhiếp ảnh'
    }

    return 'Ảnh nhiếp ảnh ' + $baseName
}

function Escape-JavaScriptString {
    param([string]$Value)

    return ($Value -replace '\\', '\\' -replace "'", "\'")
}

if (-not (Test-Path -LiteralPath $ImageDirectory)) {
    throw "Image directory not found: $ImageDirectory"
}

$outputDirectory = Split-Path -Parent $OutputFile
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$imageFiles = Get-ChildItem -LiteralPath $ImageDirectory -File |
    Where-Object { $supportedExtensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('window.photographerImageManifest = [')

for ($index = 0; $index -lt $imageFiles.Count; $index += 1) {
    $file = $imageFiles[$index]
    $src = '../assets/images/Photographer/' + $file.Name
    $alt = Convert-ToAltText -Name $file.Name
    $suffix = if ($index -lt ($imageFiles.Count - 1)) { ',' } else { '' }
    $lines.Add("    { src: '$(Escape-JavaScriptString $src)', alt: '$(Escape-JavaScriptString $alt)' }$suffix")
}

$lines.Add('];')
$lines.Add('')

$content = [string]::Join([Environment]::NewLine, $lines)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputFile, $content, $utf8NoBom)

Write-Host "Updated manifest:" $OutputFile
Write-Host "Images found:" $imageFiles.Count

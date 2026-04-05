param(
    [string]$Images2DDirectory,
    [string]$Images3DDirectory,
    [string]$Output2DFile,
    [string]$Output3DFile
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $Images2DDirectory) {
    $Images2DDirectory = Join-Path $projectRoot 'assets\images\2D'
}
if (-not $Images3DDirectory) {
    $Images3DDirectory = Join-Path $projectRoot 'assets\images\3D'
}
if (-not $Output2DFile) {
    $Output2DFile = Join-Path $projectRoot 'js\data\artist-2d-images.js'
}
if (-not $Output3DFile) {
    $Output3DFile = Join-Path $projectRoot 'js\data\artist-3d-images.js'
}

$supportedExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')

function Escape-JavaScriptString {
    param([string]$Value)

    return ($Value -replace '\\', '\\' -replace "'", "\'")
}

function Write-ArtistManifest {
    param(
        [string]$ImageDirectory,
        [string]$OutputFile,
        [string]$ManifestVariable,
        [string]$FolderName
    )

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
    $lines.Add("window.$ManifestVariable = [")

    for ($index = 0; $index -lt $imageFiles.Count; $index += 1) {
        $file = $imageFiles[$index]
        $src = '../assets/images/' + $FolderName + '/' + $file.Name
        $suffix = if ($index -lt ($imageFiles.Count - 1)) { ',' } else { '' }
        $lines.Add("    { src: '$(Escape-JavaScriptString $src)' }$suffix")
    }

    $lines.Add('];')
    $lines.Add('')

    $content = [string]::Join([Environment]::NewLine, $lines)
    [System.IO.File]::WriteAllText($OutputFile, $content, [System.Text.Encoding]::UTF8)

    return $imageFiles.Count
}

$count2D = Write-ArtistManifest -ImageDirectory $Images2DDirectory -OutputFile $Output2DFile -ManifestVariable 'artist2dImageManifest' -FolderName '2D'
$count3D = Write-ArtistManifest -ImageDirectory $Images3DDirectory -OutputFile $Output3DFile -ManifestVariable 'artist3dImageManifest' -FolderName '3D'

Write-Host "Updated 2D manifest:" $Output2DFile
Write-Host "2D images found:" $count2D
Write-Host "Updated 3D manifest:" $Output3DFile
Write-Host "3D images found:" $count3D

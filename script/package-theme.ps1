param(
  [string]$OutputZipPath,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ZipEntryName {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BasePath,
    [Parameter(Mandatory = $true)]
    [string]$TargetPath
  )

  $baseFullPath = [System.IO.Path]::GetFullPath($BasePath).TrimEnd("\")
  $targetFullPath = [System.IO.Path]::GetFullPath($TargetPath)
  $baseUri = New-Object System.Uri("$baseFullPath\")
  $targetUri = New-Object System.Uri($targetFullPath)

  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString())
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$workspaceRoot = Split-Path -Parent $projectRoot
$packageJsonPath = Join-Path $projectRoot "package.json"
$distPath = Join-Path $projectRoot "dist"
$themeConfigPath = Join-Path $projectRoot "komari-theme.json"
$previewPath = Join-Path $projectRoot "preview.png"
$verifyScriptPath = Join-Path $PSScriptRoot "verify-theme-package.ps1"

$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$version = $packageJson.version

$npmCommand = @(
  (Get-Command npm.cmd -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
  "C:\Program Files\nodejs\npm.cmd"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $npmCommand) {
  throw "npm.cmd not found. Checked PATH and C:\\Program Files\\nodejs\\npm.cmd."
}

$nodeBinDir = Split-Path -Parent $npmCommand
if (-not ($env:PATH -split ";" | Where-Object { $_ -eq $nodeBinDir })) {
  $env:PATH = "$nodeBinDir;$env:PATH"
}

if ([string]::IsNullOrWhiteSpace($OutputZipPath)) {
  $OutputZipPath = Join-Path $workspaceRoot ("komari-nexus-theme-v{0}-local.zip" -f $version)
}

$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputZipPath)
$outputDir = Split-Path -Parent $resolvedOutputPath

if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

if (-not $SkipBuild) {
  Push-Location $projectRoot
  try {
    & $npmCommand run build
  }
  finally {
    Pop-Location
  }
}

foreach ($requiredPath in @($themeConfigPath, $previewPath, $distPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Required path not found: $requiredPath"
  }
}

$filesToPack = New-Object System.Collections.Generic.List[string]
$filesToPack.Add($themeConfigPath)
$filesToPack.Add($previewPath)

Get-ChildItem -LiteralPath $distPath -Recurse -File -Force |
  Where-Object { $_.Extension -ne ".zip" } |
  ForEach-Object { $filesToPack.Add($_.FullName) }

if (Test-Path -LiteralPath $resolvedOutputPath) {
  Remove-Item -LiteralPath $resolvedOutputPath -Force
}

$zipFileStream = [System.IO.File]::Open($resolvedOutputPath, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($zipFileStream, [System.IO.Compression.ZipArchiveMode]::Create)

try {
  foreach ($filePath in $filesToPack) {
    $entryName = (Get-ZipEntryName -BasePath $projectRoot -TargetPath $filePath).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $filePath,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
}
finally {
  $archive.Dispose()
  $zipFileStream.Dispose()
}

& $verifyScriptPath -ZipPath $resolvedOutputPath

Write-Host ""
Write-Host ("Created package: {0}" -f $resolvedOutputPath)

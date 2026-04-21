param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$resolvedZipPath = (Resolve-Path -LiteralPath $ZipPath).Path
$zip = [System.IO.Compression.ZipFile]::OpenRead($resolvedZipPath)

try {
  $entries = @($zip.Entries | Select-Object -ExpandProperty FullName)

  $checks = [ordered]@{
    "root:komari-theme.json" = [bool]($entries -contains "komari-theme.json")
    "root:preview.png" = [bool]($entries -contains "preview.png")
    "dist:index.html" = [bool]($entries -contains "dist/index.html")
    "dist:_next" = (($entries | Where-Object { $_ -like "dist/_next/*" }).Count -gt 0)
    "paths:forward-slash-only" = (($entries | Where-Object { $_ -like "*\*" }).Count -eq 0)
    "dist:no-nested-zip" = (($entries | Where-Object { $_ -like "dist/*.zip" }).Count -eq 0)
  }

  $failedChecks = @($checks.GetEnumerator() | Where-Object { -not $_.Value })

  Write-Host "Package verification: $resolvedZipPath"
  foreach ($check in $checks.GetEnumerator()) {
    $status = if ($check.Value) { "OK" } else { "FAIL" }
    Write-Host (" - {0}: {1}" -f $check.Key, $status)
  }

  if ($failedChecks.Count -gt 0) {
    throw ("Package verification failed: {0}" -f (($failedChecks | ForEach-Object { $_.Key }) -join ", "))
  }
}
finally {
  $zip.Dispose()
}

param(
  [Parameter(Mandatory=$true, ValueFromRemainingArguments=$true)]
  [string[]]$Files
)

foreach ($f in $Files) {
  if (-not (Test-Path $f)) { continue }
  $lines = Get-Content $f -Raw -Encoding UTF8 -ErrorAction SilentlyContinue -ReadCount 0
  # Remove block comments /* ... */ safely across lines
  $noBlock = [System.Text.RegularExpressions.Regex]::Replace($lines, "/\*[^*]*\*+(?:[^/*][^*]*\*+)*/", "", 'Singleline')
  # Remove single-line comments that start a line (ignores URLs)
  $processed = @()
  foreach ($line in $noBlock -split "`n") {
    if ($line -match "^\s*//") { continue }
    $processed += $line
  }
  $out = ($processed -join "`n").TrimEnd()
  Set-Content -Path $f -Value $out -Encoding UTF8
}

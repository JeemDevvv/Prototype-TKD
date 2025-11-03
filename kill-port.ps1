# PowerShell script to kill process on port 4000
Write-Host "Checking for processes on port 4000..."
$connections = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
$processes = $connections | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "Found process(es) using port 4000: $processes"
    foreach ($processId in $processes) {
        if ($processId -and $processId -ne 0) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "Process $processId killed successfully!"
            } catch {
                Write-Host "Failed to kill process $processId : $_"
            }
        }
    }
    Write-Host ""
    Write-Host "Port 4000 is now free. You can start your server."
    Start-Sleep -Milliseconds 500
} else {
    Write-Host "No process found on port 4000 - Port is free!"
}

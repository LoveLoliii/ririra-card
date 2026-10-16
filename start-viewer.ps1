$ErrorActionPreference = 'Stop'
$viewerRoot = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Please install Node.js 20 or newer, then reopen this launcher.' }
$viewerPort = if ($env:PORT) { $env:PORT } else { '8773' }
$viewerUrl = "http://127.0.0.1:$viewerPort/index-realtime.html"
$logDirectory = Join-Path $viewerRoot 'output'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$serverAvailable = $false
try { $serverAvailable = (Invoke-WebRequest $viewerUrl -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { }
if (-not $serverAvailable) {
    Start-Process -FilePath $nodeCommand.Source -ArgumentList 'scripts/serve_realtime.cjs' -WorkingDirectory $viewerRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log')
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try { $serverAvailable = (Invoke-WebRequest $viewerUrl -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200; if ($serverAvailable) { break } } catch { }
        Start-Sleep -Milliseconds 200
    }
    if (-not $serverAvailable) { throw 'Could not start viewer. See output/server-error.log.' }
}
Start-Process $viewerUrl

# run-worker.ps1 - roda o worker em background e grava logs em ./logs
$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$log = Join-Path $logDir "worker-$timestamp.log"

Start-Job -ScriptBlock {
  param($root, $logFile)
  Set-Location $root
  # Redireciona stdout/stderr para arquivo de log
  npx tsx src/infra/workers/notification.worker.ts *>&1 | Tee-Object -FilePath $logFile
} -ArgumentList $PSScriptRoot, $log | Out-Null

Write-Host "Worker iniciado em background. Logs: $log"
Get-Job

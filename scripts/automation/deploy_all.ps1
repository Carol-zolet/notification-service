param(
    [Parameter(Mandatory=$true)] [string]$FrontendUrl,
    [Parameter(Mandatory=$true)] [string]$ApiBaseUrl,
    [Parameter(Mandatory=$true)] [string]$Branch
)

# Wrapper: update Render FRONTEND_URL and trigger deploy, then update Vercel VITE_API_BASE_URL

Write-Host "Starting full deployment automation"

# Resolve script directory and call child scripts using full paths to avoid PowerShell parsing issues
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

$renderScript = Join-Path $scriptDir 'render_update_env_and_deploy.ps1'
Write-Host "Calling $renderScript"
& $renderScript -EnvName 'FRONTEND_URL' -EnvValue $FrontendUrl -Branch $Branch

$vercelScript = Join-Path $scriptDir 'vercel_update_env_and_deploy.ps1'
Write-Host "Calling $vercelScript"
& $vercelScript -EnvName 'VITE_API_BASE_URL' -EnvValue $ApiBaseUrl

Write-Host "Automation finished (check dashboards/logs for results)"

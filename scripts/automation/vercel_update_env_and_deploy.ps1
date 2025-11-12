param(
    [Parameter(Mandatory=$true)] [string]$EnvName,
    [Parameter(Mandatory=$true)] [string]$EnvValue
)

# This script attempts to add or update a Vercel project env var and trigger a redeploy.
# It prefers using the Vercel CLI if available; otherwise it will call the Vercel API.
# Requires: VERCEL_TOKEN and VERCEL_PROJECT_ID environment variables.

if (-not $env:VERCEL_TOKEN) { Write-Error "VERCEL_TOKEN not set"; exit 1 }
if (-not $env:VERCEL_PROJECT_ID) { Write-Error "VERCEL_PROJECT_ID not set"; exit 1 }

$token = $env:VERCEL_TOKEN
$projectId = $env:VERCEL_PROJECT_ID

function Use-VercelCLI {
    try {
        & vercel --version > $null 2>&1
        return $true
    } catch {
        return $false
    }
}

if (Use-VercelCLI) {
    Write-Host "Vercel CLI found — using CLI to manage env var and trigger deploy"
    # Add/update env var in production
    $cmdAdd = "vercel env add $EnvName production --token $token --confirm"
    Write-Host "Run: $cmdAdd"
    # Note: vercel env add will prompt for value; we pass via STDIN
    $process = Start-Process -FilePath vercel -ArgumentList @('env','add',$EnvName,'production','--token',$token,'--confirm') -NoNewWindow -PassThru -RedirectStandardInput 'pipe'
    $process.StandardInput.WriteLine($EnvValue)
    $process.StandardInput.Close()
    $process.WaitForExit()

    # Trigger a new deployment (production)
    Write-Host "Triggering Vercel production deployment..."
    & vercel --prod --token $token
    exit 0
}

Write-Host "Vercel CLI not found — using Vercel REST API"

$apiBase = 'https://api.vercel.com'

# 1) List env vars to find if existing
$listUrl = "$apiBase/v9/projects/$projectId/env"
try {
    $list = Invoke-RestMethod -Uri $listUrl -Headers @{ Authorization = "Bearer $token" } -Method GET
} catch {
    Write-Error "Failed to list Vercel env vars: $($_.Exception.Message)"; exit 1
}

$found = $list.envs | Where-Object { $_.key -eq $EnvName }
if ($found) {
    # Update
    $envId = $found.uid
    $patchUrl = "$apiBase/v9/projects/$projectId/env/$envId"
    $body = @{ value = $EnvValue; target = @('production') } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $patchUrl -Headers @{ Authorization = "Bearer $token"; 'Content-Type'='application/json' } -Method PATCH -Body $body
        Write-Host "Updated Vercel env var $EnvName"
    } catch {
        Write-Error "Failed to update Vercel env var: $($_.Exception.Message)"; exit 1
    }
} else {
    # Create
    $createUrl = "$apiBase/v9/projects/$projectId/env"
    $body = @{ key = $EnvName; value = $EnvValue; target = @('production'); type = 'encrypted' } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $createUrl -Headers @{ Authorization = "Bearer $token"; 'Content-Type'='application/json' } -Method POST -Body $body
        Write-Host "Created Vercel env var $EnvName"
    } catch {
        Write-Error "Failed to create Vercel env var: $($_.Exception.Message)"; exit 1
    }
}

# 2) Trigger a deployment by creating an empty deployment via the Deployments API (lightweight trigger)
# Note: Vercel's deployments API normally expects an upload; a simple workaround is to trigger a redeploy via the 'integrations/deployments' endpoint
$deployUrl = "$apiBase/v13/now/deployments?projectId=$projectId"
try {
    $resp = Invoke-RestMethod -Uri $deployUrl -Headers @{ Authorization = "Bearer $token" } -Method POST -Body '{}' -ContentType 'application/json'
    Write-Host "Triggered Vercel deployment: $($resp.url)"
} catch {
    Write-Warning "Could not trigger deployment via API (needs proper payload). Please run a redeploy in Vercel dashboard or install Vercel CLI and run vercel --prod"
}

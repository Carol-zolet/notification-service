param(
    [Parameter(Mandatory=$true)] [string]$Branch
)

# Simple script to trigger a manual deploy for a Render service
# Requires environment variables: RENDER_API_KEY and RENDER_SERVICE_ID

if (-not $env:RENDER_API_KEY) { Write-Error "RENDER_API_KEY not set"; exit 1 }
if (-not $env:RENDER_SERVICE_ID) { Write-Error "RENDER_SERVICE_ID not set"; exit 1 }

$apiKey = $env:RENDER_API_KEY
$serviceId = $env:RENDER_SERVICE_ID
$baseUrl = 'https://api.render.com/v1'

$deployUrl = "$baseUrl/services/$serviceId/deploys"
$deployBody = @{ branch = $Branch } | ConvertTo-Json

Write-Host "Triggering manual deploy for service $serviceId (branch: $Branch)"
try {
    $resp = Invoke-RestMethod -Uri $deployUrl -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' } -Method POST -Body $deployBody
    Write-Host "Deploy started: $($resp.id)"
    Write-Host "You can view logs at: https://dashboard.render.com/services/$serviceId/events/$($resp.id)"
} catch {
    $msg = "Failed to trigger deploy: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += "; Body: $($reader.ReadToEnd())" } catch {}
    }
    Write-Error $msg; exit 1
}

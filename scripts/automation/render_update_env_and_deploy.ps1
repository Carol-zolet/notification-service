param(
    [Parameter(Mandatory=$true)] [string]$EnvName,
    [Parameter(Mandatory=$true)] [string]$EnvValue,
    [Parameter(Mandatory=$true)] [string]$Branch
)

# Requires environment variables: RENDER_API_KEY, RENDER_SERVICE_ID
if (-not $env:RENDER_API_KEY) { Write-Error "RENDER_API_KEY not set"; exit 1 }
if (-not $env:RENDER_SERVICE_ID) { Write-Error "RENDER_SERVICE_ID not set"; exit 1 }

$apiKey = $env:RENDER_API_KEY.Trim()
$serviceId = $env:RENDER_SERVICE_ID.Trim()
$baseUrl = 'https://api.render.com/v1'

# Basic validation: Render API keys typically start with 'rnd_' (user keys) or similar
if ($apiKey.Length -lt 20) {
    Write-Warning "RENDER_API_KEY seems unusually short. Verify it's correct."
}

Write-Host "`n[Render Update] Service: $serviceId" -ForegroundColor Cyan
Write-Host "[Render Update] Env var: $EnvName" -ForegroundColor Cyan
# Mask value for security if it looks like a secret (contains 'password', 'key', 'secret', 'token')
$isSensitive = $EnvName -match '(password|secret|key|token|database_url)' -or $EnvValue.Length -gt 50
$displayValue = if ($isSensitive) { "$($EnvValue.Substring(0, [Math]::Min(15, $EnvValue.Length)))..." } else { $EnvValue }
Write-Host "[Render Update] Value (masked if sensitive): $displayValue" -ForegroundColor Cyan

# List existing env vars
$listUrl = "$baseUrl/services/$serviceId/env-vars"
Write-Host "[Render API] GET $listUrl" -ForegroundColor Gray
try {
    $existing = Invoke-RestMethod -Uri $listUrl -Headers @{ Authorization = "Bearer $apiKey" } -Method GET -ErrorAction Stop
    Write-Host "[Render API] ✓ Listed $($existing.Count) env vars" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $statusDesc = $_.Exception.Response.StatusDescription
    $msg = "Failed to list env vars: $($_.Exception.Message) | HTTP $status $statusDesc"
    if ($_.Exception.Response) {
        try {
            $respStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($respStream)
            $bodyText = $reader.ReadToEnd()
            $msg += "`nResponse body: $bodyText"
        } catch {}
    }
    Write-Error $msg
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "- Verify RENDER_API_KEY is correct (create new key in Render Dashboard → Account Settings → API Keys)" -ForegroundColor Yellow
    Write-Host "- Verify RENDER_SERVICE_ID is correct (format: srv-xxxxx)" -ForegroundColor Yellow
    exit 1
}

$found = $existing | Where-Object { $_.key -eq $EnvName }
if ($found) {
    # Update existing
    $envId = $found.id
    $patchUrl = "$baseUrl/services/$serviceId/env-vars/$envId"
    $body = @{ value = $EnvValue } | ConvertTo-Json -Depth 2
    Write-Host "[Render API] PATCH $patchUrl (updating existing env var)" -ForegroundColor Gray
    try {
        Invoke-RestMethod -Uri $patchUrl -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' } -Method PATCH -Body $body -ErrorAction Stop | Out-Null
        Write-Host "[Render API] ✓ Updated env var $EnvName" -ForegroundColor Green
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $msg = "Failed to update env var: $($_.Exception.Message) | HTTP $status"
        if ($_.Exception.Response) {
            try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += "`nBody: $($reader.ReadToEnd())" } catch {}
        }
        Write-Error $msg; exit 1
    }
} else {
    # Create new
    $createUrl = "$baseUrl/services/$serviceId/env-vars"
    $body = @{ key = $EnvName; value = $EnvValue } | ConvertTo-Json -Depth 2
    Write-Host "[Render API] POST $createUrl (creating new env var)" -ForegroundColor Gray
    try {
        Invoke-RestMethod -Uri $createUrl -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' } -Method POST -Body $body -ErrorAction Stop | Out-Null
        Write-Host "[Render API] ✓ Created env var $EnvName" -ForegroundColor Green
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $msg = "Failed to create env var: $($_.Exception.Message) | HTTP $status"
        if ($_.Exception.Response) {
            try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += "`nBody: $($reader.ReadToEnd())" } catch {}
        }
        Write-Error $msg; exit 1
    }
}

# Trigger manual deploy for branch
$deployUrl = "$baseUrl/services/$serviceId/deploys"
$deployBody = @{ branch = $Branch } | ConvertTo-Json -Depth 2
Write-Host "[Render API] POST $deployUrl (branch: $Branch)" -ForegroundColor Gray
try {
    $resp = Invoke-RestMethod -Uri $deployUrl -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' } -Method POST -Body $deployBody -ErrorAction Stop
    Write-Host "[Render API] ✓ Deploy triggered: $($resp.id)" -ForegroundColor Green
    Write-Host "[Render] Deploy URL: https://dashboard.render.com/web/$serviceId" -ForegroundColor Cyan
    Write-Host "[Render] Check Live Logs for deploy progress and errors.`n" -ForegroundColor Cyan
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $msg = "Failed to trigger deploy: $($_.Exception.Message) | HTTP $status"
    if ($_.Exception.Response) {
        try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += "`nBody: $($reader.ReadToEnd())" } catch {}
    }
    Write-Error $msg; exit 1
}

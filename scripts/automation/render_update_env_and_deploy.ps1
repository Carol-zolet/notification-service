param(
    [Parameter(Mandatory=$true)] [string]$EnvName,
    [Parameter(Mandatory=$true)] [string]$EnvValue,
    [Parameter(Mandatory=$true)] [string]$Branch
)

# Requires environment variables: RENDER_API_KEY, RENDER_SERVICE_ID
if (-not $env:RENDER_API_KEY) { Write-Error "RENDER_API_KEY not set"; exit 1 }
if (-not $env:RENDER_SERVICE_ID) { Write-Error "RENDER_SERVICE_ID not set"; exit 1 }

$apiKey = $env:RENDER_API_KEY
$serviceId = $env:RENDER_SERVICE_ID
$baseUrl = 'https://api.render.com/v1'

Write-Host "Updating Render env var '$EnvName' -> '$EnvValue' for service $serviceId"

# List existing env vars
$listUrl = "$baseUrl/services/$serviceId/env-vars"
try {
    $existing = Invoke-RestMethod -Uri $listUrl -Headers @{ Authorization = "Bearer $apiKey" } -Method GET
} catch {
    $msg = "Failed to list env vars: $($_.Exception.Message)"
    # If there's a response (HTTP error), try to show status code and body to help debug 401s
    if ($_.Exception.Response) {
        try {
            $respStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($respStream)
            $bodyText = $reader.ReadToEnd()
            $status = $_.Exception.Response.StatusCode
            $msg += "; HTTP Status: $status; Body: $bodyText"
        } catch {
            # ignore
        }
    }
    Write-Error $msg; exit 1
}

$found = $existing | Where-Object { $_.key -eq $EnvName }
if ($found) {
    # Update
    $envId = $found.id
    $patchUrl = "$baseUrl/services/$serviceId/env-vars/$envId"
    $body = @{ value = $EnvValue } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $patchUrl -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' } -Method PATCH -Body $body
        Write-Host "Updated env var $EnvName"
    } catch {
        $msg = "Failed to update env var: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += "; Body: $($reader.ReadToEnd())" } catch {}
        }
        Write-Error $msg; exit 1
    }
} else {
    # Create
    $createUrl = "$baseUrl/services/$serviceId/env-vars"
    $body = @{ key = $EnvName; value = $EnvValue; scope = 'env' } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $createUrl -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' } -Method POST -Body $body
        Write-Host "Created env var $EnvName"
    } catch {
        $msg = "Failed to create env var: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += "; Body: $($reader.ReadToEnd())" } catch {}
        }
        Write-Error $msg; exit 1
    }
}

# Trigger manual deploy for branch
$deployUrl = "$baseUrl/services/$serviceId/deploys"
$deployBody = @{ branch = $Branch } | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Uri $deployUrl -Headers @{ Authorization = "Bearer $apiKey"; 'Content-Type' = 'application/json' } -Method POST -Body $deployBody
    Write-Host "Deploy started: $($resp.id)"
} catch {
    $msg = "Failed to trigger deploy: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg += "; Body: $($reader.ReadToEnd())" } catch {}
    }
    Write-Error $msg; exit 1
}

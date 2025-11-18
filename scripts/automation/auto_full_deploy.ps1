<#
.SYNOPSIS
  Orquestra a atualizacao de variaveis e deploys no Render e Vercel.

.DESCRIPTION
  Script helper que solicita (ou le de env) as credenciais necessarias
  e executa em sequencia:
    - Atualiza FRONTEND_URL no Render e dispara um Manual Deploy da branch
    - Atualiza VITE_API_BASE_URL no Vercel e tenta disparar um redeploy

  O script chama os scripts existentes em ./scripts/automation:
    - render_update_env_and_deploy.ps1
    - vercel_update_env_and_deploy.ps1

  Importante: este script nao grava chaves em disco. Forneca as chaves
  via variaveis de ambiente ou cole quando solicitado.
#>

param(
    [Parameter(Mandatory=$false)] [string]$Branch = $env:BRANCH,
    [Parameter(Mandatory=$false)] [string]$FrontendUrl = $env:FRONTEND_URL,
    [Parameter(Mandatory=$false)] [string]$ApiBaseUrl = $env:API_BASE_URL
)

function Get-SecretValue {
    param([string]$EnvVarName)
    
    $envValue = Get-Item -Path "Env:$EnvVarName" -ErrorAction SilentlyContinue
    if ($envValue) { return $envValue.Value }
    
    Write-Host "Digite o valor para $EnvVarName (sera lido somente nesta sessao):" -ForegroundColor Yellow
    $secureVal = Read-Host -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureVal)
    $plainText = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    return $plainText
}

Write-Host "Auto full deploy - iniciando orquestracao" -ForegroundColor Cyan

# Gather Render credentials
if (-not $env:RENDER_API_KEY) {
    $env:RENDER_API_KEY = Get-SecretValue -EnvVarName 'RENDER_API_KEY'
}
if (-not $env:RENDER_SERVICE_ID) {
    Write-Host "Digite RENDER_SERVICE_ID (pode obter em Render > Service > Settings):" -ForegroundColor Yellow
    $env:RENDER_SERVICE_ID = Read-Host
}

# Gather Vercel credentials
if (-not $env:VERCEL_TOKEN) {
    $env:VERCEL_TOKEN = Get-SecretValue -EnvVarName 'VERCEL_TOKEN'
}
if (-not $env:VERCEL_PROJECT_ID) {
    Write-Host "Digite VERCEL_PROJECT_ID (obtenha em Vercel > Project Settings):" -ForegroundColor Yellow
    $env:VERCEL_PROJECT_ID = Read-Host
}

if (-not $Branch) {
    Write-Host "Branch nao fornecida. Qual branch deseja deployar? (ex: chore/health-deploy-readme)" -ForegroundColor Yellow
    $Branch = Read-Host
}
if (-not $FrontendUrl) {
    Write-Host "Qual e o FRONTEND_URL que deve ser configurado no Render? (ex: https://seu-front.vercel.app)" -ForegroundColor Yellow
    $FrontendUrl = Read-Host
}
if (-not $ApiBaseUrl) {
    Write-Host "Qual e o VITE_API_BASE_URL para o frontend? (ex: https://notification-service-rmnv.onrender.com/api/v1)" -ForegroundColor Yellow
    $ApiBaseUrl = Read-Host
}

Write-Host "Validando credenciais Render..." -ForegroundColor Cyan
try {
    $headers = @{ Authorization = "Bearer $env:RENDER_API_KEY" }
    $services = Invoke-RestMethod -Uri 'https://api.render.com/v1/services' -Headers $headers -Method GET -ErrorAction Stop
    Write-Host "Render: encontrado $($services.count) services (validacao OK)" -ForegroundColor Green
} catch {
    Write-Error "Falha ao validar Render API Key: $($_.Exception.Message)"
    exit 1
}

Write-Host "Validando credenciais Vercel..." -ForegroundColor Cyan
try {
    $vheaders = @{ Authorization = "Bearer $env:VERCEL_TOKEN" }
    $envList = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$($env:VERCEL_PROJECT_ID)/env" -Headers $vheaders -Method GET -ErrorAction Stop
    $envCount = if ($envList.envs) { $envList.envs.Count } else { 0 }
    Write-Host "Vercel: validacao OK ($envCount variaveis de ambiente encontradas)" -ForegroundColor Green
} catch {
    Write-Error "Falha ao validar Vercel token / project id: $($_.Exception.Message)"
    exit 1
}

# Resolve script directory and call child scripts
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$renderScript = Join-Path $scriptDir 'render_update_env_and_deploy.ps1'
$vercelScript = Join-Path $scriptDir 'vercel_update_env_and_deploy.ps1'

Write-Host "Executando Render env update + deploy (branch: $Branch)..." -ForegroundColor Cyan
& $renderScript -EnvName 'FRONTEND_URL' -EnvValue $FrontendUrl -Branch $Branch
if ($LASTEXITCODE -ne 0) { 
    Write-Error "render_update_env_and_deploy falhou"
    exit 1 
}

Write-Host "Executando Vercel env update + (tentativa de) redeploy..." -ForegroundColor Cyan
& $vercelScript -EnvName 'VITE_API_BASE_URL' -EnvValue $ApiBaseUrl
if ($LASTEXITCODE -ne 0) { 
    Write-Warning "vercel_update_env_and_deploy retornou erro (verifique dashboard)" 
}

Write-Host "Orquestracao finalizada. Verifique dashboards e Live Logs para confirmar sucesso." -ForegroundColor Green

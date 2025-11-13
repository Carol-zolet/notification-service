<#
.SYNOPSIS
  Gera uma nova senha para o usuário do banco e atualiza o DATABASE_URL no Render.

.DESCRIPTION
  Script semi-automático para rotacionar a senha do usuário Postgres referenciado em
  uma `DATABASE_URL` do tipo: postgresql://user:password@host:port/dbname

  Fluxo:
    - Recebe a DATABASE_URL atual (via env DATABASE_URL ou prompt seguro)
    - Gera uma nova senha forte
    - Tenta executar ALTER USER <user> WITH PASSWORD '<nova>' via `psql` (requer psql no PATH)
    - Se o psql falhar, imprime o SQL pronto para execução manual
    - Atualiza a variável `DATABASE_URL` no Render chamando o script existente
      `render_update_env_and_deploy.ps1` (requer RENDER_API_KEY e RENDER_SERVICE_ID)

  Segurança: o script não grava chaves em disco; solicita valores sensíveis no prompt
  se não estiverem presentes nas variáveis de ambiente.
#>

param(
    [Parameter(Mandatory=$false)] [string]$CurrentDatabaseUrl = $env:DATABASE_URL
)

function Get-SecretInput([string]$prompt) {
    Write-Host "$prompt" -ForegroundColor Yellow
    $s = Read-Host -AsSecureString
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

if (-not $CurrentDatabaseUrl) {
    $CurrentDatabaseUrl = Get-SecretInput 'Cole a DATABASE_URL atual (postgresql://user:pass@host:port/dbname):'
}

$regex = '^(?:postgres(?:ql)?:\/\/)(?<user>[^:\/@]+):(?<pass>[^@]+)@(?<host>[^:\/]+):(?<port>\d+)\/(?<db>[^\?]+)'
$m = [regex]::Match($CurrentDatabaseUrl, $regex)
if (-not $m.Success) {
    Write-Error "DATABASE_URL não está no formato esperado. Ex.: postgresql://user:pass@host:port/dbname"; exit 1
}

$user = $m.Groups['user'].Value
$dbHost = $m.Groups['host'].Value
$port = $m.Groups['port'].Value
$db = $m.Groups['db'].Value

# Gerar senha forte (base64 de 18 bytes)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 18
$rng.GetBytes($bytes)
$newPass = [Convert]::ToBase64String($bytes)

Write-Host "Nova senha gerada (mostrando parcialmente): $($newPass.Substring(0,8))..." -ForegroundColor Cyan

# Escape single quotes for SQL
$escapedPass = $newPass -replace "'","''"

# Prepare SQL (use PowerShell-safe quoting for embedded double quotes)
$sql = "ALTER USER `"$user`" WITH PASSWORD '$escapedPass';"

Write-Host "Tentando executar ALTER USER via psql (se disponível)..." -ForegroundColor Cyan

$psqlAvailable = $false
try {
    & psql --version > $null 2>&1; $psqlAvailable = $true
} catch {
    $psqlAvailable = $false
}

if ($psqlAvailable) {
    Write-Host "psql encontrado. Executando comando ALTER USER..." -ForegroundColor Green
    try {
        # Use connection string without the changed password (uses current URL which contains old pass)
        & psql $CurrentDatabaseUrl -c $sql
        Write-Host "ALTER USER executado com sucesso." -ForegroundColor Green
        $psqlSuccess = $true
    } catch {
        Write-Warning "Falha ao executar psql: $($_.Exception.Message)"; $psqlSuccess = $false
    }
} else {
    Write-Warning "psql não encontrado no PATH. Saída instruções para execução manual."; $psqlSuccess = $false
}

# Build new DATABASE_URL using sub-expressions to avoid parsing ambiguities
$escapedForUrl = [uri]::EscapeDataString($newPass)
$newDatabaseUrl = "postgresql://$($user):$($escapedForUrl)@$($dbHost):$($port)/$($db)"

Write-Host "Nova DATABASE_URL (parcial, sensível) será atualizada no Render." -ForegroundColor Cyan

if (-not $env:RENDER_API_KEY) {
    Write-Host "RENDER_API_KEY não está definido. Será solicitado para atualizar a variável no Render." -ForegroundColor Yellow
    $env:RENDER_API_KEY = Prompt-Secret 'Cole o RENDER_API_KEY (só nesta sessão):'
}
if (-not $env:RENDER_SERVICE_ID) {
    Write-Host "RENDER_SERVICE_ID não está definido. Informe o service id:" -ForegroundColor Yellow
    $env:RENDER_SERVICE_ID = Read-Host
}

if (-not $psqlSuccess) {
    Write-Host "`nEXECUTE MANUALMENTE no seu banco (psql) para aplicar a nova senha:" -ForegroundColor Yellow
    Write-Host "SQL: $sql" -ForegroundColor Yellow
    Write-Host "`nOu, se preferir, rode este comando localmente (substitua a URL se necessário):" -ForegroundColor Yellow
    Write-Host "psql '<CURRENT_DATABASE_URL>' -c \"$sql\"" -ForegroundColor Yellow
    Write-Host "Após confirmar que a senha foi alterada no DB, prossiga para atualizar o Render." -ForegroundColor Yellow
    $proceed = Read-Host "Deseja prosseguir e atualizar o DATABASE_URL no Render com a nova senha? (s/n)"
    if ($proceed -notin @('s','S','y','Y')) { Write-Host 'Abortando sem atualizar Render.'; exit 0 }
}

Write-Host "Atualizando variável DATABASE_URL no Render (via script local)..." -ForegroundColor Cyan
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$renderScript = Join-Path $scriptDir 'render_update_env_and_deploy.ps1'

# Call render update script to set DATABASE_URL and trigger a deploy
& $renderScript -EnvName 'DATABASE_URL' -EnvValue $newDatabaseUrl -Branch ($env:BRANCH -or 'chore/health-deploy-readme')
if ($LASTEXITCODE -ne 0) { Write-Error "Atualização da variável DATABASE_URL falhou. Verifique RENDER_API_KEY e RENDER_SERVICE_ID."; exit 1 }

Write-Host "DATABASE_URL atualizada no Render e deploy iniciado. Verifique Live Logs e confirme a aplicação." -ForegroundColor Green
Write-Host "Nova DATABASE_URL (oculta parcialmente): $( ($newDatabaseUrl).Substring(0,40) )..." -ForegroundColor Gray

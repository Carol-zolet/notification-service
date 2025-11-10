# ==========================================
# SCRIPT: restart-server.ps1
# Para e reinicia o servidor
# ==========================================

Write-Host "Parando servidor..." -ForegroundColor Yellow

# Matar todos os processos node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "  OK - Processo encerrado" -ForegroundColor Green

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Verificando routes.ts..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"
$content = [System.IO.File]::ReadAllText($routesPath, [System.Text.Encoding]::UTF8)

# Mostrar últimas 50 linhas
$lines = $content -split "`n"
Write-Host "Últimas 20 linhas do arquivo:" -ForegroundColor Cyan
$lines[-20..-1] | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Green
Write-Host ""

npm run dev
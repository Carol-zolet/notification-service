# ==========================================
# SCRIPT: clean-and-start.ps1
# Limpa e inicia o servidor
# ==========================================

Write-Host "Limpando projeto..." -ForegroundColor Yellow

# Remover arquivos problematicos
$problematicos = @(
  "src\application\use-cases\reprocess-failed-notifications.use-case.ts",
  "src\scripts\reprocess-failed-rest.ts"
)

$problematicos | ForEach-Object {
  if (Test-Path $_) {
    Remove-Item $_ -Force
    Write-Host "  Removido: $_" -ForegroundColor Red
  }
}

# Limpar routes.ts
Write-Host ""
Write-Host "Corrigindo routes.ts..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"
$content = Get-Content $routesPath -Raw

# Remover imports problematicos
$content = $content -replace "import.*reprocess.*use-case.*\n?", ""
$content = $content -replace "import.*from.*reprocess.*\n?", ""

$content | Out-File -Path $routesPath -Encoding UTF8 -NoNewline
Write-Host "  OK - routes.ts limpo" -ForegroundColor Green

# Iniciar servidor
Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Green
Write-Host ""

npm run dev
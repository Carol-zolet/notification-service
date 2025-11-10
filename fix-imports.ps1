# ==========================================
# SCRIPT: fix-imports.ps1
# Remove imports problematicos
# ==========================================

Write-Host "Corrigindo imports em routes.ts..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

if (Test-Path $routesPath) {
  $content = Get-Content $routesPath -Raw
  
  # Remover import do arquivo que nao existe
  $content = $content -replace "import.*reprocess-failed-notifications.*\n?", ""
  
  # Limpar linhas em branco duplas
  $content = $content -replace "\n{3,}", "`n`n"
  
  # Salvar
  $content | Out-File -Path $routesPath -Encoding UTF8 -NoNewline
  
  Write-Host "OK - Import removido de routes.ts" -ForegroundColor Green
  
  # Mostrar linhas de import que restaram
  Write-Host ""
  Write-Host "Imports restantes:" -ForegroundColor Cyan
  $content.Split("`n") | Where-Object { $_ -match "^import " } | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
  }
}

# Remover arquivo de use-case problematico se existir
$reprocessPath = "src\application\use-cases\reprocess-failed-notifications.use-case.ts"
if (Test-Path $reprocessPath) {
  Remove-Item $reprocessPath -Force
  Write-Host ""
  Write-Host "Arquivo removido: $reprocessPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "Pronto! Agora execute: npm run dev" -ForegroundColor Green
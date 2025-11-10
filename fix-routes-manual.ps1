# ==========================================
# SCRIPT: fix-routes-manual.ps1
# Remove import problemático de routes.ts
# ==========================================

Write-Host "Corrigindo routes.ts manualmente..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

# Ler arquivo
$content = [System.IO.File]::ReadAllText($routesPath)

# Encontrar e remover o import
if ($content -match "import.*reprocess-failed-notifications") {
  Write-Host "Encontrado import problemático" -ForegroundColor Red
  
  # Remover qualquer linha com reprocess-failed-notifications
  $lines = $content -split "`n"
  $newLines = @()
  
  foreach ($line in $lines) {
    if ($line -notmatch "reprocess-failed-notifications") {
      $newLines += $line
    } else {
      Write-Host "  Removendo: $line" -ForegroundColor Red
    }
  }
  
  $newContent = $newLines -join "`n"
  
  # Salvar usando método direto
  [System.IO.File]::WriteAllText($routesPath, $newContent, [System.Text.Encoding]::UTF8)
  
  Write-Host "OK - Arquivo corrigido" -ForegroundColor Green
} else {
  Write-Host "Import ja foi removido" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Green
npm run dev
# ==========================================
# SCRIPT: debug-unidades.ps1
# Diagnostica o problema com unidades
# ==========================================

Write-Host "Iniciando diagnostico..." -ForegroundColor Cyan

# Verificar se o servidor esta rodando
Write-Host "1. Testando conexao com servidor..." -ForegroundColor Yellow

try {
  $healthRes = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -ErrorAction Stop
  Write-Host "   OK - Servidor respondendo: $($healthRes.status)" -ForegroundColor Green
} catch {
  Write-Host "   ERRO - Servidor nao esta respondendo!" -ForegroundColor Red
  Write-Host "   Inicie com: npm run dev" -ForegroundColor Yellow
  exit
}

# Testar endpoint de unidades
Write-Host "2. Testando GET /api/v1/admin/unidades..." -ForegroundColor Yellow

try {
  $unidadesRes = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/unidades" -ErrorAction Stop
  Write-Host "   Resposta recebida: $($unidadesRes | ConvertTo-Json)" -ForegroundColor Green
  Write-Host "   Total de unidades: $($unidadesRes.Count)" -ForegroundColor Cyan
} catch {
  Write-Host "   ERRO - Endpoint nao respondeu" -ForegroundColor Red
  Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Testar endpoint de colaboradores
Write-Host "3. Testando GET /api/v1/admin/colaboradores..." -ForegroundColor Yellow

try {
  $colabRes = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/colaboradores" -ErrorAction Stop
  Write-Host "   OK - Total de colaboradores: $($colabRes.Count)" -ForegroundColor Green
} catch {
  Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Diagnostico concluido" -ForegroundColor Green
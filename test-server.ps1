# ==========================================
# SCRIPT: test-server.ps1
# Testa se o servidor esta respondendo
# ==========================================

Write-Host "Aguardando servidor iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Testando conexao..." -ForegroundColor Yellow
Write-Host ""

$maxTentativas = 10
$tentativa = 0

do {
  $tentativa++
  Write-Host "Tentativa $tentativa/$maxTentativas..." -ForegroundColor Gray
  
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -ErrorAction Stop
    Write-Host "✓ SUCESSO!" -ForegroundColor Green
    Write-Host "Servidor respondendo:" -ForegroundColor Cyan
    Write-Host "  Status: $($response.status)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Teste estes endpoints:" -ForegroundColor Yellow
    Write-Host "  - http://localhost:3001/api/debug/total" -ForegroundColor Cyan
    Write-Host "  - http://localhost:3001/api/debug/unidades" -ForegroundColor Cyan
    Write-Host "  - http://localhost:3001/api/v1/admin/unidades" -ForegroundColor Cyan
    break
  } catch {
    Write-Host "  Conectando..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
  }
} while ($tentativa -lt $maxTentativas)

if ($tentativa -eq $maxTentativas) {
  Write-Host "✗ ERRO - Servidor nao respondeu!" -ForegroundColor Red
  Write-Host "Verifique:" -ForegroundColor Yellow
  Write-Host "  1. Se npm run dev esta rodando" -ForegroundColor White
  Write-Host "  2. Se a porta 3001 esta disponivel" -ForegroundColor White
  Write-Host "  3. Erros no console" -ForegroundColor White
}
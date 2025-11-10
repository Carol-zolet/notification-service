# ==========================================
# SCRIPT: start-server.ps1
# Inicia o servidor backend
# ==========================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  INICIANDO SERVIDOR DE NOTIFICACOES                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node -v
Write-Host "   OK - Node.js $nodeVersion" -ForegroundColor Green

Write-Host ""
Write-Host "2. Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
  Write-Host "   OK - Dependencias ja instaladas" -ForegroundColor Green
} else {
  Write-Host "   Instalando dependencias..." -ForegroundColor Yellow
  npm install
  Write-Host "   OK - Dependencias instaladas" -ForegroundColor Green
}

Write-Host ""
Write-Host "3. Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "4. Iniciando servidor..." -ForegroundColor Yellow
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  SERVIDOR INICIANDO NA PORTA 3001                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

npm run dev
# ==========================================
# Adiciona rotas de debug ao servidor
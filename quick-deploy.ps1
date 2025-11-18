<#
.SYNOPSIS
  Deploy rapido com as URLs corretas configuradas

.DESCRIPTION
  Script simplificado para fazer deploy com as configuracoes ja definidas
#>

$FrontendUrl = "https://notification-service-a239ihe9r-carolines-projects-4e5c6800.vercel.app"
$BackendUrl = "https://notification-service-rmnv.onrender.com"
$ApiBaseUrl = "$BackendUrl/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY - Notification Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs configuradas:" -ForegroundColor Yellow
Write-Host "  Frontend: $FrontendUrl" -ForegroundColor White
Write-Host "  Backend:  $BackendUrl" -ForegroundColor White
Write-Host "  API:      $ApiBaseUrl" -ForegroundColor White
Write-Host ""

# Verificar se ja foi feito commit das ultimas mudancas
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Mudancas nao commitadas detectadas:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $doCommit = Read-Host "Deseja commitar as mudancas? (S/n)"
    
    if ($doCommit -ne 'n') {
        git add .
        git commit -m "chore: update deploy scripts and configurations"
        Write-Host "Commit realizado!" -ForegroundColor Green
        
        $doPush = Read-Host "Deseja fazer push para o GitHub? (S/n)"
        if ($doPush -ne 'n') {
            git push
            Write-Host "Push realizado!" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Escolha o tipo de deploy:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Deploy Manual via Render Dashboard (RECOMENDADO)" -ForegroundColor Green
Write-Host "2. Deploy Automatico via API (requer credenciais)" -ForegroundColor Yellow
Write-Host "3. Apenas atualizar variaveis de ambiente (manual)" -ForegroundColor Cyan
Write-Host "4. Validar deployment atual" -ForegroundColor Magenta
Write-Host ""

$choice = Read-Host "Escolha uma opcao (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Deploy Manual - Instrucoes:" -ForegroundColor Green
        Write-Host "1. Acesse: https://dashboard.render.com/" -ForegroundColor White
        Write-Host "2. Encontre o servico: notification-service" -ForegroundColor White
        Write-Host "3. Va em Environment e configure:" -ForegroundColor White
        Write-Host "   FRONTEND_URL = $FrontendUrl" -ForegroundColor Gray
        Write-Host "4. Clique em Manual Deploy" -ForegroundColor White
        Write-Host "5. Selecione branch: chore/health-deploy-readme" -ForegroundColor White
        Write-Host "6. Aguarde o deploy (2-5 minutos)" -ForegroundColor White
        Write-Host ""
        Write-Host "Deseja abrir o Render Dashboard agora? (S/n)" -ForegroundColor Yellow
        $openDashboard = Read-Host
        if ($openDashboard -ne 'n') {
            Start-Process "https://dashboard.render.com/"
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "Deploy Automatico via API" -ForegroundColor Yellow
        Write-Host ""
        
        if (-not $env:RENDER_API_KEY) {
            Write-Host "RENDER_API_KEY nao encontrada." -ForegroundColor Red
            Write-Host "Obtenha em: https://dashboard.render.com/account/api-keys" -ForegroundColor Cyan
            $env:RENDER_API_KEY = Read-Host "Cole sua RENDER_API_KEY"
        }
        
        if (-not $env:RENDER_SERVICE_ID) {
            Write-Host "RENDER_SERVICE_ID nao encontrada." -ForegroundColor Red
            Write-Host "Encontre em: Render Dashboard > seu servico > Settings" -ForegroundColor Cyan
            $env:RENDER_SERVICE_ID = Read-Host "Cole seu RENDER_SERVICE_ID (srv-xxxxx)"
        }
        
        if (-not $env:VERCEL_TOKEN) {
            Write-Host "VERCEL_TOKEN nao encontrada." -ForegroundColor Red
            Write-Host "Crie em: https://vercel.com/account/tokens" -ForegroundColor Cyan
            $env:VERCEL_TOKEN = Read-Host "Cole seu VERCEL_TOKEN"
        }
        
        if (-not $env:VERCEL_PROJECT_ID) {
            Write-Host "VERCEL_PROJECT_ID nao encontrada." -ForegroundColor Red
            Write-Host "Encontre em: Vercel > Settings > General" -ForegroundColor Cyan
            $env:VERCEL_PROJECT_ID = Read-Host "Cole seu VERCEL_PROJECT_ID"
        }
        
        Write-Host ""
        Write-Host "Executando deploy automatico..." -ForegroundColor Cyan
        & ".\scripts\automation\auto_full_deploy.ps1" `
            -Branch "chore/health-deploy-readme" `
            -FrontendUrl $FrontendUrl `
            -ApiBaseUrl $ApiBaseUrl
    }
    
    "3" {
        Write-Host ""
        Write-Host "Variaveis de ambiente a configurar:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "No Render (Backend):" -ForegroundColor Cyan
        Write-Host "  FRONTEND_URL = $FrontendUrl" -ForegroundColor White
        Write-Host "  CORS_ORIGIN = $FrontendUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "No Vercel (Frontend):" -ForegroundColor Cyan
        Write-Host "  VITE_API_BASE_URL = $ApiBaseUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "Apos configurar, faca redeploy em ambos os servicos." -ForegroundColor Yellow
    }
    
    "4" {
        Write-Host ""
        Write-Host "Validando deployment atual..." -ForegroundColor Cyan
        Write-Host ""
        
        # Test backend health
        Write-Host "1. Testando backend health endpoint..." -ForegroundColor Yellow
        try {
            $health = Invoke-RestMethod -Uri "$BackendUrl/health" -Method GET -TimeoutSec 10
            Write-Host "   Backend: OK" -ForegroundColor Green
            Write-Host "   Status: $($health.status)" -ForegroundColor Gray
        } catch {
            Write-Host "   Backend: FALHOU" -ForegroundColor Red
            Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "2. Testando API endpoint com CORS..." -ForegroundColor Yellow
        try {
            $headers = @{ Origin = $FrontendUrl }
            $unidades = Invoke-RestMethod -Uri "$ApiBaseUrl/admin/unidades" -Headers $headers -Method GET -TimeoutSec 10
            Write-Host "   API: OK" -ForegroundColor Green
            Write-Host "   Unidades encontradas: $($unidades.Count)" -ForegroundColor Gray
        } catch {
            Write-Host "   API: FALHOU" -ForegroundColor Red
            Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "3. Testando frontend..." -ForegroundColor Yellow
        try {
            $frontendTest = Invoke-WebRequest -Uri $FrontendUrl -Method HEAD -TimeoutSec 10
            Write-Host "   Frontend: OK (HTTP $($frontendTest.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Host "   Frontend: FALHOU" -ForegroundColor Red
            Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "Validacao concluida!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "URLs para acesso:" -ForegroundColor Yellow
        Write-Host "  Frontend: $FrontendUrl" -ForegroundColor White
        Write-Host "  API:      $ApiBaseUrl" -ForegroundColor White
        Write-Host "  Health:   $BackendUrl/health" -ForegroundColor White
    }
    
    default {
        Write-Host ""
        Write-Host "Opcao invalida!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Script finalizado!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

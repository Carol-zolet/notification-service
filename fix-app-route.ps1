# ==========================================
# SCRIPT: fix-app-route.ps1
# Verifica e corrige rota do Payslip em App.tsx
# ==========================================

Write-Host "Verificando App.tsx..." -ForegroundColor Yellow

$appPath = "frontend\src\App.tsx"

if (Test-Path $appPath) {
  $content = [System.IO.File]::ReadAllText($appPath, [System.Text.Encoding]::UTF8)
  
  Write-Host "Conteudo de App.tsx:" -ForegroundColor Cyan
  Write-Host $content -ForegroundColor Gray
  Write-Host ""
  
  # Verificar se Payslip ja existe
  if ($content -match "Payslip") {
    Write-Host "INFO - Rota Payslip ja existe" -ForegroundColor Green
  } else {
    Write-Host "Adicionando import de Payslip..." -ForegroundColor Yellow
    
    # Adicionar import
    $newContent = $content -replace "(import.*from 'react-router-dom')", "`$1`nimport { Payslip } from './pages/Payslip';"
    
    # Adicionar rota
    $newContent = $newContent -replace "(<Routes>)", "`$1`n        <Route path=""/payslips"" element={<Payslip />} />"
    
    [System.IO.File]::WriteAllText($appPath, $newContent, [System.Text.Encoding]::UTF8)
    
    Write-Host "OK - Rota adicionada" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Recarregue o navegador com Ctrl+Shift+R (hard refresh)" -ForegroundColor Yellow
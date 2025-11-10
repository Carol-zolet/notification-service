# ==========================================
# SCRIPT: fix-multer-routes.ps1
# Corrige uso de multer em routes.ts
# ==========================================

Write-Host "Corrigindo multer em routes.ts..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

# Ler arquivo
$content = [System.IO.File]::ReadAllText($routesPath, [System.Text.Encoding]::UTF8)

# Substituir multer.single por upload.single (linha 442)
$content = $content -replace "router\.post\('/payslips/distribuir', multer\.single\('pdfFile'\)", "router.post('/payslips/distribuir', upload.single('pdfFile')"

# Salvar
[System.IO.File]::WriteAllText($routesPath, $content, [System.Text.Encoding]::UTF8)

Write-Host "OK - Multer corrigido (multer.single → upload.single)" -ForegroundColor Green
Write-Host ""
Write-Host "Servidor vai reiniciar automaticamente..." -ForegroundColor Yellow
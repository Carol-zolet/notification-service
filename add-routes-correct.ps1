# ==========================================
# SCRIPT: add-routes-correct.ps1
# Adiciona rotas de debug ao routes.ts
# ==========================================

Write-Host "Adicionando rotas de debug..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

# Ler arquivo
$content = [System.IO.File]::ReadAllText($routesPath, [System.Text.Encoding]::UTF8)

# Verificar se debug já existe
if ($content -match "debug/total") {
  Write-Host "Rotas de debug ja existem" -ForegroundColor Gray
  exit
}

# Criar as rotas de debug
$debugRoutes = @'

// ==========================================
// DEBUG ENDPOINTS
// ==========================================

// DEBUG - Total de colaboradores
router.get('/debug/total', async (req, res) => {
  try {
    const total = await prisma.colaborador.count();
    res.json({ total, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DEBUG - Listar todas as unidades com contagem
router.get('/debug/unidades', async (req, res) => {
  try {
    const unidades = await prisma.colaborador.groupBy({
      by: ['filial'],
      _count: { id: true },
      orderBy: { filial: 'asc' },
    });
    
    res.json(unidades.map(u => ({ filial: u.filial, count: u._count.id })));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DEBUG - Colaboradores por unidade
router.get('/debug/colaboradores-por-unidade', async (req, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      select: { filial: true },
    });
    
    const grouped = {};
    colaboradores.forEach(c => {
      grouped[c.filial] = (grouped[c.filial] || 0) + 1;
    });
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

'@

# Adicionar antes do export default router
$newContent = $content -replace "(export default router;)", ($debugRoutes + "`nexport default router;")

# Salvar
[System.IO.File]::WriteAllText($routesPath, $newContent, [System.Text.Encoding]::UTF8)

Write-Host "OK - Rotas adicionadas" -ForegroundColor Green
Write-Host ""
Write-Host "Servidor vai reiniciar..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Teste estes endpoints:" -ForegroundColor Cyan
Write-Host "  - http://localhost:3001/api/v1/debug/total" -ForegroundColor Yellow
Write-Host "  - http://localhost:3001/api/v1/debug/unidades" -ForegroundColor Yellow
Write-Host "  - http://localhost:3001/api/v1/debug/colaboradores-por-unidade" -ForegroundColor Yellow
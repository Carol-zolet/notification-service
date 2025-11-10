# ==========================================
# SCRIPT: fix-debug-routes.ps1
# Corrige rotas de debug com nome correto de coluna
# ==========================================

Write-Host "Corrigindo rotas de debug..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

# Ler arquivo
$content = [System.IO.File]::ReadAllText($routesPath, [System.Text.Encoding]::UTF8)

# Remover rotas de debug antigas
$content = $content -replace "(?s)// ={5,}.*?DEBUG ENDPOINTS.*?(?=export default router;)", ""

# Adicionar rotas corretas (usando 'unidade' em vez de 'filial')
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
      by: ['unidade'],
      _count: { id: true },
      orderBy: { unidade: 'asc' },
    });
    
    res.json(unidades.map(u => ({ unidade: u.unidade, count: u._count.id })));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DEBUG - Colaboradores por unidade
router.get('/debug/colaboradores-por-unidade', async (req, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      select: { unidade: true },
    });
    
    const grouped = {};
    colaboradores.forEach(c => {
      grouped[c.unidade] = (grouped[c.unidade] || 0) + 1;
    });
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

'@

# Adicionar antes do export
$newContent = $content -replace "(export default router;)", ($debugRoutes + "`nexport default router;")

# Salvar
[System.IO.File]::WriteAllText($routesPath, $newContent, [System.Text.Encoding]::UTF8)

Write-Host "OK - Rotas corrigidas (usando coluna 'unidade')" -ForegroundColor Green
Write-Host ""
Write-Host "Servidor vai reiniciar..." -ForegroundColor Yellow

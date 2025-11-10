# ==========================================
# SCRIPT: add-debug-routes.ps1
# Adiciona rotas de debug
# ==========================================

Write-Host "Adicionando rotas de debug..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

$debugRoutes = @'


// DEBUG - Listar todas as unidades
routes.get('/debug/unidades', async (req, res) => {
  try {
    const unidades = await prisma.colaborador.groupBy({
      by: ['filial'],
      _count: { id: true },
      orderBy: { filial: 'asc' },
    });
    
    console.log('[DEBUG] Unidades encontradas:', unidades);
    res.json(unidades);
  } catch (error) {
    console.error('[DEBUG] Erro:', error);
    res.status(500).json({ error: String(error) });
  }
});

// DEBUG - Contar colaboradores por unidade
routes.get('/debug/colaboradores-por-unidade', async (req, res) => {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      select: { filial: true },
    });
    
    const grouped = {};
    colaboradores.forEach(c => {
      grouped[c.filial] = (grouped[c.filial] || 0) + 1;
    });
    
    console.log('[DEBUG] Colaboradores por unidade:', grouped);
    res.json(grouped);
  } catch (error) {
    console.error('[DEBUG] Erro:', error);
    res.status(500).json({ error: String(error) });
  }
});

// DEBUG - Total de colaboradores
routes.get('/debug/total', async (req, res) => {
  try {
    const total = await prisma.colaborador.count();
    console.log('[DEBUG] Total de colaboradores:', total);
    res.json({ total, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[DEBUG] Erro:', error);
    res.status(500).json({ error: String(error) });
  }
});
'@

$content = Get-Content $routesPath -Raw
if ($content -notmatch "debug/unidades") {
  $content = $content -replace "(export \{ routes \})", ($debugRoutes + "`n`nexport { routes }")
  $content | Out-File -Path $routesPath -Encoding UTF8 -NoNewline
  Write-Host "OK - Rotas de debug adicionadas" -ForegroundColor Green
} else {
  Write-Host "INFO - Rotas de debug ja existem" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Reinicie o servidor com: npm run dev" -ForegroundColor Cyan
Write-Host "Depois teste:" -ForegroundColor Cyan
Write-Host "  - http://localhost:3001/api/debug/total" -ForegroundColor Yellow
Write-Host "  - http://localhost:3001/api/debug/unidades" -ForegroundColor Yellow
Write-Host "  - http://localhost:3001/api/debug/colaboradores-por-unidade" -ForegroundColor Yellow

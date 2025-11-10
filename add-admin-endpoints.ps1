# ==========================================
# SCRIPT: add-admin-endpoints.ps1
# Adiciona endpoints admin para colaboradores e unidades
# ==========================================

Write-Host "Adicionando endpoints admin..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

# Ler arquivo
$content = [System.IO.File]::ReadAllText($routesPath, [System.Text.Encoding]::UTF8)

# Verificar se admin já existe
if ($content -match "admin/colaboradores") {
  Write-Host "Endpoints admin ja existem" -ForegroundColor Gray
  exit
}

# Criar endpoints admin
$adminEndpoints = @'

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// GET /api/v1/admin/colaboradores - Listar com filtro por unidade
router.get('/admin/colaboradores', async (req, res) => {
  try {
    const { unidade, skip = 0, take = 100 } = req.query;
    
    const where = unidade ? { unidade: String(unidade) } : {};
    
    const colaboradores = await prisma.colaborador.findMany({
      where,
      skip: Number(skip),
      take: Math.min(Number(take), 100),
      orderBy: { nome: 'asc' },
    });
    
    res.json(colaboradores);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/v1/admin/unidades - Listar todas as unidades
router.get('/admin/unidades', async (req, res) => {
  try {
    const unidades = await prisma.colaborador.groupBy({
      by: ['unidade'],
      _count: { id: true },
      orderBy: { unidade: 'asc' },
    });
    
    res.json(unidades.map(u => ({ 
      filial: u.unidade, 
      unidade: u.unidade,
      count: u._count.id 
    })));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/v1/admin/colaboradores - Criar colaborador
router.post('/admin/colaboradores', async (req, res) => {
  try {
    const { nome, email, unidade } = req.body;
    
    if (!nome || !email || !unidade) {
      return res.status(400).json({ error: 'Nome, email e unidade sao obrigatorios' });
    }
    
    const existe = await prisma.colaborador.findUnique({
      where: { email },
    });
    
    if (existe) {
      return res.status(400).json({ error: 'Email ja existe' });
    }
    
    const colaborador = await prisma.colaborador.create({
      data: { nome, email, unidade },
    });
    
    res.status(201).json(colaborador);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// PUT /api/v1/admin/colaboradores/:id - Atualizar colaborador
router.put('/admin/colaboradores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, unidade } = req.body;
    
    const colaborador = await prisma.colaborador.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(email && { email }),
        ...(unidade && { unidade }),
      },
    });
    
    res.json(colaborador);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DELETE /api/v1/admin/colaboradores/:id - Deletar colaborador
router.delete('/admin/colaboradores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.colaborador.delete({
      where: { id },
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

'@

# Adicionar antes do export
$newContent = $content -replace "(export default router;)", ($adminEndpoints + "`nexport default router;")

# Salvar
[System.IO.File]::WriteAllText($routesPath, $newContent, [System.Text.Encoding]::UTF8)

Write-Host "OK - Endpoints admin adicionados" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints disponiveis:" -ForegroundColor Cyan
Write-Host "  - GET  /api/v1/admin/colaboradores" -ForegroundColor Yellow
Write-Host "  - GET  /api/v1/admin/unidades" -ForegroundColor Yellow
Write-Host "  - POST /api/v1/admin/colaboradores" -ForegroundColor Yellow
Write-Host "  - PUT  /api/v1/admin/colaboradores/:id" -ForegroundColor Yellow
Write-Host "  - DELETE /api/v1/admin/colaboradores/:id" -ForegroundColor Yellow
Write-Host ""
Write-Host "Servidor vai reiniciar..." -ForegroundColor Green
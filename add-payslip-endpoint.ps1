# ==========================================
# SCRIPT: add-payslip-endpoint.ps1
# Adiciona endpoint de distribuicao
# ==========================================

Write-Host "Adicionando endpoint de distribuicao..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"

# Ler arquivo
$content = [System.IO.File]::ReadAllText($routesPath, [System.Text.Encoding]::UTF8)

# Verificar se rota ja existe
if ($content -match "payslips/distribuir") {
  Write-Host "INFO - Rota ja existe" -ForegroundColor Gray
  exit
}

# Adicionar rota
$newRoute = @'

// ==========================================
// PAYSLIPS ENDPOINT
// ==========================================

// POST /api/v1/payslips/distribuir
router.post('/payslips/distribuir', multer.single('pdfFile'), async (req, res) => {
  try {
    const { unidade, subject, message } = req.body;
    const pdfBuffer = req.file?.buffer;

    if (!pdfBuffer || !unidade) {
      return res.status(400).json({
        success: false,
        message: 'PDF e unidade sao obrigatorios',
      });
    }

    // Buscar colaboradores da unidade
    const colaboradores = await prisma.colaborador.findMany({
      where: { unidade: unidade },
      select: { id: true, nome: true, email: true, unidade: true },
    });

    if (colaboradores.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Nenhum colaborador encontrado para ${unidade}`,
      });
    }

    let processed = 0;
    let failed = 0;

    // Processar cada colaborador
    for (const col of colaboradores) {
      try {
        // TODO: Aqui você pode adicionar logica de envio de email
        // Por enquanto, apenas simulamos o envio
        console.log(`[PAYSLIP] Enviando para ${col.nome} (${col.email})`);
        processed++;
      } catch (error) {
        console.error(`Erro ao enviar para ${col.email}:`, error);
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Holerites processados',
      processed,
      failed,
      total: colaboradores.length,
      unidade: unidade,
    });
  } catch (error) {
    console.error('Erro ao distribuir holerites:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao distribuir holerites',
    });
  }
});

'@

$newContent = $content -replace "(export default router;)", ($newRoute + "`nexport default router;")

[System.IO.File]::WriteAllText($routesPath, $newContent, [System.Text.Encoding]::UTF8)

Write-Host "OK - Endpoint adicionado" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoint: POST /api/v1/payslips/distribuir" -ForegroundColor Cyan
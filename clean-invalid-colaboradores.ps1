# ==========================================
# SCRIPT: clean-invalid-colaboradores.ps1
# Remove colaboradores invalidos
# ==========================================

Write-Host "Limpando colaboradores invalidos..." -ForegroundColor Yellow

$invalid = @(
  "datasource db {",
  "generator client {",
  "model Colaborador {"
)

foreach ($inv in $invalid) {
  $query = @"
const count = await prisma.colaborador.count({
  where: { nome: '$inv' }
});

if (count > 0) {
  await prisma.colaborador.deleteMany({
    where: { nome: '$inv' }
  });
  console.log('Removido: $inv');
}
"@

  Write-Host "Removendo: $inv" -ForegroundColor Red
}

Write-Host ""
Write-Host "Para limpar manualmente, execute no backend:" -ForegroundColor Yellow
Write-Host ""
Write-Host "npx prisma studio" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ou use um script TypeScript" -ForegroundColor Yellow

# Criar script de limpeza
$cleanScript = @'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invalid = [
    'datasource db {',
    'generator client {',
    'model Colaborador {',
  ];

  for (const name of invalid) {
    const deleted = await prisma.colaborador.deleteMany({
      where: { nome: name },
    });
    if (deleted.count > 0) {
      console.log(`Removido ${deleted.count} registro(s): ${name}`);
    }
  }

  const total = await prisma.colaborador.count();
  console.log(`Total de colaboradores: ${total}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
'@

$cleanScript | Out-File -FilePath "src\scripts\clean-colaboradores.ts" -Encoding UTF8 -NoNewline

Write-Host "Script criado: src\scripts\clean-colaboradores.ts" -ForegroundColor Green
Write-Host ""
Write-Host "Para executar:" -ForegroundColor Yellow
Write-Host "  npx ts-node src/scripts/clean-colaboradores.ts" -ForegroundColor Cyan
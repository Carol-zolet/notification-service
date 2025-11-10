# ==========================================
# SCRIPT: reimport-colaboradores.ps1
# Re-importa todos os colaboradores do CSV
# ==========================================

Write-Host "Re-importando colaboradores..." -ForegroundColor Cyan

# Primeiro, limpar banco
Write-Host "1. Limpando banco de dados..." -ForegroundColor Yellow

$cleanScript = @'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.colaborador.deleteMany({});
  console.log(`Removidos ${deleted.count} colaboradores`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
'@

$cleanScript | Out-File -FilePath "src\scripts\clean-all.ts" -Encoding UTF8 -NoNewline
npx ts-node src/scripts/clean-all.ts

Start-Sleep -Seconds 2

# Agora, importar do CSV
Write-Host ""
Write-Host "2. Importando colaboradores do CSV..." -ForegroundColor Yellow

$importScript = @'
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(process.cwd(), 'prisma', 'colaboradores.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('Arquivo nao encontrado:', csvPath);
    process.exit(1);
  }

  let csv = fs.readFileSync(csvPath, 'utf-8');
  
  // Remover BOM se existir
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }

  const lines = csv.split('\n').slice(1); // Remover header
  
  let inserted = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const [nome, unidade, email] = line.split(',').map(s => s?.trim());

    if (!nome || !email || !unidade) {
      skipped++;
      continue;
    }

    try {
      // Verificar se ja existe
      const existe = await prisma.colaborador.findUnique({
        where: { email },
      });

      if (!existe) {
        await prisma.colaborador.create({
          data: { nome, email, unidade },
        });
        inserted++;
      }
    } catch (error) {
      console.error(`Erro ao inserir ${email}:`, error);
      skipped++;
    }
  }

  const total = await prisma.colaborador.count();
  console.log(`Inseridos: ${inserted}`);
  console.log(`Pulados: ${skipped}`);
  console.log(`Total no banco: ${total}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
'@

$importScript | Out-File -FilePath "src\scripts\import-colaboradores.ts" -Encoding UTF8 -NoNewline
npx ts-node src/scripts/import-colaboradores.ts

Write-Host ""
Write-Host "3. Verificando resultado..." -ForegroundColor Yellow

$verifyScript = @'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.colaborador.count();
  
  const unidades = await prisma.colaborador.groupBy({
    by: ['unidade'],
    _count: { id: true },
  });

  console.log(`Total de colaboradores: ${total}`);
  console.log(`Total de unidades: ${unidades.length}`);
  console.log('');
  console.log('Distribuicao por unidade:');
  unidades.sort((a, b) => a.unidade.localeCompare(b.unidade)).forEach(u => {
    console.log(`  ${u.unidade}: ${u._count.id}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
'@

$verifyScript | Out-File -FilePath "src\scripts\verify-import.ts" -Encoding UTF8 -NoNewline
npx ts-node src/scripts/verify-import.ts

Write-Host ""
Write-Host "Reimportacao concluida!" -ForegroundColor Green
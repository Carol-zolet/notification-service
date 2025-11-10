# ==========================================
# SCRIPT: import-correct-csv.ps1
# Importa CSV com delimitador de TABS
# ==========================================

Write-Host "Importando CSV com delimitador correto (TABS)..." -ForegroundColor Cyan

# 1. Limpar banco
Write-Host "1. Limpando banco de dados..." -ForegroundColor Yellow

$cleanScript = @'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const deleted = await prisma.colaborador.deleteMany({});
  console.log(`Removidos ${deleted.count} registros`);
  process.exit(0);
})();
'@

$cleanScript | Out-File "src\scripts\clean-db.ts" -Encoding UTF8 -NoNewline
npx ts-node src/scripts/clean-db.ts

Start-Sleep -Seconds 2

# 2. Importar com TAB delimiter
Write-Host ""
Write-Host "2. Importando colaboradores (delimitador: TAB)..." -ForegroundColor Yellow

$importScript = @'
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

(async () => {
  let csv = fs.readFileSync('prisma/colaboradores.csv', 'utf-8');
  
  // Remover BOM se existir
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }

  // Dividir por quebra de linha
  const lines = csv.split('\n');
  
  let inserted = 0;
  let duplicated = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Split por TAB (não por comma)
    const parts = line.split('\t').map(s => s?.trim());
    
    if (parts.length < 3) {
      skipped++;
      continue;
    }

    const [nome, unidade, email] = parts;

    if (!nome || !email || !unidade) {
      skipped++;
      continue;
    }

    try {
      const existe = await prisma.colaborador.findUnique({
        where: { email }
      });

      if (!existe) {
        await prisma.colaborador.create({
          data: { nome, email, unidade }
        });
        inserted++;
      } else {
        duplicated++;
      }
    } catch (error) {
      console.error(`Erro ao inserir ${email}:`, error);
      skipped++;
    }

    // Progress indicator a cada 50
    if ((inserted + duplicated + skipped) % 50 === 0) {
      console.log(`  Processando... ${inserted + duplicated + skipped} linhas`);
    }
  }

  const total = await prisma.colaborador.count();
  console.log(`\nInseridos: ${inserted}`);
  console.log(`Duplicados: ${duplicated}`);
  console.log(`Pulados: ${skipped}`);
  console.log(`Total no banco: ${total}`);
  
  process.exit(0);
})();
'@

$importScript | Out-File "src\scripts\import-tabs.ts" -Encoding UTF8 -NoNewline
npx ts-node src/scripts/import-tabs.ts

# 3. Verificar resultado
Write-Host ""
Write-Host "3. Verificando resultado..." -ForegroundColor Yellow

$verifyScript = @'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const total = await prisma.colaborador.count();
  
  const unidades = await prisma.colaborador.groupBy({
    by: ['unidade'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log(`\n========================================`);
  console.log(`Total de colaboradores: ${total}`);
  console.log(`Total de unidades: ${unidades.length}`);
  console.log(`========================================\n`);
  
  console.log('Top 10 unidades por quantidade:');
  unidades.slice(0, 10).forEach((u, idx) => {
    console.log(`  ${idx + 1}. ${u.unidade}: ${u._count.id} colaboradores`);
  });
  
  process.exit(0);
})();
'@

$verifyScript | Out-File "src\scripts\verify-final.ts" -Encoding UTF8 -NoNewline
npx ts-node src/scripts/verify-final.ts

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Importacao concluida!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Teste os endpoints:" -ForegroundColor Cyan
Write-Host "  - http://localhost:3001/api/debug/total" -ForegroundColor Yellow
Write-Host "  - http://localhost:3001/api/debug/colaboradores-por-unidade" -ForegroundColor Yellow
# ==========================================
# SCRIPT: final-clean-and-import.ps1
# Limpeza final e import correto
# ==========================================

Write-Host "Processo final de limpeza e importacao..." -ForegroundColor Cyan

# 1. Criar script de limpeza
Write-Host "1. Criando scripts..." -ForegroundColor Yellow

$cleanScript = @'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.colaborador.deleteMany({});
  console.log(`Removidos ${deleted.count} registros`);
}

main().then(() => process.exit(0));
'@

$cleanScript | Out-File "src\scripts\step1-clean.ts" -Encoding UTF8 -NoNewline

# 2. Criar script de import
$importScript = @'
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  let csv = fs.readFileSync('prisma/colaboradores.csv', 'utf-8');
  
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }

  const lines = csv.split('\n').slice(1);
  let inserted = 0;
  let duplicated = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split(',').map(s => s?.trim());
    if (parts.length < 3) { skipped++; continue; }

    const [nome, unidade, email] = parts;

    if (!nome || !email || !unidade) { skipped++; continue; }
    
    if (nome.includes('datasource') || nome.includes('generator') || nome.includes('model')) {
      skipped++;
      continue;
    }

    try {
      const existe = await prisma.colaborador.findUnique({ where: { email } });
      if (!existe) {
        await prisma.colaborador.create({
          data: { nome, email, unidade },
        });
        inserted++;
      } else {
        duplicated++;
      }
    } catch (error) {
      console.error(`Erro: ${email}`);
      skipped++;
    }
  }

  const total = await prisma.colaborador.count();
  console.log(`Inseridos: ${inserted}`);
  console.log(`Duplicados: ${duplicated}`);
  console.log(`Pulados: ${skipped}`);
  console.log(`Total: ${total}`);
}

main().then(() => process.exit(0));
'@

$importScript | Out-File "src\scripts\step2-import.ts" -Encoding UTF8 -NoNewline

# 3. Criar script de verificacao
$verifyScript = @'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.colaborador.count();
  
  const unidades = await prisma.colaborador.groupBy({
    by: ['unidade'],
    _count: { id: true },
    orderBy: { unidade: 'asc' },
  });

  console.log(`Total de colaboradores: ${total}`);
  console.log(`Total de unidades: ${unidades.length}`);
  console.log('');
  console.log('Primeiras 10 unidades:');
  unidades.slice(0, 10).forEach(u => {
    console.log(`  ${u.unidade}: ${u._count.id}`);
  });
}

main().then(() => process.exit(0));
'@

$verifyScript | Out-File "src\scripts\step3-verify.ts" -Encoding UTF8 -NoNewline

Write-Host "  OK - Scripts criados" -ForegroundColor Green

# 2. Executar limpeza
Write-Host ""
Write-Host "2. Limpando banco..." -ForegroundColor Yellow
npx ts-node src/scripts/step1-clean.ts
Start-Sleep -Seconds 2

# 3. Executar import
Write-Host ""
Write-Host "3. Importando colaboradores..." -ForegroundColor Yellow
npx ts-node src/scripts/step2-import.ts
Start-Sleep -Seconds 2

# 4. Verificar
Write-Host ""
Write-Host "4. Verificando resultado..." -ForegroundColor Yellow
npx ts-node src/scripts/step3-verify.ts

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Processo concluido!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Teste os endpoints:" -ForegroundColor Cyan
Write-Host "  - http://localhost:3001/api/debug/total" -ForegroundColor Yellow
Write-Host "  - http://localhost:3001/api/debug/colaboradores-por-unidade" -ForegroundColor Yellow
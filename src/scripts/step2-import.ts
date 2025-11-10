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
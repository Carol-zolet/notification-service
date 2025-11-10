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

    // Split por COMMA (nÃ£o por TAB)
    const parts = line.split(',').map(s => s?.trim());
    
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
      console.error(`Erro ao inserir ${email}`);
      skipped++;
    }

    // Progress a cada 50
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
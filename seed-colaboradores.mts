import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function seed() {
  console.log(' Lendo CSV...');
  
  let csv = fs.readFileSync('./prisma/colaboradores.csv', 'utf-8');
  
  // Remover BOM se existir
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
    console.log(' BOM removido');
  }
  
  const lines = csv.split('\n').slice(1); // Pular cabeçalho
  
  console.log(` Processando ${lines.length} linhas...`);
  
  let inserted = 0;
  let skipped = 0;
  
  for (const line of lines) {
    if (!line.trim()) {
      skipped++;
      continue;
    }
    
    // USAR VÍRGULA como delimitador
    const parts = line.split(',');
    
    if (parts.length < 3) {
      console.log(` Linha ignorada (${parts.length} partes): ${line.substring(0, 50)}`);
      skipped++;
      continue;
    }
    
    const nome = parts[0]?.trim();
    const unidade = parts[1]?.trim();
    const email = parts[2]?.trim();
    
    if (nome && unidade && email) {
      try {
        await prisma.colaborador.create({
          data: { nome, unidade, email }
        });
        inserted++;
        
        if (inserted % 50 === 0) {
          console.log(`    ${inserted} inseridos...`);
        }
      } catch (e: any) {
        console.log(` Erro ao inserir "${nome}": ${e.message}`);
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`\n ${inserted} colaboradores inseridos!`);
  console.log(` ${skipped} linhas ignoradas`);
  
  const total = await prisma.colaborador.count();
  console.log(` Total no banco: ${total}`);
  
  await prisma.$disconnect();
}

seed().catch(e => {
  console.error(' Erro:', e);
  process.exit(1);
});

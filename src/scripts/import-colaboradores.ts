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
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const csvParser = require('csv-parser');

const prisma = new PrismaClient();

async function importarColaboradores() {
  console.log('🚀 Iniciando importação...\n');
  
  const colaboradores: any[] = [];
  
  fs.createReadStream('colaboradores.csv', { encoding: 'utf-8' })
    .pipe(csvParser({ separator: '\t' }))
    .on('data', (row: any) => {
      if (!row.Colaborador || !row['Email Pessoal']) return;
      
      colaboradores.push({
        nome: row.Colaborador.trim().toUpperCase(),
        email: row['Email Pessoal'].trim().toLowerCase(),
        unidade: row.Unidade.trim()
      });
    })
    .on('end', async () => {
      console.log(`📄 ${colaboradores.length} colaboradores no CSV\n`);
      
      let imported = 0;
      let errors = 0;
      
      for (const colab of colaboradores) {
        try {
          await prisma.colaborador.upsert({
            where: { email: colab.email },
            update: { nome: colab.nome, unidade: colab.unidade },
            create: colab
          });
          imported++;
          console.log(`✅ ${imported}/${colaboradores.length} - ${colab.nome}`);
        } catch (error: any) {
          errors++;
          console.error(`❌ ${colab.nome}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Importados: ${imported} | ❌ Erros: ${errors}\n`);
      await prisma.$disconnect();
    });
}

importarColaboradores();
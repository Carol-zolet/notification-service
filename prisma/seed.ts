import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');
  
  try {
    const csvPath = path.join(__dirname, '../prisma/colaboradores.csv');
    const csv = fs.readFileSync(csvPath, 'utf-8');
    
    const cleanCsv = csv.charCodeAt(0) === 0xFEFF ? csv.slice(1) : csv;
    
    const lines = cleanCsv.split('\n').filter(line => line.trim());
    let processados = 0;
    let duplicados = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const [nome, unidade, email] = lines[i].split(',').map(s => s.trim());
      
      if (!nome || !email || !unidade) continue;
      
      try {
        await prisma.colaborador.upsert({
          where: { email },
          update: { nome, unidade },
          create: { nome, unidade, email }
        });
        processados++;
      } catch (e) {
        duplicados++;
      }
    }
    
    console.log(`Inseridos/Atualizados: ${processados}`);
    console.log(`Duplicados/Pulados: ${duplicados}`);
    
  } catch (error) {
    console.error('Erro ao fazer seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function debug() {
  console.log(' Lendo CSV...');
  
  const csv = fs.readFileSync('./prisma/colaboradores.csv', 'utf-8');
  const lines = csv.split('\n');
  
  console.log(` Total de linhas: ${lines.length}`);
  console.log(` Cabeçalho: "${lines[0]}"`);
  console.log(` Primeira linha de dados: "${lines[1]}"`);
  console.log(` Segunda linha: "${lines[2]}"`);
  
  // Testar split por TAB
  const firstData = lines[1];
  const parts = firstData.split('\t');
  
  console.log(`\n Split por TAB:`);
  console.log(`   Partes encontradas: ${parts.length}`);
  parts.forEach((part, i) => {
    console.log(`   [${i}] = "${part}" (length: ${part.length})`);
  });
  
  // Testar com trim
  const [nome, unidade, email] = parts.map(s => s?.trim());
  console.log(`\n✂️ Depois do trim:`);
  console.log(`   Nome: "${nome}" (válido: ${!!nome})`);
  console.log(`   Unidade: "${unidade}" (válido: ${!!unidade})`);
  console.log(`   Email: "${email}" (válido: ${!!email})`);
  
  // Verificar encoding
  console.log(`\n🔤 Checando BOM/encoding:`);
  const firstChar = csv.charCodeAt(0);
  console.log(`   Primeiro char code: ${firstChar} (BOM: ${firstChar === 0xFEFF})`);
  
  await prisma.$disconnect();
}

debug().catch(e => {
  console.error(' Erro:', e);
  process.exit(1);
});

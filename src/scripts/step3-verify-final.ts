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
  console.log(`RESULTADO FINAL`);
  console.log(`========================================`);
  console.log(`Total de colaboradores: ${total}`);
  console.log(`Total de unidades: ${unidades.length}`);
  console.log(`========================================\n`);
  
  console.log('Top 15 unidades por quantidade:');
  unidades.slice(0, 15).forEach((u, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2, ' ')}. ${u.unidade.padEnd(20)} ${u._count.id} colaboradores`);
  });
  
  console.log(`\n...e mais ${Math.max(0, unidades.length - 15)} unidades\n`);
  
  process.exit(0);
})();
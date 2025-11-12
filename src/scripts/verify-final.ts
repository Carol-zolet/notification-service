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
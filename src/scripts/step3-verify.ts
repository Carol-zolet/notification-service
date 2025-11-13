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
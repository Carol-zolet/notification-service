import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.colaborador.count();
  
  const unidades = await prisma.colaborador.groupBy({
    by: ['unidade'],
    _count: { id: true },
  });

  console.log(`Total de colaboradores: ${total}`);
  console.log(`Total de unidades: ${unidades.length}`);
  console.log('');
  console.log('Distribuicao por unidade:');
  unidades.sort((a, b) => a.unidade.localeCompare(b.unidade)).forEach(u => {
    console.log(`  ${u.unidade}: ${u._count.id}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
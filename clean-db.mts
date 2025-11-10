import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clean() {
  const deleted = await prisma.colaborador.deleteMany({
    where: {
      OR: [
        { nome: { contains: 'generator' } },
        { nome: { contains: 'datasource' } },
        { nome: { contains: 'model' } },
        { email: { contains: 'provider' } },
      ],
    },
  });
  console.log(`✓ ${deleted.count} registros corrompidos removidos`);
  await prisma.$disconnect();
}

clean().catch(e => {
  console.error(e);
  process.exit(1);
});

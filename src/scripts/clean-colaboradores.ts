import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invalid = [
    'datasource db {',
    'generator client {',
    'model Colaborador {',
  ];

  for (const name of invalid) {
    const deleted = await prisma.colaborador.deleteMany({
      where: { nome: name },
    });
    if (deleted.count > 0) {
      console.log(`Removido ${deleted.count} registro(s): ${name}`);
    }
  }

  const total = await prisma.colaborador.count();
  console.log(`Total de colaboradores: ${total}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
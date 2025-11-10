import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.colaborador.deleteMany({});
  console.log(`Removidos ${deleted.count} registros`);
}

main().then(() => process.exit(0));
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const deleted = await prisma.colaborador.deleteMany({});
  console.log(`Removidos ${deleted.count} registros`);
  process.exit(0);
})();
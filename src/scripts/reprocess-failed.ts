import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../infra/services/nodemailer.service";
import { MockEmailService } from "../infra/services/mock-email.service";
import { ReprocessFailedNotificationsUseCase } from "../application/use-cases/reprocess-failed-notifications.use-case";

function boolEnv(v: string | undefined, def: boolean) {
  if (v == null) return def;
  return ["1","true","yes","on"].includes(v.toLowerCase());
}

async function main() {
  const prisma = new PrismaClient();
  const emailService = process.env.SMTP_HOST ? new NodemailerService() : new MockEmailService();

  const limit = process.env.RP_LIMIT ? Number(process.env.RP_LIMIT) : 200;
  const unidade = process.env.RP_UNIDADE;
  const ids = process.env.RP_IDS ? process.env.RP_IDS.split(",").map(s => s.trim()).filter(Boolean) : undefined;
  const batchSize = process.env.RP_BATCH ? Number(process.env.RP_BATCH) : 50;
  const maxRetries = process.env.RP_MAX_RETRIES ? Number(process.env.RP_MAX_RETRIES) : 1;
  const incrementalRetry = boolEnv(process.env.RP_INCREMENTAL_RETRY, true);
  const dryRun = boolEnv(process.env.RP_DRY_RUN, false);

  console.log(" Reprocess-failed (Prisma):", { limit, unidade, ids: ids?.length||0, batchSize, maxRetries, incrementalRetry, dryRun, service: emailService.constructor.name });

  const useCase = new ReprocessFailedNotificationsUseCase(prisma, emailService);
  const result = await useCase.execute({ limit, unidade, ids, batchSize, maxRetries, incrementalRetry, dryRun });

  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error("Erro fatal:", e); process.exit(1); });

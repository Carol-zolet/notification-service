import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { NodemailerService } from "../services/nodemailer.service";
import { MockEmailService } from "../services/mock-email.service";

export class NotificationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly prisma: PrismaClient;
  private readonly emailService: any;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = (process.env.NOTIFICATION_WORKER_ENABLED || "true").toLowerCase() === "true";
    this.intervalMs = Number(process.env.NOTIFICATION_WORKER_INTERVAL_MS || 60000);
    this.batchSize = Math.max(1, Number(process.env.NOTIFICATION_WORKER_BATCH_SIZE || 50));
    this.prisma = new PrismaClient();
    this.emailService = process.env.SMTP_HOST ? new NodemailerService() : new MockEmailService();
  }

  start() {
    if (!this.enabled) {
      console.log(" Worker desativado (NOTIFICATION_WORKER_ENABLED=false)");
      return;
    }
    if (this.intervalId) return;
    console.log(` Worker iniciado | intervalo=${this.intervalMs}ms batchSize=${this.batchSize} service=${this.emailService.constructor.name}`);
    this.runCycle();
    this.intervalId = setInterval(() => this.runCycle(), this.intervalMs);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await this.prisma.$disconnect();
    console.log("🛑 Worker parado.");
  }

  private async runCycle() {
    const start = Date.now();
    try {
      const now = new Date();
      const pending = await this.prisma.notification.findMany({
        where: {
          status: "pending",
          scheduledFor: { lte: now },  // ← CORRIGIDO
        },
        orderBy: { scheduledFor: "asc" },  // ← CORRIGIDO
        take: this.batchSize,
      });

      if (pending.length === 0) {
        console.log(" Worker: nada pendente.");
        return;
      }

      console.log(` Worker processando ${pending.length} notificações...`);

      for (const n of pending) {
        try {
          if (this.emailService.sendWithAttachments) {
            await this.emailService.sendWithAttachments(
              n.email,       // ← CORRIGIDO
              n.subject,
              n.message || "",  // ← CORRIGIDO
              []
            );
          } else {
            await (this.emailService as any).send({
              to: n.email,       // ← CORRIGIDO
              subject: n.subject,
              html: n.message || "",  // ← CORRIGIDO
            });
          }

          await this.prisma.notification.update({
            where: { id: n.id },
            data: {
              status: "sent",
              sentAt: new Date(),
              // errorMessage removido ← CORRIGIDO
            },
          });
        } catch (e: any) {
          console.error(` Falha ao enviar notificação ${n.id}:`, e.message);
          await this.prisma.notification.update({
            where: { id: n.id },
            data: {
              status: "failed",
              retryCount: n.retryCount + 1,
              // errorMessage removido ← CORRIGIDO
            },
          });
        }
      }

      const elapsed = Date.now() - start;
      console.log(` Worker: ${pending.length} processadas em ${elapsed}ms`);
    } catch (e: any) {
      console.error(" Erro no worker:", e.message);
    }
  }
}

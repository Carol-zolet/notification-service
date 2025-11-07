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
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: "asc" },
        take: 1000,
      });

      if (!pending.length) {
        console.log(" Worker: nada pendente.");
        return;
      }

      let processed = 0;
      let failed = 0;

      for (let i = 0; i < pending.length; i += this.batchSize) {
        const lote = pending.slice(i, i + this.batchSize);
        const results = await Promise.all(
          lote.map(async (n) => {
            try {
              await this.emailService.send({
                to: n.to,
                subject: n.subject || "Notificação",
                html: n.body || "",
              });
              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: "sent",
                  sentAt: new Date(),
                  errorMessage: null,
                },
              });
              return { ok: true };
            } catch (e: any) {
              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: "failed",
                  errorMessage: e.message,
                  retryCount: { increment: 1 },
                },
              });
              return { ok: false, error: e.message };
            }
          })
        );
        processed += results.filter((r) => r.ok).length;
        failed += results.filter((r) => !r.ok).length;
      }

      console.log(` Worker ciclo: processed=${processed} failed=${failed} duration=${Date.now()-start}ms`);
    } catch (e: any) {
      console.error(" Erro no worker:", e.message);
    }
  }
}

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
          // Normaliza chamadas de envio para aceitar ambos os serviços (mock e nodemailer)
          let result: any = undefined;

          if (typeof this.emailService.sendWithAttachments === 'function') {
            result = await this.emailService.sendWithAttachments(
              n.email,
              n.subject,
              n.message || "",
              []
            );
          } else if (typeof this.emailService.send === 'function') {
            result = await this.emailService.send(n.email, n.subject, n.message || "");
          } else {
            throw new Error('emailService has no send method');
          }

          // Verifica resultado: Nodemailer retorna um objeto 'info' com accepted/rejected.
          const accepted = result && (result.accepted || result.accepted === 0 ? result.accepted : undefined);
          const ok = (accepted === undefined) || (Array.isArray(accepted) && accepted.length > 0);

          if (!ok) {
            console.error(` Envio não aceito pelo servidor SMTP para notificação ${n.id}:`, { result });
            throw new Error('SMTP did not accept recipients');
          }

          console.log(` Notificação ${n.id} enviada com sucesso.`, { result });

          await this.prisma.notification.update({
            where: { id: n.id },
            data: {
              status: "sent",
              sentAt: new Date(),
            },
          });
        } catch (e: any) {
          console.error(` Falha ao enviar notificação ${n.id}:`, e?.message || e);
          try {
            await this.prisma.notification.update({
              where: { id: n.id },
              data: {
                status: "failed",
                retryCount: n.retryCount + 1,
              },
            });
          } catch (uerr) {
            console.error(` Erro ao atualizar status da notificação ${n.id}:`, uerr);
          }
        }
      }

      const elapsed = Date.now() - start;
      console.log(` Worker: ${pending.length} processadas em ${elapsed}ms`);
    } catch (e: any) {
      console.error(" Erro no worker:", e.message);
    }
  }
}

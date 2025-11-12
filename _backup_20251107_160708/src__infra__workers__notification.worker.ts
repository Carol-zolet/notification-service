import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SendDueNotificationsUseCase } from '../../application/use-cases/send-due-notifications.use-case';
import { NodemailerService } from '../services/nodemailer.service';
import { MockEmailService } from '../services/mock-email.service';
import type { IEmailService } from '../../application/services/IEmail.service';

interface WorkerStats {
  lastRunStartedAt?: Date;
  lastRunFinishedAt?: Date;
  lastProcessed?: number;
  lastFailed?: number;
  lastDurationMs?: number;
  totalProcessed: number;
  totalFailed: number;
}

export class NotificationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly prisma: PrismaClient;
  private readonly emailService: IEmailService;
  private readonly useCase: SendDueNotificationsUseCase;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly enabled: boolean;
  private stats: WorkerStats = {
    totalProcessed: 0,
    totalFailed: 0,
  };

  constructor() {
    this.enabled = (process.env.NOTIFICATION_WORKER_ENABLED || 'true').toLowerCase() === 'true';
    this.intervalMs = Number(process.env.NOTIFICATION_WORKER_INTERVAL_MS || 60_000); // default 60s
    this.batchSize = Math.max(1, Number(process.env.NOTIFICATION_WORKER_BATCH_SIZE || 50)); // default 50

    this.prisma = new PrismaClient();

    // Seleciona serviço de e-mail
    if (process.env.SMTP_HOST) {
      this.emailService = new NodemailerService();
    } else {
      this.emailService = new MockEmailService();
    }

    this.useCase = new SendDueNotificationsUseCase(
      {
        // Repositório Prisma simplificado inline para evitar dependências extras
        findPendingUntil: async (until: Date) => {
          return this.prisma.notification.findMany({
            where: {
              status: 'pending',
              scheduledAt: { lte: until },
            },
            orderBy: { scheduledAt: 'asc' },
          });
        },
        update: async (notificationId: string, data: any) =>
          this.prisma.notification.update({ where: { id: notificationId }, data }),
        // Outros métodos que o use-case possa precisar — se já existentes, substitua pelo import do repositório real:
        // findById, create, etc. (adicione conforme necessário)
      } as any,
      this.emailService
    );
  }

  start() {
    if (!this.enabled) {
      console.log('⚙️ Worker de notificações desativado (NOTIFICATION_WORKER_ENABLED=false).');
      return;
    }
    if (this.intervalId) return;
    console.log(
      `📨 Worker de notificações iniciado | intervalo=${this.intervalMs}ms | batchSize=${this.batchSize} | service=${this.emailService.constructor.name}`
    );
    this.runCycle(); // roda imediatamente uma vez
    this.intervalId = setInterval(() => this.runCycle(), this.intervalMs);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    await this.prisma.$disconnect();
    console.log('🛑 Worker de notificações parado.');
  }

  private async runCycle() {
    this.stats.lastRunStartedAt = new Date();
    const cycleStart = Date.now();

    try {
      const now = new Date();
      // Busca todas pendentes até agora
      const pending = await this.prisma.notification.findMany({
        where: {
          status: 'pending',
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      if (pending.length === 0) {
        this.finishCycle(0, 0, cycleStart, 0);
        return;
      }

      let processed = 0;
      let failed = 0;

      for (let i = 0; i < pending.length; i += this.batchSize) {
        const lote = pending.slice(i, i + this.batchSize);
        const results = await Promise.all(
          lote.map(async (n) => {
            try {
              // Usa case original (se já implementado) ou lógica inline:
              await this.emailService.send({
                to: n.to,
                subject: n.subject || 'Notificação',
                html: n.body || '',
              });

              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: 'sent',
                  sentAt: new Date(),
                },
              });

              return { ok: true };
            } catch (e) {
              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: 'failed',
                  errorMessage: (e as Error).message,
                },
              });
              return { ok: false, error: (e as Error).message };
            }
          })
        );

        processed += results.filter((r) => r.ok).length;
        failed += results.filter((r) => !r.ok).length;
      }

      this.finishCycle(processed, failed, cycleStart, pending.length - processed - failed);
    } catch (err: any) {
      console.error('❌ Erro no ciclo do worker:', err.message);
      this.finishCycle(0, 0, cycleStart, 0);
    }
  }

  private finishCycle(processed: number, failed: number, cycleStart: number, remaining: number) {
    const durationMs = Date.now() - cycleStart;
    this.stats.lastRunFinishedAt = new Date();
    this.stats.lastProcessed = processed;
    this.stats.lastFailed = failed;
    this.stats.lastDurationMs = durationMs;
    this.stats.totalProcessed += processed;
    this.stats.totalFailed += failed;

    console.log(
      `🔁 Worker ciclo concluído: processed=${processed} failed=${failed} remaining=${remaining} duration=${durationMs}ms totalProcessed=${this.stats.totalProcessed} totalFailed=${this.stats.totalFailed}`
    );
  }

  // Expor estatísticas se quiser consumir em um endpoint /api/worker/status
  getStats() {
    return this.stats;
  }
}

// Exemplo de uso em main.ts:
// const worker = new NotificationWorker();
// worker.start();
// process.on('SIGINT', async () => { await worker.stop(); process.exit(0); });

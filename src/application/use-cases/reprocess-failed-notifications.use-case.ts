import { PrismaClient } from "@prisma/client";
import type { IEmailService } from "../services/IEmail.service";

export interface ReprocessParams {
  limit?: number;
  unidade?: string;
  ids?: string[];
  batchSize?: number;
  maxRetries?: number;
  incrementalRetry?: boolean;
  dryRun?: boolean;
}

export class ReprocessFailedNotificationsUseCase {
  constructor(
    private prisma: PrismaClient,
    private emailService: IEmailService
  ) {}

  private wait(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async execute(params: ReprocessParams) {
    const {
      limit = 200,
      unidade,
      ids,
      batchSize = 50,
      maxRetries = 1,
      incrementalRetry = true,
      dryRun = false,
    } = params;

    const where: any = { status: "failed" };
    if (unidade) where.unidade = unidade;
    if (ids?.length) where.id = { in: ids };

    const failed = await this.prisma.notification.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: "asc" },
    });

    if (!failed.length) {
      return {
        processed: 0,
        failedAgain: 0,
        totalSelected: 0,
        items: [],
        message: "Nenhuma notificação failed encontrada",
      };
    }

    if (dryRun) {
      return {
        processed: 0,
        failedAgain: 0,
        totalSelected: failed.length,
        items: failed.slice(0, 20).map((n) => ({
          id: n.id,
            to: n.to,
            subject: n.subject,
            error: n.errorMessage,
        })),
        message: "Dry-run concluído",
      };
    }

    let processed = 0;
    let failedAgain = 0;
    const results: Array<{ id: string; to: string; subject: string | null; ok: boolean; attempts: number; error?: string }> = [];

    for (let i = 0; i < failed.length; i += batchSize) {
      const lote = failed.slice(i, i + batchSize);
      for (const n of lote) {
        let attempts = 0;
        let success = false;
        let lastError: string | undefined;

        while (attempts < maxRetries && !success) {
          attempts++;
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
                retryCount: { increment: 1 },
              },
            });

            success = true;
            processed++;
          } catch (e: any) {
            lastError = e?.message || "Erro";
            if (attempts >= maxRetries) {
              failedAgain++;
              await this.prisma.notification.update({
                where: { id: n.id },
                data: {
                  status: "failed",
                  errorMessage: lastError,
                  retryCount: { increment: 1 },
                },
              });
            } else if (incrementalRetry) {
              await this.wait(attempts * 500);
            }
          }
        }

        results.push({
          id: n.id,
          to: n.to,
          subject: n.subject,
          ok: success,
          attempts,
          error: lastError,
        });
      }
    }

    return {
      processed,
      failedAgain,
      totalSelected: failed.length,
      items: results.slice(0, 20),
      message: "Reprocessamento concluído",
    };
  }
}

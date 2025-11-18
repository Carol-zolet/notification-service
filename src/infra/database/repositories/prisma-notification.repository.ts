// src/infra/database/repositories/prisma-notification.repository.ts
import { PrismaClient } from "@prisma/client";

export class PrismaNotificationRepository {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findPendingNotifications(batchSize: number): Promise<any[]> {
    const now = new Date();
    
    return await this.prisma.notification.findMany({
      where: {
        status: "pending",
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: "asc" },
      take: batchSize,
    });
  }

  async updateNotificationStatus(
    id: string,
    status: string,
    sentAt?: Date
  ): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: {
        status,
        ...(sentAt && { sentAt }),
      },
    });
  }

  async incrementRetryCount(id: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { retryCount: true },
    });

    if (notification) {
      await this.prisma.notification.update({
        where: { id },
        data: {
          retryCount: notification.retryCount + 1,
        },
      });
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

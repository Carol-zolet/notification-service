import { PrismaClient } from '@prisma/client';
import { Notification as NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationRepository } from '../../../domain/repositories/INotification.repository';

export class PrismaNotificationRepository implements NotificationRepository {
  private prisma = new PrismaClient();

  async create(notification: NotificationEntity): Promise<NotificationEntity> {
    const created = await this.prisma.notification.create({
      data: {
        id: notification.id,
        email: notification.email,
        subject: notification.subject,
        message: notification.message,
        scheduledFor: notification.scheduledFor,
        status: notification.status,
        sentAt: notification.sentAt,
        createdAt: notification.createdAt,
      },
    });
    return created as unknown as NotificationEntity;
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return (row as unknown as NotificationEntity) ?? null;
  }

  async findPending(): Promise<NotificationEntity[]> {
    const rows = await this.prisma.notification.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
    });
    return rows as unknown as NotificationEntity[];
  }

  async update(notification: NotificationEntity): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: notification.status,
        sentAt: notification.sentAt,
      },
    });
  }
}

import { PrismaClient } from '@prisma/client';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationRepository } from '../../../domain/repositories/INotification.repository';

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: {
        email: data.email,
        subject: data.subject,
        message: data.message,
        scheduledFor: data.scheduledFor,
        status: data.status,
        sentAt: data.sentAt || null,
      },
    });

    return {
      id: created.id,
      email: created.email,
      subject: created.subject,
      message: created.message,
      scheduledFor: created.scheduledFor,
      status: created.status as 'pending' | 'sent' | 'failed',
      sentAt: created.sentAt,
      createdAt: created.createdAt,
    };
  }

  async findById(id: string): Promise<Notification | null> {
    const found = await this.prisma.notification.findUnique({ where: { id } });
    if (!found) return null;

    return {
      id: found.id,
      email: found.email,
      subject: found.subject,
      message: found.message,
      scheduledFor: found.scheduledFor,
      status: found.status as 'pending' | 'sent' | 'failed',
      sentAt: found.sentAt,
      createdAt: found.createdAt,
    };
  }

  async findPending(): Promise<Notification[]> {
    const results = await this.prisma.notification.findMany({
      where: { status: 'pending' },
    });

    return results.map((r) => ({
      id: r.id,
      email: r.email,
      subject: r.subject,
      message: r.message,
      scheduledFor: r.scheduledFor,
      status: r.status as 'pending' | 'sent' | 'failed',
      sentAt: r.sentAt,
      createdAt: r.createdAt,
    }));
  }

  async findPendingUntil(date: Date): Promise<Notification[]> {
    const results = await this.prisma.notification.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: date },
      },
    });

    return results.map((r) => ({
      id: r.id,
      email: r.email,
      subject: r.subject,
      message: r.message,
      scheduledFor: r.scheduledFor,
      status: r.status as 'pending' | 'sent' | 'failed',
      sentAt: r.sentAt,
      createdAt: r.createdAt,
    }));
  }

  async update(notification: Notification): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: notification.status,
        sentAt: notification.sentAt,
      },
    });
  }
}

import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationRepository } from '../../../domain/repositories/INotification.repository';

export class InMemoryNotificationRepository implements NotificationRepository {
  private items: Notification[] = [];

  async create(notification: Notification): Promise<Notification> {
    this.items.push(notification);
    return notification;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.items.find(n => n.id === id) ?? null;
  }

  async findPending(): Promise<Notification[]> {
    const now = new Date();
    return this.items
      .filter(n => n.status === 'pending' && n.scheduledFor <= now)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  async update(notification: Notification): Promise<void> {
    const idx = this.items.findIndex(n => n.id === notification.id);
    if (idx >= 0) {
      this.items[idx] = notification;
    }
  }

  clear(): void {
    this.items = [];
  }
}

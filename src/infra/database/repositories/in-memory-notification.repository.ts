import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationRepository } from '../../../domain/repositories/INotification.repository';

export class InMemoryNotificationRepository implements NotificationRepository {
  private notifications: Notification[] = [];

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };
    this.notifications.push(newNotification);
    return newNotification;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.find(n => n.id === id) || null;
  }

  async findPending(): Promise<Notification[]> {
    return this.notifications.filter(n => n.status === 'pending');
  }

  async findPendingUntil(until: Date): Promise<Notification[]> {
    return this.notifications.filter(
      n => n.status === 'pending' && n.scheduledFor <= until
    );
  }

  async update(notification: Notification): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      this.notifications[index] = notification;
    }
  }
}

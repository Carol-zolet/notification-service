import { Notification } from '../entities/notification.entity';

export interface NotificationRepository {
  findPending(): Promise<Notification[]>;
  update(notification: Notification): Promise<void>;
  create(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
}

import { NotificationRepository } from '../../domain/repositories/INotification.repository';
import { Notification } from '../../domain/entities/notification.entity';
import { ScheduleNotificationDTO } from '../dtos/schedule-notification.dto';
import { randomUUID } from 'crypto';

export class ScheduleNotificationUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: ScheduleNotificationDTO): Promise<Notification> {
    const notification: Notification = {
      id: randomUUID(),
      email: input.email,
      subject: input.subject,
      message: input.message,
      scheduledFor: new Date(input.scheduledFor),
      status: 'pending',
      sentAt: null,
      createdAt: new Date(),
    };

    return await this.notificationRepository.create(notification);
  }
}

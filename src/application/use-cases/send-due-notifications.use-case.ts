import { NotificationRepository } from '../../domain/repositories/INotification.repository';
import { IEmailService } from '../services/IEmail.service';

export class SendDueNotificationsUseCase {
  constructor(
    private notificationRepository: NotificationRepository,
    private emailService: IEmailService
  ) {}

  async execute(): Promise<void> {
    const now = new Date();
    const pending = await this.notificationRepository.findPendingUntil(now);

    for (const notification of pending) {
      try {
        await this.emailService.send(
          notification.email,
          notification.subject,
          notification.message
        );
        notification.status = 'sent';
        notification.sentAt = new Date();
      } catch (error) {
        notification.status = 'failed';
        console.error('Erro ao enviar notificação:', error);
      }
      await this.notificationRepository.update(notification);
    }
  }
}

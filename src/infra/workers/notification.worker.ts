import { SendDueNotificationsUseCase } from '../../application/use-cases/send-due-notifications.use-case';
import { PrismaNotificationRepository } from '../database/repositories/prisma-notification.repository';
import { NodemailerService } from '../services/nodemailer.service';
import { MockEmailService } from '../services/mock-email.service';
import { PrismaClient } from '@prisma/client';

export class NotificationWorker {
  constructor(intervalMs: number) {
    console.log(`⏰ Worker de notificações iniciado. Intervalo: ${intervalMs}ms`);
    setInterval(async () => {
      const repository = new PrismaNotificationRepository();
      const emailService = process.env.SMTP_HOST ? new NodemailerService() : new MockEmailService();
      const useCase = new SendDueNotificationsUseCase(repository, emailService);
      await useCase.execute();
    }, intervalMs);
  }
}

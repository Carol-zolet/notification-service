/**
 * Local types to avoid missing-module compile errors.
 * These mirror the minimal surface used by this use-case.
 */
type NotificationStatus = 'pending' | 'sent' | 'failed' | string;

interface Notification {
  id: string;
  email: string;
  subject: string;
  message: string;
  scheduledFor: string | Date;
  status?: NotificationStatus;
  sentAt?: Date | null;
}

interface NotificationRepository {
  findPending(): Promise<Notification[]>;
  update(notification: Notification): Promise<void>;
}

interface EmailService {
  send(params: { to: string; subject: string; body: string }): Promise<void>;
}

export class SendDueNotificationsUseCase {
  constructor(
    private notificationRepository: NotificationRepository,
    private emailService: EmailService
  ) {}

  async execute(): Promise<void> {
    try {
      console.log('Verificando notificações pendentes...');
      
      // Busca notificações pendentes que devem ser enviadas
      const notifications = await this.notificationRepository.findPending();
      
      if (notifications.length === 0) {
        console.log('Nenhuma notificação pendente encontrada.');
        return;
      }

      console.log(`Encontradas ${notifications.length} notificações para processar.`);

      // Processa cada notificação
      for (const notification of notifications) {
        try {
          // Verifica se já está na hora de enviar
          if (new Date(notification.scheduledFor) <= new Date()) {
            await this.emailService.send({
              to: notification.email,
              subject: notification.subject,
              body: notification.message
            });

            // Marca como enviada
            notification.status = 'sent';
            notification.sentAt = new Date();
            await this.notificationRepository.update(notification);

            console.log(`Notificação ${notification.id} enviada com sucesso.`);
          }
        } catch (error) {
          console.error(`Erro ao enviar notificação ${notification.id}:`, error);
          
          // Marca como falha
          notification.status = 'failed';
          await this.notificationRepository.update(notification);
        }
      }
    } catch (error) {
      console.error('Erro ao processar notificações:', error);
      throw error;
    }
  }
}
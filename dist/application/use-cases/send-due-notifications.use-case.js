"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendDueNotificationsUseCase = void 0;
class SendDueNotificationsUseCase {
    repository;
    emailService;
    batchSize;
    constructor(repository, emailService) {
        this.repository = repository;
        this.emailService = emailService;
        this.batchSize = Number(process.env.NOTIFICATION_WORKER_BATCH_SIZE || 50);
    }
    async execute() {
        try {
            const notifications = await this.repository.findPendingNotifications(this.batchSize);
            if (notifications.length === 0) {
                console.log("✓ Nenhuma notificação pendente");
                return;
            }
            console.log(`📧 Processando ${notifications.length} notificações...`);
            for (const notification of notifications) {
                await this.processNotification(notification);
            }
            console.log(`✓ ${notifications.length} notificações processadas`);
        }
        catch (error) {
            console.error("❌ Erro ao processar notificações:", error);
            throw error;
        }
    }
    async processNotification(notification) {
        try {
            let result;
            // Tenta enviar com attachments primeiro, depois fallback para send simples
            if (typeof this.emailService.sendWithAttachments === 'function') {
                result = await this.emailService.sendWithAttachments(notification.email, notification.subject, notification.message || "", []);
            }
            else if (typeof this.emailService.send === 'function') {
                result = await this.emailService.send(notification.email, notification.subject, notification.message || "");
            }
            else {
                throw new Error('EmailService não possui método send ou sendWithAttachments');
            }
            // Valida o resultado do envio
            const accepted = result?.accepted;
            const isAccepted = !accepted || (Array.isArray(accepted) && accepted.length > 0);
            if (!isAccepted) {
                console.error(`❌ SMTP não aceitou destinatários para notificação ${notification.id}`);
                throw new Error('SMTP não aceitou destinatários');
            }
            // Atualiza status para enviado
            await this.repository.updateNotificationStatus(notification.id, "sent", new Date());
            console.log(`✓ Notificação ${notification.id} enviada para ${notification.email}`);
        }
        catch (error) {
            console.error(`❌ Falha ao enviar notificação ${notification.id}:`, error.message);
            try {
                await this.repository.updateNotificationStatus(notification.id, "failed");
                await this.repository.incrementRetryCount(notification.id);
            }
            catch (updateError) {
                console.error(`❌ Erro ao atualizar status da notificação ${notification.id}:`, updateError);
            }
        }
    }
}
exports.SendDueNotificationsUseCase = SendDueNotificationsUseCase;

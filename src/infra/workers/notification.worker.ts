import { SendDueNotificationsUseCase } from '../../../application/use-cases/send-due-notifications.use-cases';
import { PrismaNotificationRepository } from '../database/repositories/prisma-notification.repository';
import { NodemailerService } from '../services/nodemailer.service';

export class NotificationWorker {
    private readonly useCase: SendDueNotificationsUseCase;

    constructor() {
        const repo = new PrismaNotificationRepository();
        const email = new NodemailerService();
        this.useCase = new SendDueNotificationsUseCase(repo, email);
    }

    async executeJob() {
        console.log('[Worker] Verificando notificações pendentes...');
        try {
            await this.useCase.execute();
            console.log('[Worker] Ciclo concluído com sucesso.\n');
        } catch (err) {
            console.error('[Worker] Erro ao processar notificações:', err);
        }
    }

    start(intervalMs: number = 60000) { 
        console.log(`[Worker] Iniciado. Intervalo: ${intervalMs / 1000} segundos\n`);
        this.executeJob();
        setInterval(() => this.executeJob(), intervalMs);
    }
}

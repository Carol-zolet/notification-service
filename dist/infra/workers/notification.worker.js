"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationWorker = void 0;
const send_due_notifications_use_case_1 = require("../../application/use-cases/send-due-notifications.use-case");
const prisma_notification_repository_1 = require("../database/repositories/prisma-notification.repository");
const nodemailer_service_1 = require("../services/nodemailer.service");
const mock_email_service_1 = require("../services/mock-email.service");
class NotificationWorker {
    constructor(intervalMs) {
        console.log(`⏰ Worker de notificações iniciado. Intervalo: ${intervalMs}ms`);
        setInterval(async () => {
            const repository = new prisma_notification_repository_1.PrismaNotificationRepository();
            const emailService = process.env.SMTP_HOST ? new nodemailer_service_1.NodemailerService() : new mock_email_service_1.MockEmailService();
            const useCase = new send_due_notifications_use_case_1.SendDueNotificationsUseCase(repository, emailService);
            await useCase.execute();
        }, intervalMs);
    }
}
exports.NotificationWorker = NotificationWorker;

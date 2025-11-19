"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleNotificationUseCase = void 0;
const crypto_1 = require("crypto");
class ScheduleNotificationUseCase {
    notificationRepository;
    constructor(notificationRepository) {
        this.notificationRepository = notificationRepository;
    }
    async execute(input) {
        const notification = {
            id: (0, crypto_1.randomUUID)(),
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
exports.ScheduleNotificationUseCase = ScheduleNotificationUseCase;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaNotificationRepository = void 0;
// src/infra/database/repositories/prisma-notification.repository.ts
const client_1 = require("@prisma/client");
class PrismaNotificationRepository {
    prisma;
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    async findPendingNotifications(batchSize) {
        const now = new Date();
        return await this.prisma.notification.findMany({
            where: {
                status: "pending",
                scheduledFor: { lte: now },
            },
            orderBy: { scheduledFor: "asc" },
            take: batchSize,
        });
    }
    async updateNotificationStatus(id, status, sentAt) {
        await this.prisma.notification.update({
            where: { id },
            data: {
                status,
                ...(sentAt && { sentAt }),
            },
        });
    }
    async incrementRetryCount(id) {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
            select: { retryCount: true },
        });
        if (notification) {
            await this.prisma.notification.update({
                where: { id },
                data: {
                    retryCount: notification.retryCount + 1,
                },
            });
        }
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
}
exports.PrismaNotificationRepository = PrismaNotificationRepository;

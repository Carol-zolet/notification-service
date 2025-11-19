"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryNotificationRepository = void 0;
class InMemoryNotificationRepository {
    notifications = [];
    async create(notification) {
        const newNotification = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
        };
        this.notifications.push(newNotification);
        return newNotification;
    }
    async findById(id) {
        return this.notifications.find(n => n.id === id) || null;
    }
    async findPending() {
        return this.notifications.filter(n => n.status === 'pending');
    }
    async findPendingUntil(until) {
        return this.notifications.filter(n => n.status === 'pending' && n.scheduledFor <= until);
    }
    async update(notification) {
        const index = this.notifications.findIndex(n => n.id === notification.id);
        if (index !== -1) {
            this.notifications[index] = notification;
        }
    }
}
exports.InMemoryNotificationRepository = InMemoryNotificationRepository;

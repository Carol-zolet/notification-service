"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Arquivo standalone para rodar o worker independentemente do servidor HTTP
require("dotenv/config");
const notification_worker_1 = require("./infra/workers/notification.worker");
console.log("🤖 Iniciando Worker de Notificações...\n");
const intervalMs = parseInt(process.env.NOTIFICATION_WORKER_INTERVAL_MS || "60000", 10);
new notification_worker_1.NotificationWorker(intervalMs);

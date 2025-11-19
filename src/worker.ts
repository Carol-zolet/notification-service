// Arquivo standalone para rodar o worker independentemente do servidor HTTP
import "dotenv/config";
import { NotificationWorker } from "./infra/workers/notification.worker";

console.log("🤖 Iniciando Worker de Notificações...\n");

const intervalMs = parseInt(process.env.NOTIFICATION_WORKER_INTERVAL_MS || "60000", 10);
new NotificationWorker(intervalMs);

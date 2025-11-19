"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./infra/http/routes"));
const notification_worker_1 = require("./infra/workers/notification.worker");
const app = (0, express_1.default)();
// Middlewares
app.use(express_1.default.json());
// Rotas de saúde
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Rotas de notificações
app.use("/notifications", routes_1.default);
// Tratamento de erros global
app.use((err, _req, res, _next) => {
    console.error("Erro não tratado:", err);
    res.status(500).json({
        error: "Erro interno do servidor",
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// Inicia o servidor
const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    // Inicia o worker de notificações
    const intervalMs = parseInt(process.env.NOTIFICATION_WORKER_INTERVAL_MS || "60000", 10);
    new notification_worker_1.NotificationWorker(intervalMs);
});

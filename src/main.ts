import "dotenv/config";
import express from "express";
import cors from "cors";
import notificationRoutes from './infra/http/routes';
import { NotificationWorker } from "./infra/workers/notification.worker";


const app = express();

// CORS seguro
const allowedOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

// Middlewares
app.use(express.json());

// Rotas de saúde
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas de notificações
app.get('/', (req, res) => {
  res.send({ status: 'API online' });
});

app.use("/", notificationRoutes);

// Tratamento de erros global
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
  new NotificationWorker(intervalMs);
});

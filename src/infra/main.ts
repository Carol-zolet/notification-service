import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import router from './http/routes';
import { NotificationWorker } from './workers/notification.worker';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = express();

// Prisma client usado para healthcheck e possíveis checagens em runtime
const prisma = new PrismaClient();

// CORS restritivo: construir lista de origens permitidas a partir de variáveis
// FRONTEND_URL (única) e CORS_ORIGIN (lista separada por vírgulas opcional).
const extraOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(o => !!o);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  ...extraOrigins,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Requests sem origin (curl, Postman) são permitidos para facilitar monitoramento.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('[CORS] origem não permitida:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Request logger (leve) para ajudar a diagnosticar 500s ativados por headers
app.use((req: any, _res: any, next: any) => {
  try {
    const origin = req.headers?.origin || '(nenhum)';
    const ct = req.headers?.['content-type'] || '(sem content-type)';
    console.log(`[REQ] ${req.method} ${req.url} - Origin: ${origin} - Content-Type: ${ct}`);
  } catch (err) {
    console.warn('[REQ] falha ao logar request:', err);
  }
  next();
});

app.use(express.json());
// Expor as rotas em /api/v1 (versionamento centralizado no mount). Mantemos o
// alias /api/health para compatibilidade com checks antigos.
app.use('/api/v1', router);

// Health endpoint simples (útil para monitoramento / debug)
const healthHandler = async (req: any, res: any) => {
  try {
    // tenta uma verificação simples no banco — não é intensiva
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err: any) {
    // log leve para ajudar debugging em production
    console.error('Health check DB failed:', err?.message || err);
    res.status(500).json({ status: 'error', database: 'unreachable', error: String(err?.message || err) });
  }
};

app.get('/health', healthHandler);
// Alias para clientes que esperam o health sob /api/health
app.get('/api/health', healthHandler);

const worker = new NotificationWorker();
worker.start();

// Global error handler: log e retorna JSON em vez de page HTML genérica.
// Isso facilita inspecionar a mensagem no cliente e nos logs do Render.
app.use((err: any, _req: any, res: any, next: any) => {
  try {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
  } catch (logErr) {
    console.error('Erro ao logar erro global:', logErr);
  }

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) });
});

// Process-level handlers para capturar promessas rejeitadas e exceções não tratadas
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});

app.listen(process.env.PORT ? parseInt(process.env.PORT,10) : 3001, () => {
  console.log(`Servidor de Alertas API rodando na porta ${process.env.PORT || 3001}`);
  // Logs de startup úteis para depuração de CORS em produção (não expõem segredos)
  try {
    console.log('Allowed origins:', allowedOrigins);
    console.log('FRONTEND_URL presente:', !!process.env.FRONTEND_URL, 'valor:', process.env.FRONTEND_URL || '(não definido)');
  } catch (err) {
    // segurança: qualquer erro de logging não deve impedir o servidor
    console.warn('Erro ao logar configuração de CORS:', err);
  }
});


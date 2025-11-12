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

// CORS para permitir chamadas do frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL, // URL do frontend na Vercel
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como Postman, curl, etc) OU das origens permitidas
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

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

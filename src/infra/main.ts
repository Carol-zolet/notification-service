import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import router from './http/routes';
import { NotificationWorker } from './workers/notification.worker';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = express();

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
app.use('/api', router);

const worker = new NotificationWorker();
worker.start();

app.listen(process.env.PORT ? parseInt(process.env.PORT,10) : 3001, () => {
  console.log(`Servidor de Alertas API rodando na porta ${process.env.PORT || 3001}`);
});

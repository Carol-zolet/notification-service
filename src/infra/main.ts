import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import router from './http/routes';
import { NotificationWorker } from './workers/notification.worker';

const PORT = process.env.PORT || 3001;
const app = express();

// CORS para permitir chamadas do frontend (http://localhost:5173)
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json());
app.use('/api', router);

const worker = new NotificationWorker();
worker.start();

app.listen(PORT, () => {
  console.log(`Servidor de Alertas API rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

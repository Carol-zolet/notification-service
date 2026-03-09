import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import payslipRoutes from './http/routes/payslip.routes';
import { router } from './http/routes';

const app = express();

// Security headers
app.use(helmet());

// CORS - only allow explicitly configured origins; never fall back to wildcard
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: allowedOrigins.length > 0,
}));

// Global rate limit – 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Stricter rate limit for email-sending and mutating endpoints
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many email requests, please try again later.' },
});
app.use('/payslips/process', emailLimiter);
app.use('/payslips/process-split', emailLimiter);
app.use('/payslips/distribuir', emailLimiter);
app.use('/notifications/reprocess', emailLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir o index.html na rota raiz
app.use(express.static('public'));

// Rotas
app.use('/api/v1/payslips', payslipRoutes);
app.use(router); // <-- ADICIONA TODAS AS OUTRAS ROTAS

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📧 Email Service: ${process.env.SMTP_HOST ? 'NodemailerService (REAL)' : 'MockEmailService (SIMULADO)'}`);
});

// Configurar timeouts generosos para envio de emails
server.setTimeout(600000); // 10 minutos
server.keepAliveTimeout = 600000;
server.headersTimeout = 610000;

process.on('unhandledRejection', (reason) => {
  console.error('❌ [UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (error) => {
  console.error('❌ [UNCAUGHT EXCEPTION]', error);
});

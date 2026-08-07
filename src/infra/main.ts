import express from 'express';
import cors from 'cors';
import payslipRoutes from './http/routes/payslip.routes';
import importRoutes from './http/routes/import.routes';
import authRoutes from './http/routes/auth.routes';
import { requireAuth } from './http/middleware/auth.middleware';
import { router } from './http/routes';
import { iniciarPayslipRetryWorker } from './workers/payslip-retry.worker';

const app = express();

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir o index.html na rota raiz
app.use(express.static('public'));

// Rotas
app.use('/api/v1/payslips', payslipRoutes);

// Auth: pública (é aqui que se consegue o token, então não pode exigir token)
app.use('/auth', authRoutes);

// A partir daqui, tudo que for /colaboradores, /unidades, /admin, /import,
// /notifications ou /payslips exige um JWT válido — confirmado que nenhuma
// automação externa (cron, workflow, webhook) depende dessas rotas sem login;
// só o próprio frontend logado as usa.
app.use(['/colaboradores', '/unidades', '/admin', '/import', '/notifications', '/payslips'], requireAuth);

app.use('/import', importRoutes);
app.use(router); // <-- ADICIONA TODAS AS OUTRAS ROTAS

// Rotas de debug: NUNCA em produção. Isoladas em arquivo próprio pra não
// correr risco de subir sem querer num deploy futuro.
if (process.env.NODE_ENV !== 'production') {
  const { debugRouter } = require('./http/routes/debug.routes');
  app.use(debugRouter);
  console.log('⚠️  Rotas /debug/* ativas (NODE_ENV != production)');
} else {
  console.log('🔒 Rotas /debug/* desativadas (produção)');
}

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📧 Email Service: ${process.env.SMTP_HOST ? 'NodemailerService (REAL)' : 'MockEmailService (SIMULADO)'}`);
  console.log(`📨 SMTP Host: ${process.env.SMTP_HOST || 'NÃO CONFIGURADO'}`);
  console.log(`👤 SMTP User: ${process.env.SMTP_USER || 'NÃO CONFIGURADO'}`);

  iniciarPayslipRetryWorker();
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

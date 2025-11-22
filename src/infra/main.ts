import express from 'express';
import cors from 'cors';
import payslipRoutes from './http/routes/payslip.routes';
import { router } from './http/routes';

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
app.use(router); // <-- ADICIONA TODAS AS OUTRAS ROTAS

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📧 Email Service: ${process.env.SMTP_HOST ? 'NodemailerService (REAL)' : 'MockEmailService (SIMULADO)'}`);
  console.log(`📨 SMTP Host: ${process.env.SMTP_HOST || 'NÃO CONFIGURADO'}`);
  console.log(`👤 SMTP User: ${process.env.SMTP_USER || 'NÃO CONFIGURADO'}`);
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

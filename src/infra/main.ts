
import express = require('express');
import cors = require('cors');
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
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

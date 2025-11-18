import express from 'express';
import cors from 'cors'; // <--- ADICIONADO
import routes from './http/routes';

const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
app.use(cors({
    origin: [
        "http://localhost:5173",              // Para testar no seu PC
        "http://localhost:3000",
        "https://carolinenotificacoes.page",      // Seu domínio novo
        "https://www.carolinenotificacoes.page",  // Seu domínio com WWW
        "https://api.carolinenotificacoes.page"
    ],
    credentials: true
}));
// ----------------------------------------

app.use(express.json());
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(' Servidor de Alertas API rodando na porta ' + PORT);
  console.log(' Health check: http://localhost:' + PORT + '/api/health');
  console.log('');
});

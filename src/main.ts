import express from 'express';
import cors from 'cors';
import routes from './http/routes';

// Esta é a porta PRINCIPAL que o Render deve usar.
// O valor 10000 foi removido. Se o Render falhar, usará 3001 (local).
const PORT = process.env.PORT || 3001;

const app = express(); // 🛠️ CORRIGIDO: Agora 'app' está definido neste escopo

// --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://carolinenotificacoes.page",
        "https://www.carolinenotificacoes.page",
        "https://api.carolinenotificacoes.page"
    ],
    credentials: true
}));
// ----------------------------------------

app.use(express.json());
app.use('/api', routes);

// O '0.0.0.0' garante que o container escute em todas as interfaces, obrigatório no Render.
app.listen(PORT, '0.0.0.0', () => {
    // 💡 Ajuste de log: Usamos a porta dinâmica do Render
    console.log(`Servidor de Alertas API rodando na porta ${PORT}`);
    console.log(`Health check: /api/health`);
});

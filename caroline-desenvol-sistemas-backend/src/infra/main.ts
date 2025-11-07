import express from 'express';
import routes from './http/routes';
import './workers/notification.worker';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(' Servidor de Alertas API rodando na porta ' + PORT);
  console.log(' Health check: http://localhost:' + PORT + '/api/health');
  console.log('');
});

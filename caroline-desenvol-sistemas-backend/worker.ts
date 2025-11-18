// ARQUIVO: worker.ts

// Importa e executa apenas a lógica do Worker.
import { NotificationWorker } from './workers/notification.worker';

// Inicia o worker com o intervalo desejado (60 segundos)
new NotificationWorker().start(60000);

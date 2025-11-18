// Este arquivo deve ser executado APENAS no serviço Worker do Render.

import { NotificationWorker } from './infra/workers/notification.worker'; 

// Inicia o processo de worker que roda em intervalo (setInterval)
new NotificationWorker().start(60000); 

console.log('Serviço Worker iniciado com sucesso.');

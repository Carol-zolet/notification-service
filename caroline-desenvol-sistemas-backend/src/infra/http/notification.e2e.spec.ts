import request from 'supertest';
import express from 'express';
import apiRoutes from './routes';

describe('Notificações - API', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);
  });

  it('deve agendar uma notificação com sucesso', async () => {
    const response = await request(app)
      .post('/api/notifications/schedule')
      .send({
        email: 'teste@exemplo.com',
        subject: 'Assunto de Teste',
        message: 'Corpo da notificação',
        scheduledFor: new Date(Date.now() + 60000).toISOString()
      });
    
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', 'teste@exemplo.com');
    expect(response.body).toHaveProperty('status', 'pending');
  });
});

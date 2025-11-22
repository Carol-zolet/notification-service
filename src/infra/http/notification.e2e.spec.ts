import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { router } from './routes';

const prisma = new PrismaClient();

// Criar app de teste
const app = express();
app.use(express.json());
app.use('/api', router);

describe('Notificações - API', () => {
  // Aumentar timeout para 30 segundos
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Garantir conexão com banco
    await prisma.$connect();
  });

  afterAll(async () => {
    // Limpar e fechar conexões
    await prisma.notification.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.$disconnect();
  });

  it('deve agendar uma notificação com sucesso', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .send({
        email: 'test@exemplo.com',
        subject: 'Teste',
        message: 'Mensagem de teste',
        scheduledAt: new Date().toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@exemplo.com');
    expect(response.body.status).toBe('pending');
  });

  it('deve retornar erro 400 se email não for fornecido', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .send({
        subject: 'Teste',
        message: 'Mensagem',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('email');
  });

  it('deve listar notificações', async () => {
    const response = await request(app)
      .get('/api/notifications');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('items');
    expect(Array.isArray(response.body.items)).toBe(true);
  });
});

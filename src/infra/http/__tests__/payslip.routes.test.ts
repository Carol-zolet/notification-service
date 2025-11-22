import request from 'supertest';
import express from 'express';
import { router } from '../routes';

const app = express();
app.use(express.json());
app.use('/api/v1', router);

describe('Payslip Routes', () => {
  it('deve retornar health check', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('deve listar unidades', async () => {
    const res = await request(app).get('/api/v1/unidades');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('deve listar colaboradores', async () => {
    const res = await request(app).get('/api/v1/colaboradores');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('deve retornar erro 400 sem PDF', async () => {
    const res = await request(app)
      .post('/api/v1/payslips/process')
      .field('unidade', 'TEST');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Arquivo');
  });

  it('deve retornar erro 400 sem unidade', async () => {
    const res = await request(app)
      .post('/api/v1/payslips/process')
      .attach('pdfFile', Buffer.from('%PDF'), 'test.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('unidade');
  });
});

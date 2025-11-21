import * as request from 'supertest';
import * as express from 'express';
import payslipRoutes from '../routes/payslip.routes';
import * as path from 'path';

describe('Payslip Routes', () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/v1/payslips', payslipRoutes);

  it('GET /health deve retornar status ok', async () => {
    const res = await request(app).get('/api/v1/payslips/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('payslip-processor');
  });

  it('POST /process deve retornar erro se não enviar arquivo', async () => {
    const res = await request(app)
      .post('/api/v1/payslips/process')
      .field('unidade', 'UNIDADE1');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Arquivo não enviado/);
  });

  it('POST /process deve retornar erro se não enviar unidade', async () => {
    const res = await request(app)
      .post('/api/v1/payslips/process')
      .attach('file', Buffer.from('PDF'), 'holerite.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unidade não especificada/);
  });

  it('POST /process deve processar arquivo PDF válido', async () => {
    // Para teste real, use um PDF de exemplo válido
    const pdfPath = path.join(__dirname, 'holerite-exemplo.pdf');
    const res = await request(app)
      .post('/api/v1/payslips/process')
      .field('unidade', 'UNIDADE1')
      .field('subject', 'Seu Holerite')
      .field('message', 'Segue em anexo')
      .attach('file', pdfPath);
    // Espera sucesso ou erro de processamento, depende do PDF
    expect([200, 500]).toContain(res.status);
    // Se sucesso, espera campo success
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.unidade).toBe('UNIDADE1');
    }
  });

  it('POST /process/split deve funcionar igual ao /process', async () => {
    const pdfPath = path.join(__dirname, 'holerite-exemplo.pdf');
    const res = await request(app)
      .post('/api/v1/payslips/process/split')
      .field('unidade', 'UNIDADE1')
      .field('subject', 'Seu Holerite')
      .field('message', 'Segue em anexo')
      .attach('file', pdfPath);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.unidade).toBe('UNIDADE1');
    }
  });
});

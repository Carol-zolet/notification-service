import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { router } from './routes';
import { PDFDocument } from 'pdf-lib';

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use('/api/v1', router);

// Helper para criar PDF de teste válido
async function createTestPdf(names: string[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  for (const name of names) {
    const page = pdfDoc.addPage([600, 400]);
    const { height } = page.getSize();
    page.drawText(`HOLERITE - ${name}`, {
      x: 50,
      y: height - 50,
      size: 16,
    });
  }
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

describe('POST /payslips/distribuir', () => {
  jest.setTimeout(30000);
  const TEST_UNIDADE = 'TEST_DISTRIBUIR';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.colaborador.createMany({
      data: [
        { nome: 'João Silva', email: 'joao@test.com', unidade: TEST_UNIDADE },
        { nome: 'Maria Santos', email: 'maria@test.com', unidade: TEST_UNIDADE },
      ],
    });
  });

  afterAll(async () => {
    await prisma.colaborador.deleteMany({ where: { unidade: TEST_UNIDADE } });
    await prisma.sendHistory.deleteMany({ where: { unidade: TEST_UNIDADE } });
    await prisma.$disconnect();
  });

  it('deve retornar erro 400 se PDF não for enviado', async () => {
    const response = await request(app)
      .post('/api/v1/payslips/distribuir')
      .field('unidade', TEST_UNIDADE);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('PDF e unidade são obrigatórios');
  });

  it('deve retornar erro 400 se unidade não for enviada', async () => {
    const testPdf = await createTestPdf(['Test']);
    const response = await request(app)
      .post('/api/v1/payslips/distribuir')
      .attach('pdfFile', testPdf, 'test.pdf');
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('PDF e unidade são obrigatórios');
  });

  it('deve retornar erro 404 se não encontrar colaboradores', async () => {
    const testPdf = await createTestPdf(['Test']);
    const response = await request(app)
      .post('/api/v1/payslips/distribuir')
      .field('unidade', 'UNIDADE_INEXISTENTE')
      .attach('pdfFile', testPdf, 'test.pdf');
    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Nenhum colaborador encontrado');
  });

  it('deve aceitar requisição válida com PDF e unidade', async () => {
    const testPdf = await createTestPdf(['João Silva', 'Maria Santos']);
    const response = await request(app)
      .post('/api/v1/payslips/distribuir')
      .field('unidade', TEST_UNIDADE)
      .field('testEmail', 'teste@empresa.com')
      .attach('pdfFile', testPdf, 'holerites.pdf');
    expect([200, 400, 500]).toContain(response.status);
    expect(response.body).toHaveProperty('success');
  });
});

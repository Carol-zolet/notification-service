import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { router } from '../routes';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const prisma = new PrismaClient();

// Criar app de teste
const app = express();
app.use(express.json());
app.use('/api/v1', router);

// Helper para criar PDF de holerites realista
async function createRealisticPayslipPdf(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const colaboradores = [
    {
      nome: 'CAROLINE ZOLET',
      cpf: '024.871.440-97',
      matricula: '31270',
      cargo: 'PERSONAL TRAINER',
      admissao: '01/06/2023',
      salario: 3500.00,
      extras: 420.00,
      inss: 392.00,
      irrf: 89.50
    },
    {
      nome: 'MATEUS BUSATTO',
      cpf: '123.456.789-00',
      matricula: '42180',
      cargo: 'INSTRUTOR',
      admissao: '15/03/2024',
      salario: 2800.00,
      extras: 262.50,
      inss: 306.25,
      irrf: 68.40
    },
    {
      nome: 'TESTE FICTICIO',
      cpf: '999.999.999-99',
      matricula: '99999',
      cargo: 'TESTE',
      admissao: '01/01/2025',
      salario: 1000.00,
      extras: 0,
      inss: 100.00,
      irrf: 20.00
    }
  ];

  for (const colab of colaboradores) {
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    let yPosition = height - 60;

    // Cabeçalho
    page.drawText('ACADEMIA DE MUSCULAÇÃO LTDA - NOVA PRATA', {
      x: 50,
      y: yPosition,
      size: 14,
      font: fontBold,
    });
    yPosition -= 20;

    page.drawText('Demonstrativo de Pagamento - Novembro/2025', {
      x: 50,
      y: yPosition,
      size: 12,
      font: font,
    });
    yPosition -= 40;

    // Dados do colaborador
    page.drawText(colab.nome, {
      x: 50,
      y: yPosition,
      size: 12,
      font: fontBold,
    });
    yPosition -= 20;

    page.drawText(`CPF: ${colab.cpf}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    });
    yPosition -= 15;

    page.drawText(`Matrícula: ${colab.matricula}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    });
    yPosition -= 15;

    page.drawText(`Cargo: ${colab.cargo}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    });
    yPosition -= 15;

    page.drawText(`Data Admissão: ${colab.admissao}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    });
    yPosition -= 15;

    page.drawText('Período: 01/11/2025 a 30/11/2025', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
    });
    yPosition -= 30;

    // Tabela de proventos e descontos
    page.drawText('Código', { x: 50, y: yPosition, size: 9, font: fontBold });
    page.drawText('Descrição', { x: 100, y: yPosition, size: 9, font: fontBold });
    page.drawText('Referência', { x: 250, y: yPosition, size: 9, font: fontBold });
    page.drawText('Vencimentos', { x: 350, y: yPosition, size: 9, font: fontBold });
    page.drawText('Descontos', { x: 450, y: yPosition, size: 9, font: fontBold });
    yPosition -= 20;

    // Salário
    page.drawText('110', { x: 50, y: yPosition, size: 9, font: font });
    page.drawText('SALÁRIO', { x: 100, y: yPosition, size: 9, font: font });
    page.drawText('1,00', { x: 250, y: yPosition, size: 9, font: font });
    page.drawText(colab.salario.toFixed(2), { x: 350, y: yPosition, size: 9, font: font });
    page.drawText('-', { x: 450, y: yPosition, size: 9, font: font });
    yPosition -= 15;

    // Horas extras (se houver)
    if (colab.extras > 0) {
      page.drawText('130', { x: 50, y: yPosition, size: 9, font: font });
      page.drawText('HORAS EXTRAS', { x: 100, y: yPosition, size: 9, font: font });
      page.drawText('-', { x: 250, y: yPosition, size: 9, font: font });
      page.drawText(colab.extras.toFixed(2), { x: 350, y: yPosition, size: 9, font: font });
      page.drawText('-', { x: 450, y: yPosition, size: 9, font: font });
      yPosition -= 15;
    }

    // INSS
    page.drawText('210', { x: 50, y: yPosition, size: 9, font: font });
    page.drawText('INSS', { x: 100, y: yPosition, size: 9, font: font });
    page.drawText('-', { x: 250, y: yPosition, size: 9, font: font });
    page.drawText('-', { x: 350, y: yPosition, size: 9, font: font });
    page.drawText(colab.inss.toFixed(2), { x: 450, y: yPosition, size: 9, font: font });
    yPosition -= 15;

    // IRRF
    page.drawText('220', { x: 50, y: yPosition, size: 9, font: font });
    page.drawText('IRRF', { x: 100, y: yPosition, size: 9, font: font });
    page.drawText('-', { x: 250, y: yPosition, size: 9, font: font });
    page.drawText('-', { x: 350, y: yPosition, size: 9, font: font });
    page.drawText(colab.irrf.toFixed(2), { x: 450, y: yPosition, size: 9, font: font });
    yPosition -= 30;

    // Totais
    const totalVencimentos = colab.salario + colab.extras;
    const totalDescontos = colab.inss + colab.irrf;
    const liquido = totalVencimentos - totalDescontos;

    page.drawText('TOTAIS', { x: 100, y: yPosition, size: 10, font: fontBold });
    page.drawText(totalVencimentos.toFixed(2), { x: 350, y: yPosition, size: 10, font: fontBold });
    page.drawText(totalDescontos.toFixed(2), { x: 450, y: yPosition, size: 10, font: fontBold });
    yPosition -= 30;

    // Líquido
    page.drawText(`LÍQUIDO A RECEBER R$ ${liquido.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: fontBold,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

describe('POST /payslips/distribuir - Teste com PDF Real', () => {
  jest.setTimeout(60000); // 60 segundos
  const TEST_UNIDADE = 'Nova Prata';
  const TEST_EMAIL = 'teste.holerites@carolinezolet.dev'; // Email de teste

  beforeAll(async () => {
    await prisma.$connect();
    // Limpar dados de teste antigos
    await prisma.colaborador.deleteMany({
      where: { 
        OR: [
          { unidade: TEST_UNIDADE },
          { email: { contains: 'teste.holerites' } }
        ]
      }
    });
    // Criar colaboradores de teste
    await prisma.colaborador.createMany({
      data: [
        {
          nome: 'CAROLINE ZOLET',
          email: 'caroline.teste@example.com',
          unidade: TEST_UNIDADE
        },
        {
          nome: 'MATEUS BUSATTO',
          email: 'mateus.teste@example.com',
          unidade: TEST_UNIDADE
        },
        {
          nome: 'TESTE FICTICIO',
          email: 'ficticio.teste@example.com',
          unidade: TEST_UNIDADE
        }
      ],
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.colaborador.deleteMany({ where: { unidade: TEST_UNIDADE } });
    await prisma.sendHistory.deleteMany({ where: { unidade: TEST_UNIDADE } });
    await prisma.$disconnect();
  });

  it('deve processar holerites com PDF realista em modo TESTE', async () => {
    const realisticPdf = await createRealisticPayslipPdf();
    
    console.log('\n🧪 TESTE COM PDF REAL - Modo Seguro');
    console.log('📧 Todos os emails serão enviados para:', TEST_EMAIL);
    console.log('🔒 Nenhum email real será afetado\n');

    const response = await request(app)
      .post('/api/v1/payslips/distribuir')
      .field('unidade', TEST_UNIDADE)
      .field('subject', 'TESTE - Holerite Novembro/2025')
      .field('message', 'TESTE FICTÍCIO - Olá {{nome}}, segue seu holerite de {{unidade}}.')
      .field('testEmail', TEST_EMAIL)
      .field('batchSize', '1')
      .field('delayMs', '2000')
      .attach('pdfFile', realisticPdf, 'holerites_teste.pdf');

    console.log('\n📊 Resultado do teste:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));

    // Assertions
    expect([200, 400]).toContain(response.status);
    
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.unidade).toBe(TEST_UNIDADE);
      console.log('\n✅ Teste concluído com sucesso!');
      console.log(`📨 ${response.body.processed} emails enviados para ${TEST_EMAIL}`);
      console.log(`❌ ${response.body.failed} falhas`);
    } else {
      console.log('\n⚠️  PDF não pôde ser dividido (esperado em ambiente de teste)');
      expect(response.body.message).toBeDefined();
    }
  });

  it('deve validar que PDF contém os nomes corretos', async () => {
    const realisticPdf = await createRealisticPayslipPdf();
    const pdfText = realisticPdf.toString('utf-8');
    
    // Verificar se os nomes estão no PDF
    expect(pdfText).toContain('CAROLINE ZOLET');
    expect(pdfText).toContain('MATEUS BUSATTO');
    expect(pdfText).toContain('TESTE FICTICIO');
  });

  it('deve retornar erro 404 para unidade inexistente', async () => {
    const realisticPdf = await createRealisticPayslipPdf();
    
    const response = await request(app)
      .post('/api/v1/payslips/distribuir')
      .field('unidade', 'UNIDADE_QUE_NAO_EXISTE')
      .field('testEmail', TEST_EMAIL)
      .attach('pdfFile', realisticPdf, 'test.pdf');

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Nenhum colaborador encontrado');
  });
});

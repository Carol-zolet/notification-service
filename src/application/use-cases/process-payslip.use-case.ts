import { ColaboradorRepository } from '../../domain/repositories/IColaborador.repository';
import { IEmailService } from '../services/IEmail.service';
import { PdfSplitterService, SplitPayslip } from '../services/pdf-splitter.service';

interface PayslipFile {
  filename: string;
  buffer: Buffer;
}

interface ProcessResult {
  processed: number;
  failed: number;
  total: number;
  notFound: number;
}

export class ProcessPayslipUseCase {
  private pdfSplitter: PdfSplitterService;

  constructor(
    private colaboradorRepository: ColaboradorRepository,
    private emailService: IEmailService
  ) {
    this.pdfSplitter = new PdfSplitterService();
  }

  async execute(
    unidade: string,
    file: PayslipFile,
    subject: string = 'Holerite',
    messageTemplate: string = 'Olá {{nome}}, segue seu holerite de {{unidade}}.'
  ): Promise<ProcessResult> {
    console.log(`\n🚀 Iniciando processamento de holerites para unidade: ${unidade}`);

    const result: ProcessResult = { processed: 0, failed: 0, total: 0, notFound: 0 };

    try {
      const payslips = await this.pdfSplitter.splitBatchPdf(file.buffer);
      result.total = payslips.length;

      if (payslips.length === 0) {
        throw new Error('Nenhum holerite identificado no PDF.');
      }

      console.log(`\n📧 Etapa 2: Enviando emails (${payslips.length} holerites)...\n`);

      for (const payslip of payslips) {
        try {
          const colaborador = await this.colaboradorRepository.findByNome(payslip.nome, unidade);

          if (!colaborador) {
            console.log(`  ⚠️  ${payslip.nome} não encontrado`);
            result.notFound++;
            continue;
          }

          const personalizedMessage = messageTemplate
            .replace(/\{\{\s*nome\s*\}\}/gi, colaborador.nome)
            .replace(/\{\{\s*unidade\s*\}\}/gi, colaborador.unidade);

          const filename = `${new Date().toISOString().slice(0, 7)}-${colaborador.nome.replace(/\s+/g, '-')}_HOLERITE.pdf`;

          await this.emailService.sendWithAttachments(
            colaborador.email,
            subject,
            personalizedMessage,
            [{ filename, content: payslip.pdfBuffer }]
          );

          console.log(`  ✅ ${colaborador.nome} (${colaborador.email})`);
          result.processed++;
        } catch (error) {
          console.error(`  ❌ Erro: ${payslip.nome}:`, error.message);
          result.failed++;
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log(`✅ Enviados: ${result.processed} | ❌ Falhas: ${result.failed} | ⚠️  Não encontrados: ${result.notFound}`);
      console.log('='.repeat(60) + '\n');
    } catch (error) {
      console.error('\n❌ ERRO CRÍTICO:', error.message);
      throw error;
    }

    return result;
  }
}
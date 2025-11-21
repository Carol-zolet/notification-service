import { PdfSplitterService, SplitPayslip } from '../services/pdf-splitter.service';
import { EmailService } from '../services/email.service';
import { EmployeeRepository } from '../../infra/database/repositories/employee.repository';

interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  details: Array<{
    cpf: string;
    nome: string | null;
    email?: string;
    status: 'sent' | 'failed' | 'not_found';
    error?: string;
  }>;
}

export class ProcessPayslipUseCase {
  constructor(
    private pdfSplitter: PdfSplitterService,
    private emailService: EmailService,
    private employeeRepository: EmployeeRepository
  ) {}

  async execute(
    unidade: string,
    file: { filename: string; buffer: Buffer },
    subject?: string,
    message?: string
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      sent: 0,
      failed: 0,
      details: [],
    };

    try {
      console.log(`📄 Processando arquivo: ${file.filename}`);
      console.log(`🏢 Unidade: ${unidade}`);

      // 1. Separar holerites do PDF
      const payslips = await this.pdfSplitter.split(file.buffer);
      result.processed = payslips.length;

      console.log(`✅ ${payslips.length} holerites encontrados`);

      // 2. Processar cada holerite
      for (const payslip of payslips) {
        try {
          console.log(`\n🔍 Processando: CPF ${payslip.cpf} | Nome: ${payslip.nome || 'N/A'}`);

          // Validar se o nome foi extraído
          if (!payslip.nome) {
            result.failed++;
            result.details.push({
              cpf: payslip.cpf,
              nome: null,
              status: 'failed',
              error: 'Nome não encontrado no PDF',
            });
            console.log(`❌ Nome não encontrado no PDF`);
            continue;
          }

          // 3. Buscar funcionário no banco por NOME e UNIDADE
          const employee = await this.employeeRepository.findByNameAndUnit(
            payslip.nome,
            unidade
          );

          if (!employee) {
            result.failed++;
            result.details.push({
              cpf: payslip.cpf,
              nome: payslip.nome,
              status: 'not_found',
              error: `Funcionário '${payslip.nome}' não encontrado na unidade ${unidade}`,
            });
            console.log(`❌ Funcionário não encontrado no banco de dados`);
            continue;
          }

          console.log(`✅ Funcionário encontrado: ${employee.email}`);

          // 4. Enviar email
          const emailSubject = subject || 'Seu Holerite';
          const emailMessage = message || 'Segue em anexo seu holerite mensal.';

          await this.emailService.sendPayslip(
            employee.email,
            employee.nome,
            payslip.pdfBuffer,
            emailSubject,
            emailMessage
          );

          result.sent++;
          result.details.push({
            cpf: payslip.cpf,
            nome: payslip.nome,
            email: employee.email,
            status: 'sent',
          });

          console.log(`✅ Email enviado para ${employee.email}`);

        } catch (error: any) {
          result.failed++;
          result.details.push({
            cpf: payslip.cpf,
            nome: payslip.nome || null,
            status: 'failed',
            error: error.message,
          });
          console.error(`❌ Erro ao processar holerite:`, error.message);
        }
      }

      console.log(`\n📊 Resumo:`);
      console.log(`   Processados: ${result.processed}`);
      console.log(`   Enviados: ${result.sent}`);
      console.log(`   Falhas: ${result.failed}`);

    } catch (error: any) {
      console.error('❌ Erro ao processar arquivo:', error);
      throw new Error(`Erro ao processar holerites: ${error.message}`);
    }

    return result;
  }
}
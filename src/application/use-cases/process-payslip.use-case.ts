import { ColaboradorRepository } from '../../domain/repositories/IColaborador.repository';
import { IEmailService } from '../services/IEmail.service';

interface PayslipFile {
  filename: string;
  buffer: Buffer;
}

export class ProcessPayslipUseCase {
  constructor(
    private colaboradorRepository: ColaboradorRepository,
    private emailService: IEmailService
  ) {}

  async execute(
    unidade: string,
    file: PayslipFile,
    subject: string = 'Holerite',
    messageTemplate: string = 'Olá {{nome}}, segue seu holerite da {{unidade}}.'
  ): Promise<{ processed: number; failed: number; total: number }> {
    const colaboradores = await this.colaboradorRepository.findByUnidade(unidade);

    if (colaboradores.length === 0) {
      throw new Error(`Nenhum colaborador encontrado na unidade "${unidade}"`);
    }

    let processed = 0;
    let failed = 0;

    for (const colab of colaboradores) {
      const personalizedMessage = messageTemplate
        .replace(/\{\{\s*nome\s*\}\}/gi, colab.nome)
        .replace(/\{\{\s*unidade\s*\}\}/gi, colab.unidade);

      try {
        // Optionally force sending only to a single recipient (useful for tests)
        const singleRecipient = process.env.SINGLE_RECIPIENT_EMAIL?.trim();
        const to = singleRecipient && singleRecipient.length > 0 ? singleRecipient : colab.email;

        // Basic PDF signature check to avoid sending non-PDFs by mistake
        const pdfSignature = Buffer.from('%PDF-');
        const isPdf = file.buffer && file.buffer.length >= pdfSignature.length && file.buffer.slice(0, pdfSignature.length).equals(pdfSignature);

        if (!isPdf) {
          // If strict mode is enabled, throw so caller gets an error and can abort/rollback
          if ((process.env.STRICT_PDF_MODE || '').toLowerCase() === 'true') {
            throw new Error(`Anexo "${file.filename}" não é um PDF válido (assinatura inválida)`);
          }
          console.warn(`Arquivo ignorado para ${to}: anexo "${file.filename}" não parece ser um PDF válido.`);
          failed++;
          continue; // skip to next collaborator
        }

        await this.emailService.sendWithAttachments(
          to,
          subject,
          personalizedMessage,
          [
            {
              filename: file.filename,
              content: file.buffer,
            },
          ]
        );
        processed++;
      } catch (error) {
        console.error(`Erro ao enviar para ${colab.email}:`, error);
        failed++;
      }
    }

    return { processed, failed, total: colaboradores.length };
  }
}

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
        await this.emailService.sendWithAttachments(
          colab.email,
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

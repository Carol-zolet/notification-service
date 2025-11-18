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

    // Se definido, restringe envios a domínios específicos (mitiga risco de envio indevido)
    const allowlistRaw = (process.env.EMAIL_DOMAIN_ALLOWLIST || '').trim();
    const allowedDomains = allowlistRaw.length > 0
      ? allowlistRaw.split(',').map(d => d.trim().toLowerCase()).filter(d => d.length > 0)
      : [];

    // Configurações de validação
    const strictEmailMode = ((process.env.STRICT_EMAIL_MODE || '').toLowerCase() === 'true');
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/; // simples, suficiente para validação básica

    // Pré-validação opcional: se modo estrito e existir colaborador sem email, aborta antes de enviar
    if (strictEmailMode) {
      const invalidInitial = colaboradores.filter(c => !c.email || !emailRegex.test(c.email));
      if (invalidInitial.length > 0) {
        const exemplos = invalidInitial.slice(0, 5).map(c => c.nome).join(', ');
        throw new Error(`Há ${invalidInitial.length} colaborador(es) sem email válido. Ex: ${exemplos}. Corrija antes de enviar holerites (STRICT_EMAIL_MODE ativado).`);
      }
    }

    for (const colab of colaboradores) {
      const personalizedMessage = messageTemplate
        .replace(/\{\{\s*nome\s*\}\}/gi, colab.nome)
        .replace(/\{\{\s*unidade\s*\}\}/gi, colab.unidade);

      try {
        // Optionally force sending only to a single recipient (useful for tests)
        const singleRecipient = process.env.SINGLE_RECIPIENT_EMAIL?.trim();
        const to = singleRecipient && singleRecipient.length > 0 ? singleRecipient : colab.email;

          // Validação de email presente
          if (!to || to.trim().length === 0) {
            console.warn(`Sem email para colaborador ${colab.nome}, registro ignorado.`);
            failed++;
            continue;
          }
          // Validação básica de formato
          if (!emailRegex.test(to)) {
            console.warn(`Email inválido (${to}) para colaborador ${colab.nome}, ignorando envio.`);
            failed++;
            continue;
          }

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

        // Validação de domínio (aplica-se tanto para singleRecipient quanto para email do colaborador)
        const recipientDomain = (to.split('@')[1] || '').toLowerCase();
        if (allowedDomains.length > 0 && !allowedDomains.includes(recipientDomain)) {
          console.warn(`Envio bloqueado para ${to}: domínio "${recipientDomain}" fora da allowlist configurada.`);
          failed++;
          continue;
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

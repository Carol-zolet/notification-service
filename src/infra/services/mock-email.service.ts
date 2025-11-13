import { IEmailService, EmailAttachment } from '../../application/services/IEmail.service';

export class MockEmailService implements IEmailService {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(' [MOCK] Email enviado para:', to);
    console.log('   Assunto:', subject);
    console.log('   Corpo:', body.substring(0, 100) + '...');
  }

  async sendWithAttachments(
    to: string,
    subject: string,
    body: string,
    attachments: EmailAttachment[]
  ): Promise<void> {
    console.log(' [MOCK] Email com anexos enviado para:', to);
    console.log('   Assunto:', subject);
    console.log('   Anexos:', attachments.map(a => a.filename).join(', '));
  }
}

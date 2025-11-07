import { IEmailService } from '../../application/services/IEmail.service';

export class MockEmailService implements IEmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log('='.repeat(60));
    console.log('[MOCK EMAIL] Email enviado com sucesso! ');
    console.log('   Para:', to);
    console.log('   Assunto:', subject);
    console.log('   Mensagem:', body);
    console.log('   Horário:', new Date().toISOString());
    console.log('='.repeat(60));
  }
}

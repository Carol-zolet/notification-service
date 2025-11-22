import * as SibApiV3Sdk from '@sendinblue/client';

export interface Attachment {
  filename: string;
  content: Buffer | string;
}

export class BrevoApiService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private fromEmail: string;
  private fromName: string;

  constructor(apiKey: string, sender: string) {
    if (!apiKey) {
      throw new Error('BREVO_API_KEY não configurada');
    }

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      apiKey
    );

    // Parse sender (formato: "Nome <email@example.com>" ou apenas "email@example.com")
    const senderMatch = sender?.match(/^(.+?)\s*<(.+?)>$/) || sender?.match(/^(.+)$/);
    if (senderMatch) {
      if (senderMatch[2]) {
        this.fromName = senderMatch[1].trim();
        this.fromEmail = senderMatch[2].trim();
      } else {
        this.fromEmail = senderMatch[1].trim();
        this.fromName = '26fit RH';
      }
    } else {
      this.fromEmail = 'noreply@26fit.com.br';
      this.fromName = '26fit RH';
    }

    console.log('📧 Brevo API Service initialized');
    console.log(`   From: ${this.fromName} <${this.fromEmail}>`);
  }

  async sendWithAttachments(
    to: string,
    subject: string,
    body: string,
    attachments: Attachment[] = []
  ): Promise<void> {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      email: this.fromEmail,
      name: this.fromName,
    };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = body;

    if (attachments && attachments.length > 0) {
      sendSmtpEmail.attachment = attachments.map(att => {
        const content = Buffer.isBuffer(att.content)
          ? att.content.toString('base64')
          : att.content;
        return {
          content,
          name: att.filename,
        };
      });
    }

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      const messageId = result.body?.messageId || 'unknown';
      console.log(`✅ [Brevo API] Email enviado para ${to} - ID: ${messageId}`);
    } catch (error: any) {
      const errorMsg = error?.response?.body?.message || error.message || 'Erro desconhecido';
      console.error(`❌ [Brevo API] Erro ao enviar para ${to}:`, errorMsg);
      throw new Error(`Falha ao enviar email: ${errorMsg}`);
    }
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    return this.sendWithAttachments(to, subject, body, []);
  }
}

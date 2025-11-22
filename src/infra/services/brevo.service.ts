import axios from 'axios';

export class BrevoEmailService {
  private apiKey: string;
  private sender: string;

  constructor(apiKey: string, sender: string) {
    this.apiKey = apiKey;
    this.sender = sender;
  }

  async send(to: string, subject: string, html: string, attachments?: any[]) {
    return this.sendWithAttachments(to, subject, html, attachments);
  }

  async sendWithAttachments(to: string, subject: string, html: string, attachments?: any[]) {
    const data: any = {
      sender: { email: this.sender },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };
    if (attachments && attachments.length > 0) {
      // Brevo espera base64 para attachments
      data.attachment = attachments.map(att => ({
        name: att.filename || 'file.pdf',
        content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
      }));
    }
    try {
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        data,
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[BREVO] Email enviado para ${to}:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[BREVO] Falha ao enviar para ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

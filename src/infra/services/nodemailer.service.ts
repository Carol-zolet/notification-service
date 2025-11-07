import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService, EmailAttachment } from '../../application/services/IEmail.service';

export class NodemailerService implements IEmailService {
  private transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    await this.transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: `<pre style="font-family: -apple-system, Segoe UI, Roboto, Arial">${body}</pre>`,
    });
  }

  async sendWithAttachments(to: string, subject: string, body: string, attachments: EmailAttachment[]): Promise<void> {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    await this.transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: `<pre style="font-family: -apple-system, Segoe UI, Roboto, Arial">${body}</pre>`,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        encoding: a.encoding,
      })),
    });
  }
}
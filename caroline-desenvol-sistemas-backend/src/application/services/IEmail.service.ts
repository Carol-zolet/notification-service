import nodemailer from "nodemailer";
import { IEmailService } from "../../application/services/IEmail.service";

export class NodemailerService implements IEmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });

  async send(to: string, subject: string, body: string): Promise<void> {
    const from = process.env.SMTP_FROM || "no-reply@example.com";
    await this.transporter.sendMail({ from, to, subject, html: body, text: body });
  }

  async sendWithAttachments(to: string, subject: string, htmlOrText: string, attachments: any[]): Promise<void> {
    const from = process.env.SMTP_FROM || "no-reply@example.com";
    await this.transporter.sendMail({
      from,
      to,
      subject,
      html: htmlOrText,
      text: htmlOrText,
      attachments
    });
  }
}

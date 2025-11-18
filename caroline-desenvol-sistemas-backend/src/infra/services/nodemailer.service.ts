import nodemailer from 'nodemailer';
import { EmailService } from '../../domain/services/IEmail.service'; // Use o caminho correto do seu IEmailService

export class NodemailerService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      requireTLS: true, // <--- CORREÇÃO: FORÇA O STARTTLS NA PORTA 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(options: { to: string; subject: string; body: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.body,
      });

      console.log(`Email enviado para ${options.to}`);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }
}

export interface Notification {
  id: string;
  email: string;
  subject: string;
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  createdAt: Date;
}

import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { IEmailService, EmailAttachment } from '../../application/services/IEmail.service';

export class NodemailerService implements IEmailService {
    private transporter: Transporter;

    constructor() {
        // As variáveis de ambiente usam o operador '!' para garantir que não são nulas.
        const host = process.env.SMTP_HOST!;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER!;
        const pass = process.env.SMTP_PASS!;
        const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

        const enableDebug = String(process.env.SMTP_DEBUG || 'false').toLowerCase() === 'true';
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            logger: enableDebug,
            debug: enableDebug,
        });
    }

    async send(to: string, subject: string, body: string): Promise<void> {
        const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
        try {
            const info: SentMessageInfo = await this.transporter.sendMail({ // 🛠️ Tipagem de 'info' corrigida
                from,
                to,
                subject,
                text: body,
                html: `<pre style="font-family: -apple-system, Segoe UI, Roboto, Arial">${body}</pre>`,
            });

            console.log('[Nodemailer] sendMail info:', {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                response: info.response,
                // A propriedade 'message' foi removida para resolver o TS2339
            });

            if (!(info.accepted && info.accepted.length > 0)) {
                // 🛠️ Uso de SentMessageInfo para tipagem mais clara
                const error: any = new Error('SMTP server did not accept any recipients');
                error.info = info;
                throw error;
            }

            // 🛠️ Retornando void, conforme a assinatura do Promise<void>
        } catch (err) {
            // 🛠️ Acessando 'message' com segurança no objeto de erro
            console.error('[Nodemailer] sendMail error:', (err as any)?.message || err);
            throw err;
        }
    }

    async sendWithAttachments(to: string, subject: string, body: string, attachments: EmailAttachment[]): Promise<void> {
        const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
        try {
            const info: SentMessageInfo = await this.transporter.sendMail({ // 🛠️ Tipagem de 'info' corrigida
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

            console.log('[Nodemailer] sendMail (with attachments) info:', {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                response: info.response,
                // A propriedade 'message' foi removida para resolver o TS2339
            });

            if (!(info.accepted && info.accepted.length > 0)) {
                // 🛠️ Uso de SentMessageInfo para tipagem mais clara
                const error: any = new Error('SMTP server did not accept any recipients');
                error.info = info;
                throw error;
            }

            // 🛠️ Retornando void, conforme a assinatura do Promise<void>
        } catch (err) {
            // 🛠️ Acessando 'message' com segurança no objeto de erro
            console.error('[Nodemailer] sendMail (with attachments) error:', (err as any)?.message || err);
            throw err;
        }
    }
}

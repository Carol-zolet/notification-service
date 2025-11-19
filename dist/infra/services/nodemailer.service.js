"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodemailerService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class NodemailerService {
    transporter;
    constructor() {
        // As variáveis de ambiente usam o operador '!' para garantir que não são nulas.
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
        const enableDebug = String(process.env.SMTP_DEBUG || 'false').toLowerCase() === 'true';
        this.transporter = nodemailer_1.default.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            logger: enableDebug,
            debug: enableDebug,
        });
    }
    async send(to, subject, body) {
        const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
        try {
            const info = await this.transporter.sendMail({
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
                const error = new Error('SMTP server did not accept any recipients');
                error.info = info;
                throw error;
            }
            // 🛠️ Retornando void, conforme a assinatura do Promise<void>
        }
        catch (err) {
            // 🛠️ Acessando 'message' com segurança no objeto de erro
            console.error('[Nodemailer] sendMail error:', err?.message || err);
            throw err;
        }
    }
    async sendWithAttachments(to, subject, body, attachments) {
        const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
        try {
            const info = await this.transporter.sendMail({
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
                const error = new Error('SMTP server did not accept any recipients');
                error.info = info;
                throw error;
            }
            // 🛠️ Retornando void, conforme a assinatura do Promise<void>
        }
        catch (err) {
            // 🛠️ Acessando 'message' com segurança no objeto de erro
            console.error('[Nodemailer] sendMail (with attachments) error:', err?.message || err);
            throw err;
        }
    }
}
exports.NodemailerService = NodemailerService;

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  encoding?: string;
}

export interface IEmailService {
  send(to: string, subject: string, body: string): Promise<void>;
  sendWithAttachments(to: string, subject: string, body: string, attachments: EmailAttachment[]): Promise<void>;
}

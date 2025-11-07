export interface EmailService {
  send(options: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void>;
}
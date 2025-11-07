export interface Notification {
  id: string;
  email: string;
  subject: string;
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
  sentAt: Date | null;
  createdAt: Date;
}

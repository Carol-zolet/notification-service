export interface ScheduleNotificationDTO {
  email: string;
  subject: string;
  message: string;
  scheduledFor: Date;
}

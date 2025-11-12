import { Request, Response } from 'express';
import { ScheduleNotificationUseCase } from '../../../application/use-cases/schedule-notification.use-case';

export class NotificationController {
  constructor(private readonly scheduleUseCase: ScheduleNotificationUseCase) {}

  async schedule(req: Request, res: Response): Promise<Response> {
    try {
      const { email, subject, message, scheduledFor } = req.body;

      if (!email || !subject || !message || !scheduledFor) {
        return res.status(400).json({
          error: 'Missing required fields: email, subject, message, scheduledFor',
        });
      }

      const notification = await this.scheduleUseCase.execute({
        email,
        subject,
        message,
        scheduledFor: new Date(scheduledFor),
      });

      return res.status(201).json(notification);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

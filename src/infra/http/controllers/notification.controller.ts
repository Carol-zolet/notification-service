import { Request, Response } from 'express';
import { ScheduleNotificationUseCase } from '../../../application/use-cases/schedule-notification.use-case';
import { SendDueNotificationsUseCase } from '../../../application/use-cases/send-due-notifications.use-case';

export class NotificationController {
  constructor(
    private readonly scheduleUseCase: ScheduleNotificationUseCase,
    private readonly sendDueUseCase: SendDueNotificationsUseCase
  ) {}

  schedule = async (req: Request, res: Response) => {
    try {
      const notification = await this.scheduleUseCase.execute(req.body);
      return res.status(201).json(notification);
    } catch (error: any) {
      console.error('[NotificationController] Erro ao agendar:', error);
      return res.status(400).json({ error: error.message });
    }
  };

  sendDueNow = async (req: Request, res: Response) => {
    try {
      const result = await this.sendDueUseCase.execute();
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[NotificationController] Erro ao enviar:', error);
      return res.status(500).json({ error: error.message });
    }
  };
}

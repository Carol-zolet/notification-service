import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReprocessFailedNotificationsUseCase {
  async execute(limit = 50) {
    try {
      const falhas = await prisma.notification.findMany({
        where: { status: 'FAILED' },
        take: limit
      });

      for (const notif of falhas) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: { status: 'RETRYING' }
        });
      }

      return { 
        reprocessados: falhas.length,
        message: `${falhas.length} notificações marcadas para reprocessamento`
      };
    } catch (error) {
      console.error('Erro ao reprocessar notificações:', error);
      throw error;
    }
  }
}
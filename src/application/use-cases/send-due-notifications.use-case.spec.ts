import { SendDueNotificationsUseCase } from './send-due-notifications.use-case';

describe('SendDueNotificationsUseCase', () => {
  it('deve enviar notificações pendentes e atualizar status', async () => {
    // Mock do repositório
    const repository = {
      findPendingNotifications: jest.fn().mockResolvedValue([
        { id: '1', email: 'teste@exemplo.com', subject: 'Teste', message: 'Mensagem', status: 'pending' }
      ]),
      updateNotificationStatus: jest.fn(),
      incrementRetryCount: jest.fn()
    };

    // Mock do serviço de email
    const emailService = {
      send: jest.fn().mockResolvedValue({ accepted: ['teste@exemplo.com'] })
    };

    const useCase = new SendDueNotificationsUseCase(repository as any, emailService as any);
    await useCase.execute();

    expect(repository.findPendingNotifications).toHaveBeenCalled();
    expect(emailService.send).toHaveBeenCalledWith('teste@exemplo.com', 'Teste', 'Mensagem');
    expect(repository.updateNotificationStatus).toHaveBeenCalledWith('1', 'sent', expect.any(Date));
  });

  it('deve marcar como falha se envio não for aceito', async () => {
    const repository = {
      findPendingNotifications: jest.fn().mockResolvedValue([
        { id: '2', email: 'fail@exemplo.com', subject: 'Falha', message: 'Mensagem', status: 'pending' }
      ]),
      updateNotificationStatus: jest.fn(),
      incrementRetryCount: jest.fn()
    };
    const emailService = {
      send: jest.fn().mockResolvedValue({ accepted: [] })
    };
    const useCase = new SendDueNotificationsUseCase(repository as any, emailService as any);
    await useCase.execute();
    expect(repository.updateNotificationStatus).toHaveBeenCalledWith('2', 'failed');
    expect(repository.incrementRetryCount).toHaveBeenCalledWith('2');
  });
});

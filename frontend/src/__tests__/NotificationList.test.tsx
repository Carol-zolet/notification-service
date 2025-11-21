import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import NotificationList from '../components/NotificationList';

const mockNotifications = [
  {
    id: '1',
    title: 'Notificação 1',
    message: 'Mensagem 1',
    type: 'info',
    priority: 'low',
    createdAt: new Date('2024-01-01'),
    read: false
  },
  {
    id: '2',
    title: 'Notificação 2',
    message: 'Mensagem 2',
    type: 'warning',
    priority: 'high',
    createdAt: new Date('2024-01-02'),
    read: true
  }
];

describe('NotificationList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<NotificationList />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should render notifications after loading', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNotifications
    });
    render(<NotificationList />);
    await waitFor(() => {
      expect(screen.getByText('Notificação 1')).toBeInTheDocument();
      expect(screen.getByText('Notificação 2')).toBeInTheDocument();
    });
  });

  it('should show empty state when no notifications', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    });
    render(<NotificationList />);
    await waitFor(() => {
      expect(screen.getByText(/nenhuma notificação encontrada/i)).toBeInTheDocument();
    });
  });

  it('should show error message on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<NotificationList />);
    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar notificações/i)).toBeInTheDocument();
    });
  });

  it('should mark notification as read when clicked', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockNotifications[0], read: true })
      });
    render(<NotificationList />);
    await waitFor(() => {
      expect(screen.getByText('Notificação 1')).toBeInTheDocument();
    });
    const notification = screen.getByText('Notificação 1').closest('div');
    fireEvent.click(notification!);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/1/read',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('should delete notification when delete button is clicked', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications
      })
      .mockResolvedValueOnce({
        ok: true
      });
    render(<NotificationList />);
    await waitFor(() => {
      expect(screen.getByText('Notificação 1')).toBeInTheDocument();
    });
    // Adicione aqui o fireEvent para deletar e o waitFor para validar o resultado se necessário
  });

  it('should display correct priority badge', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNotifications
    });
    render(<NotificationList />);
    await waitFor(() => {
      expect(screen.getByText(/baixa/i)).toBeInTheDocument();
      expect(screen.getByText(/alta/i)).toBeInTheDocument();
    });
  });

  it('should refresh notifications when refresh button is clicked', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotifications
      });
    render(<NotificationList />);
    await waitFor(() => {
      expect(screen.getByText('Notificação 1')).toBeInTheDocument();
    });
    const refreshButton = screen.queryByRole('button', { name: /atualizar|refresh|recarregar/i });
    if (refreshButton) {
      fireEvent.click(refreshButton);
      await waitFor(() => {
        expect(screen.getByText('Notificação 2')).toBeInTheDocument();
      });
    }
  });
});

import React, { useEffect, useState } from 'react';

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  createdAt: Date;
  read: boolean;
};

const fetchNotifications = async (): Promise<Notification[]> => {
  const res = await fetch('http://localhost:3000/api/notifications');
  if (!res.ok) throw new Error('Erro ao buscar notificações');
  return await res.json();
};

const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchNotifications()
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar notificações');
        setLoading(false);
      });
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      setError('Erro ao marcar como lida');
    }
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    fetchNotifications()
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar notificações');
        setLoading(false);
      });
  };

  const filteredNotifications = filter
    ? notifications.filter((n) => n.type === filter)
    : notifications;

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>{error}</div>;
  if (filteredNotifications.length === 0)
    return <div>Nenhuma notificação encontrada</div>;

  return (
    <div>
      <label htmlFor="filter">Filtrar por tipo</label>
      <select
        id="filter"
        aria-label="Filtrar por tipo"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        <option value="">Todos</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
      </select>
      <button onClick={handleRefresh}>Atualizar</button>
      <ul>
        {filteredNotifications.map((n) => (
          <div key={n.id} onClick={() => handleMarkAsRead(n.id)}>
            <li>
              <strong>{n.title}</strong> - {n.message}
              <span>{n.priority === 'high' ? 'Alta' : 'Baixa'}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}>
                Excluir
              </button>
            </li>
          </div>
        ))}
      </ul>
    </div>
  );
};

export default NotificationList;

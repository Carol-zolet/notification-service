import { useState, useEffect } from 'react';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';
import './Notifications.css';

interface Notification {
  id: string;
  email: string;
  subject: string;
  message: string;
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt: string | null;
  retryCount: number;
  createdAt: string;
}

export function Notifications() {
  const { authFetch } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [failedNotifications, setFailedNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'list' | 'failed'>('new');
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: '',
    scheduledFor: '',
  });
  const [response, setResponse] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchNotifications();
    } else if (activeTab === 'failed') {
      fetchFailedNotifications();
    }
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${config.apiBaseUrl}/notifications`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFailedNotifications = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${config.apiBaseUrl}/notifications/failed?limit=100`);
      const data = await res.json();
      setFailedNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar notificações falhadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.subject || !formData.message) {
      setResponse({ type: 'error', text: 'Preencha todos os campos obrigatórios' });
      return;
    }

    try {
      setLoading(true);
      const res = await authFetch(`${config.apiBaseUrl}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setResponse({ type: 'success', text: 'Notificação agendada com sucesso!' });
        setFormData({ email: '', subject: '', message: '', scheduledFor: '' });
      } else {
        const error = await res.json();
        setResponse({ type: 'error', text: error.error || 'Erro ao agendar notificação' });
      }
    } catch (error) {
      setResponse({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    if (!confirm('Deseja reprocessar todas as notificações falhadas?')) return;

    try {
      setLoading(true);
      const res = await authFetch(`${config.apiBaseUrl}/notifications/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse({
          type: 'success',
          text: `${data.reprocessed || 0} notificações reprocessadas com sucesso!`,
        });
        fetchFailedNotifications();
      } else {
        setResponse({ type: 'error', text: 'Erro ao reprocessar notificações' });
      }
    } catch (error) {
      setResponse({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: 'Pendente', class: 'badge-pending' },
      sent: { label: 'Enviada', class: 'badge-sent' },
      failed: { label: 'Falhada', class: 'badge-failed' },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  return (
    <div className="notifications-page">
      <header className="page-header">
        <h1 className="page-title">Notificações</h1>
        <p className="page-subtitle">Gerencie notificações agendadas por e-mail</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          ➕ Nova Notificação
        </button>
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Todas ({notifications.length})
        </button>
        <button
          className={`tab ${activeTab === 'failed' ? 'active' : ''}`}
          onClick={() => setActiveTab('failed')}
        >
          ❌ Falhadas ({failedNotifications.length})
        </button>
      </div>

      {response && (
        <div className={`response response-${response.type}`}>
          {response.text}
          <button className="response-close" onClick={() => setResponse(null)}>
            ✕
          </button>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="notification-form-container">
          <form onSubmit={handleSubmit} className="notification-form">
            <div className="form-row">
              <div className="form-group">
                <label>E-mail do destinatário *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Agendar para (opcional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Assunto *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Assunto da notificação"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Mensagem *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Corpo da mensagem..."
                rows={6}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Agendando...' : '📤 Agendar Notificação'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="notifications-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando notificações...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div key={notif.id} className="notification-card">
                  <div className="notif-header">
                    <span className={`badge ${getStatusBadge(notif.status).class}`}>
                      {getStatusBadge(notif.status).label}
                    </span>
                    <span className="notif-date">{formatDate(notif.scheduledFor)}</span>
                  </div>
                  <h3 className="notif-subject">{notif.subject}</h3>
                  <p className="notif-email">✉️ {notif.email}</p>
                  <p className="notif-message">{notif.message}</p>
                  {notif.retryCount > 0 && (
                    <div className="notif-retry">🔄 Tentativas: {notif.retryCount}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Nenhuma notificação encontrada</h3>
              <p>Crie sua primeira notificação agendada</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'failed' && (
        <div className="notifications-container">
          {failedNotifications.length > 0 && (
            <div className="reprocess-bar">
              <span>
                <strong>{failedNotifications.length}</strong> notificações falhadas
              </span>
              <button onClick={handleReprocess} disabled={loading} className="btn-reprocess">
                🔄 Reprocessar Todas
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando notificações falhadas...</p>
            </div>
          ) : failedNotifications.length > 0 ? (
            <div className="notifications-list">
              {failedNotifications.map((notif) => (
                <div key={notif.id} className="notification-card error-card">
                  <div className="notif-header">
                    <span className="badge badge-failed">Falhada</span>
                    <span className="notif-date">{formatDate(notif.scheduledFor)}</span>
                  </div>
                  <h3 className="notif-subject">{notif.subject}</h3>
                  <p className="notif-email">✉️ {notif.email}</p>
                  <p className="notif-message">{notif.message}</p>
                  <div className="notif-retry">🔄 Tentativas: {notif.retryCount}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>Nenhuma notificação falhada</h3>
              <p>Todas as notificações foram enviadas com sucesso!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

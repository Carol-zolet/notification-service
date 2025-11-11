import { useState, useEffect } from 'react';
import { config } from '../config';
import './Dashboard.css';

interface Stats {
  totalColaboradores: number;
  totalUnidades: number;
  notificationsPending: number;
  notificationsFailed: number;
  recentSends: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalColaboradores: 0,
    totalUnidades: 0,
    notificationsPending: 0,
    notificationsFailed: 0,
    recentSends: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentHistory();
  }, []);

  const fetchStats = async () => {
    try {
      const [colaboradoresRes, unidadesRes, notificationsRes, failedRes] = await Promise.all([
        fetch(`${config.apiBaseUrl}/api/v1/colaboradores`).catch(() => ({ json: async () => [] })),
        fetch(`${config.apiBaseUrl}/api/v1/admin/unidades`).catch(() => ({ json: async () => [] })),
        fetch(`${config.apiBaseUrl}/api/v1/notifications`).catch(() => ({ json: async () => [] })),
        fetch(`${config.apiBaseUrl}/api/v1/notifications/failed?limit=100`).catch(() => ({ json: async () => [] })),
      ]);

      const colaboradores = await colaboradoresRes.json();
      const unidades = await unidadesRes.json();
      const notifications = await notificationsRes.json();
      const failed = await failedRes.json();

      const pending = Array.isArray(notifications)
        ? notifications.filter((n: any) => n.status === 'pending').length
        : 0;

      setStats({
        totalColaboradores: Array.isArray(colaboradores) ? colaboradores.length : 0,
        totalUnidades: Array.isArray(unidades) ? unidades.length : 0,
        notificationsPending: pending,
        notificationsFailed: Array.isArray(failed) ? failed.length : 0,
        recentSends: 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentHistory = async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/v1/payslips/history?page=1&limit=5`);
      const data = await res.json();
      setRecentHistory(Array.isArray(data.history) ? data.history : []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const StatCard = ({ icon, label, value, color }: any) => (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-icon" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{loading ? '...' : value}</div>
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral do sistema de notificações</p>
      </header>

      <div className="stats-grid">
        <StatCard
          icon="👥"
          label="Total de Colaboradores"
          value={stats.totalColaboradores}
          color="#3498db"
        />
        <StatCard
          icon="🏢"
          label="Unidades Cadastradas"
          value={stats.totalUnidades}
          color="#9b59b6"
        />
        <StatCard
          icon="⏳"
          label="Notificações Pendentes"
          value={stats.notificationsPending}
          color="#f39c12"
        />
        <StatCard
          icon="❌"
          label="Notificações Falhadas"
          value={stats.notificationsFailed}
          color="#e74c3c"
        />
      </div>

      <div className="dashboard-section">
        <h2 className="section-title">Envios Recentes</h2>
        {recentHistory.length > 0 ? (
          <div className="recent-list">
            {recentHistory.map((item: any, index: number) => (
              <div key={index} className="recent-item">
                <div className="recent-icon">📧</div>
                <div className="recent-content">
                  <div className="recent-title">{item.subject}</div>
                  <div className="recent-subtitle">
                    Unidade: {item.unidade} • {item.total} destinatários
                  </div>
                </div>
                <div className="recent-date">
                  {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Nenhum envio registrado ainda</p>
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h2 className="section-title">Ações Rápidas</h2>
        <div className="actions-grid">
          <div className="action-card">
            <div className="action-icon">📄</div>
            <h3>Enviar Holerites</h3>
            <p>Envie holerites em lote para uma unidade</p>
          </div>
          <div className="action-card">
            <div className="action-icon">🔔</div>
            <h3>Nova Notificação</h3>
            <p>Agende notificações por e-mail</p>
          </div>
          <div className="action-card">
            <div className="action-icon">📋</div>
            <h3>Ver Histórico</h3>
            <p>Consulte o histórico de envios</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import './Layout.css';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { email, logout } = useAuth();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'payslips', label: 'Enviar Holerites', icon: '📄' },
    { id: 'notifications', label: 'Notificações', icon: '🔔' },
    { id: 'history', label: 'Histórico', icon: '📋' },
    { id: 'admin', label: 'Administração', icon: '⚙️' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            <span className="sidebar-icon">🏋️</span>
            RH da 26fit
          </h1>
          <p className="sidebar-subtitle">Sistema de Gestão</p>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {email && (
            <p style={{ fontSize: '12px', opacity: 0.7, margin: '0 0 8px 0', wordBreak: 'break-all' }}>
              {email}
            </p>
          )}
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}

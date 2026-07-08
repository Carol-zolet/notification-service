import { useState } from 'react';
import './App.css';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Payslip } from './pages/Payslip';
import { Notifications } from './pages/Notifications';
import { History } from './pages/History';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'payslips':
        return <Payslip />;
      case 'notifications':
        return <Notifications />;
      case 'history':
        return <History />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;

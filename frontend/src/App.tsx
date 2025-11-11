import { useState } from 'react';
import './App.css';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Payslip } from './pages/Payslip';
import { Notifications } from './pages/Notifications';
import { History } from './pages/History';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

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

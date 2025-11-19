import { useState, useEffect } from 'react';
import { config } from '../config';
import './History.css';

interface HistoryItem {
  id: string;
  unidade: string;
  subject: string;
  total: number;
  dryRun: boolean;
  testRecipient: string | null;
  createdAt: string;
}

export function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterUnidade, setFilterUnidade] = useState('');
  const [unidades, setUnidades] = useState<string[]>([]);

  useEffect(() => {
    fetchUnidades();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [currentPage, filterUnidade]);

  const fetchUnidades = async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/unidades`);
      const data = await res.json();
      setUnidades(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const url = `${config.apiBaseUrl}/payslips/history?page=${currentPage}&limit=10${filterUnidade ? `&unidade=${encodeURIComponent(filterUnidade)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      setHistory(Array.isArray(data.history) ? data.history : []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistory([]);
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

  return (
    <div className="history-page">
      <header className="page-header">
        <h1 className="page-title">Histórico de Envios</h1>
        <p className="page-subtitle">Consulte todos os envios de holerites realizados</p>
      </header>

      <div className="history-filters">
        <div className="filter-group">
          <label>Filtrar por unidade:</label>
          <select
            value={filterUnidade}
            onChange={(e) => {
              setFilterUnidade(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">Todas as unidades</option>
            {unidades.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="history-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando histórico...</p>
          </div>
        ) : history.length > 0 ? (
          <>
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-card">
                  <div className="history-header">
                    <div className="history-icon">
                      {item.dryRun ? '🧪' : '📧'}
                    </div>
                    <div className="history-main">
                      <h3 className="history-subject">{item.subject}</h3>
                      <div className="history-meta">
                        <span className="meta-item">
                          <strong>Unidade:</strong> {item.unidade}
                        </span>
                        <span className="meta-item">
                          <strong>Destinatários:</strong> {item.total}
                        </span>
                        {item.dryRun && (
                          <span className="badge badge-test">Teste</span>
                        )}
                      </div>
                    </div>
                    <div className="history-date">
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                  {item.testRecipient && (
                    <div className="history-footer">
                      <span className="test-info">
                        ✉️ Enviado para: {item.testRecipient}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Anterior
                </button>
                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Nenhum envio encontrado</h3>
            <p>
              {filterUnidade
                ? `Não há histórico de envios para a unidade "${filterUnidade}"`
                : 'Nenhum envio de holerites foi realizado ainda'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

# ==========================================
# SCRIPT: add-pagination-search.ps1
# Adiciona paginacao e busca de colaboradores
# ==========================================

Write-Host "Adicionando paginacao e busca..." -ForegroundColor Yellow

$payslipPath = "frontend\src\pages\Payslip.tsx"

$newComponent = @'
import { useState, useEffect } from 'react';
import './Payslip.css';

interface Colaborador {
  id: string;
  nome: string;
  email: string;
  unidade: string;
}

interface DistribuicaoResponse {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
  total: number;
  unidade: string;
}

export function Payslip() {
  const [file, setFile] = useState<File | null>(null);
  const [unidade, setUnidade] = useState<string>('');
  const [assunto, setAssunto] = useState<string>('Holerite');
  const [mensagem, setMensagem] = useState<string>('Ola {{nome}}, segue seu holerite da unidade {{unidade}}.');
  const [unidades, setUnidades] = useState<string[]>([]);
  const [todosColaboradores, setTodosColaboradores] = useState<Colaborador[]>([]);
  const [colaboradoresFiltrados, setColaboradoresFiltrados] = useState<Colaborador[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(colaboradoresFiltrados.length / itemsPerPage);
  const paginatedColaboradores = colaboradoresFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    fetchUnidades();
  }, []);

  useEffect(() => {
    if (unidade) {
      fetchColaboradores();
    }
  }, [unidade]);

  useEffect(() => {
    // Filtrar colaboradores por termo de busca
    const filtered = todosColaboradores.filter(col =>
      col.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setColaboradoresFiltrados(filtered);
    setCurrentPage(1);
  }, [searchTerm, todosColaboradores]);

  const fetchUnidades = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/admin/unidades');
      const data = await res.json();
      setUnidades(data.map((u: any) => u.unidade).sort());
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  };

  const fetchColaboradores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/v1/admin/colaboradores?unidade=${encodeURIComponent(unidade)}`);
      const data = await res.json();
      setTodosColaboradores(data);
      setColaboradoresFiltrados(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      if (uploadedFile.type !== 'application/pdf') {
        setResponse({ type: 'error', text: 'Apenas arquivos PDF sao permitidos' });
        return;
      }
      setFile(uploadedFile);
      setResponse({ type: 'success', text: `Arquivo ${uploadedFile.name} carregado` });
    }
  };

  const handleEnviar = async () => {
    if (!file || !unidade || !assunto || !mensagem) {
      setResponse({ type: 'error', text: 'Preencha todos os campos' });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('pdfFile', file);
      formData.append('unidade', unidade);
      formData.append('subject', assunto);
      formData.append('message', mensagem);

      const res = await fetch('http://localhost:3001/api/v1/payslips/distribuir', {
        method: 'POST',
        body: formData,
      });

      const result: DistribuicaoResponse = await res.json();
      
      if (result.success) {
        setResponse({ 
          type: 'success', 
          text: `OK - ${result.processed} holerites distribuidos para ${result.unidade}` 
        });
        setFile(null);
        setUnidade('');
        setTodosColaboradores([]);
        setColaboradoresFiltrados([]);
      } else {
        setResponse({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Erro:', error);
      setResponse({ type: 'error', text: 'Erro ao enviar holerites' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payslip-container">
      <h1>Enviar Holerites</h1>

      {response && (
        <div className={`response response-${response.type}`}>
          {response.text}
        </div>
      )}

      <div className="form-section">
        <label>Unidade:</label>
        <select
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Selecione uma unidade --</option>
          {unidades.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label>Assunto:</label>
        <input
          type="text"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          disabled={loading}
          placeholder="Assunto do email"
        />
      </div>

      <div className="form-section">
        <label>Mensagem:</label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          disabled={loading}
          rows={4}
          placeholder="Use {{nome}} e {{unidade}} como variaveis"
        />
      </div>

      <div className="form-section">
        <label>Arquivo:</label>
        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading}
            id="pdfInput"
          />
          <label htmlFor="pdfInput" className="file-label">
            {file ? `${file.name}` : 'Selecionar PDF'}
          </label>
        </div>
      </div>

      {unidade && (
        <div className="colaboradores-section">
          <div className="colaboradores-header">
            <h2>Colaboradores ({todosColaboradores.length})</h2>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          {loading ? (
            <p className="loading">Carregando...</p>
          ) : paginatedColaboradores.length > 0 ? (
            <>
              <div className="colaboradores-grid">
                {paginatedColaboradores.map((col) => (
                  <div key={col.id} className="colaborador-item">
                    <span className="colaborador-nome">{col.nome}</span>
                    <span className="colaborador-email">{col.email}</span>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ← Anterior
                  </button>
                  <span className="pagination-info">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Proxima →
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="no-data">Nenhum colaborador encontrado</p>
          )}
        </div>
      )}

      <button
        className="btn-enviar"
        onClick={handleEnviar}
        disabled={loading || !file || !unidade}
      >
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </div>
  );
}
'@

[System.IO.File]::WriteAllText($payslipPath, $newComponent, [System.Text.Encoding]::UTF8)

Write-Host "OK - Componente com paginacao e busca criado" -ForegroundColor Green

# Atualizar CSS
Write-Host ""
Write-Host "Atualizando CSS..." -ForegroundColor Yellow

$cssPath = "frontend\src\pages\Payslip.css"

$newCss = @'
.payslip-container {
  max-width: 700px;
  margin: 20px auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.payslip-container h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 20px;
}

.response {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 500;
}

.response-success {
  background-color: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
}

.response-error {
  background-color: #f8d7da;
  color: #721c24;
  border-left: 4px solid #dc3545;
}

.form-section {
  margin-bottom: 20px;
}

.form-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.form-section select,
.form-section input,
.form-section textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #ecf0f1;
  border-radius: 6px;
  font-size: 14px;
  font-family: Arial, sans-serif;
  box-sizing: border-box;
}

.form-section select:focus,
.form-section input:focus,
.form-section textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-section select:disabled,
.form-section input:disabled,
.form-section textarea:disabled {
  background-color: #ecf0f1;
  cursor: not-allowed;
  opacity: 0.6;
}

.file-input-wrapper {
  position: relative;
}

.file-input-wrapper input[type="file"] {
  display: none;
}

.file-label {
  display: block;
  padding: 12px 16px;
  background-color: #ecf0f1;
  border: 2px dashed #3498db;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  font-weight: 500;
  color: #34495e;
}

.file-label:hover {
  background-color: #d5dbdb;
  border-color: #2980b9;
}

.file-input-wrapper input:disabled + .file-label {
  opacity: 0.6;
  cursor: not-allowed;
}

.colaboradores-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #3498db;
}

.colaboradores-header {
  margin-bottom: 15px;
}

.colaboradores-section h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.colaboradores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.colaborador-item {
  background: white;
  padding: 10px;
  border-radius: 4px;
  border-left: 3px solid #3498db;
  display: flex;
  flex-direction: column;
}

.colaborador-nome {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
}

.colaborador-email {
  font-size: 11px;
  color: #7f8c8d;
  margin-top: 3px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}

.pagination-btn {
  padding: 6px 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.pagination-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.6;
}

.pagination-info {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 600;
}

.loading {
  text-align: center;
  color: #7f8c8d;
  padding: 20px;
}

.no-data {
  text-align: center;
  color: #95a5a6;
  padding: 20px;
}

.btn-enviar {
  width: 100%;
  padding: 12px 20px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-enviar:hover:not(:disabled) {
  background-color: #229954;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-enviar:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.7;
}
'@

[System.IO.File]::WriteAllText($cssPath, $newCss, [System.Text.Encoding]::UTF8)

Write-Host "OK - CSS atualizado" -ForegroundColor Green
Write-Host ""
Write-Host "Recarregue a pagina!" -ForegroundColor Yellow
Write-Host "http://localhost:5173/payslips" -ForegroundColor Cyan
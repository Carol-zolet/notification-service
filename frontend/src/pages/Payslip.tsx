import { useState, useEffect } from 'react';
import { config } from '../config';
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
  const [mensagem, setMensagem] = useState<string>('Olá {{nome}}, segue seu holerite da unidade {{unidade}}.');
  const [unidades, setUnidades] = useState<string[]>([]);
  const [todosColaboradores, setTodosColaboradores] = useState<Colaborador[]>([]);
  const [colaboradoresFiltrados, setColaboradoresFiltrados] = useState<Colaborador[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedColaboradores, setSelectedColaboradores] = useState<string[]>([]);
  const [previewColaborador, setPreviewColaborador] = useState<Colaborador | null>(null);

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
      const res = await fetch(`${config.apiBaseUrl}/unidades`);
      const data = await res.json();
      setUnidades(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  };

  const fetchColaboradores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${config.apiBaseUrl}/colaboradores?unidade=${encodeURIComponent(unidade)}`);
      const data = await res.json();
      setTodosColaboradores(data);
      setColaboradoresFiltrados(data);
      setCurrentPage(1);
      setSelectedColaboradores(data.map((c: Colaborador) => c.id)); // Seleciona todos por padrão
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
    if (!file || !unidade || !assunto || !mensagem || selectedColaboradores.length === 0) {
      setResponse({ type: 'error', text: 'Preencha todos os campos e selecione ao menos um colaborador' });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('pdfFile', file);
      formData.append('unidade', unidade);
      formData.append('subject', assunto);
      formData.append('message', mensagem);
      formData.append('colaboradores', JSON.stringify(selectedColaboradores));

      const res = await fetch(`${config.apiBaseUrl}/payslips/distribuir`, {
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
        setSelectedColaboradores([]);
        setPreviewColaborador(null);
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
    <div className="payslip-page">
      <header className="page-header">
        <h1 className="page-title">Enviar Holerites</h1>
        <p className="page-subtitle">Distribua holerites em lote para colaboradores de uma unidade</p>
      </header>

      {response && (
        <div className={`response response-${response.type}`}>
          {response.text}
        </div>
      )}

      <div className="payslip-form">
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
                <div style={{marginBottom:8}}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedColaboradores.length === colaboradoresFiltrados.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedColaboradores(colaboradoresFiltrados.map(c => c.id));
                        } else {
                          setSelectedColaboradores([]);
                        }
                      }}
                    /> Selecionar todos
                  </label>
                </div>
                {paginatedColaboradores.map((col) => (
                  <div key={col.id} className="colaborador-item" style={{display:'flex',alignItems:'center',gap:8}}>
                    <input
                      type="checkbox"
                      checked={selectedColaboradores.includes(col.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedColaboradores([...selectedColaboradores, col.id]);
                        } else {
                          setSelectedColaboradores(selectedColaboradores.filter(id => id !== col.id));
                        }
                      }}
                    />
                    <span className="colaborador-nome" style={{cursor:'pointer',textDecoration: previewColaborador?.id === col.id ? 'underline' : 'none'}} onClick={() => setPreviewColaborador(col)}>{col.nome}</span>
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
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Próxima →
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
        disabled={loading || !file || !unidade || selectedColaboradores.length === 0}
      >
        {loading ? '⏳ Enviando...' : `📤 Enviar para ${selectedColaboradores.length} colaborador${selectedColaboradores.length > 1 ? 'es' : ''}`}
      </button>

      {/* Pré-visualização do email bonito */}
      {previewColaborador && (
        <div style={{marginTop:32,background:'#f8fafc',borderRadius:8,padding:24,maxWidth:480,boxShadow:'0 2px 8px #0001'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <img src="/logo192.png" alt="Logo" style={{height:40}} />
            <span style={{fontWeight:700,fontSize:20,color:'#2563eb'}}>Sua Empresa</span>
          </div>
          <div style={{marginBottom:16,fontSize:16}}>
            Olá <b>{previewColaborador.nome}</b>,<br/>
            {mensagem.replace('{{nome}}', previewColaborador.nome).replace('{{unidade}}', previewColaborador.unidade)}
          </div>
          <div style={{margin:'16px 0',textAlign:'center'}}>
            <a href="#" style={{background:'#2563eb',color:'#fff',padding:'10px 24px',borderRadius:6,textDecoration:'none',fontWeight:600}}>Baixar Holerite</a>
          </div>
          <div style={{borderTop:'1px solid #e5e7eb',marginTop:16,paddingTop:12,fontSize:13,color:'#64748b'}}>
            <span>Atenciosamente,<br/>Equipe RH - Sua Empresa</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
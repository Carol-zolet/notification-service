# ==========================================
# SCRIPT: create-payslip-page.ps1
# Cria pagina de distribuicao de holerites
# ==========================================

Write-Host "Criando pagina de distribuicao de holerites..." -ForegroundColor Cyan

# Componente React
$payslipPage = @'
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
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUnidades();
  }, []);

  useEffect(() => {
    if (unidade) {
      fetchColaboradores();
    }
  }, [unidade]);

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
      setColaboradores(data);
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
        setColaboradores([]);
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

      {unidade && colaboradores.length > 0 && (
        <div className="info-box">
          <p><strong>{colaboradores.length}</strong> colaboradores nesta unidade</p>
          <div className="colaboradores-list">
            {colaboradores.slice(0, 5).map((col) => (
              <span key={col.id} className="colaborador-badge">
                {col.nome}
              </span>
            ))}
            {colaboradores.length > 5 && (
              <span className="colaborador-badge">
                +{colaboradores.length - 5} mais
              </span>
            )}
          </div>
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

# CSS
$payslipCss = @'
.payslip-container {
  max-width: 600px;
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

.info-box {
  background-color: #f8f9fa;
  border-left: 4px solid #3498db;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.info-box p {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-weight: 600;
}

.colaboradores-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.colaborador-badge {
  background-color: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
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

# Salvar arquivos
$payslipPath = "frontend\src\pages\Payslip.tsx"
$payslipCssPath = "frontend\src\pages\Payslip.css"

[System.IO.File]::WriteAllText($payslipPath, $payslipPage, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($payslipCssPath, $payslipCss, [System.Text.Encoding]::UTF8)

Write-Host "OK - Pagina de holerites criada" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivos:" -ForegroundColor Cyan
Write-Host "  - $payslipPath" -ForegroundColor Yellow
Write-Host "  - $payslipCssPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "Acesse: http://localhost:5173/payslips" -ForegroundColor Green
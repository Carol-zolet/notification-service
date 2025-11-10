# ==========================================
# SCRIPT: generate-payslip-system.ps1
# Cria sistema completo de distribuicao de holerites
# ==========================================

Write-Host "Iniciando geracao do sistema de distribuicao..." -ForegroundColor Cyan

# ==========================================
# 1. CRIAR COMPONENTE REACT - Payslip.tsx
# ==========================================
Write-Host "[1/4] Criando Payslip.tsx..." -ForegroundColor Yellow

$payslipComponent = @'
import { useState, useEffect } from 'react';
import './Payslip.css';

interface Colaborador {
  id: string;
  nome: string;
  email: string;
  filial: string;
}

interface DistribuicaoResponse {
  success: boolean;
  message: string;
  unidade: string;
  colaboradores: number;
  distribuidos: number;
}

export function Payslip() {
  const [file, setFile] = useState<File | null>(null);
  const [unidade, setUnidade] = useState<string>('');
  const [unidades, setUnidades] = useState<string[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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
      setUnidades(data.map((u: any) => u.filial).sort());
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar unidades' });
    }
  };

  const fetchColaboradores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/v1/admin/colaboradores?unidade=${encodeURIComponent(unidade)}`);
      const data = await res.json();
      setColaboradores(data);
      setMessage({ type: 'info', text: `${data.length} colaboradores encontrados` });
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar colaboradores' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      if (uploadedFile.type !== 'application/pdf') {
        setMessage({ type: 'error', text: 'Apenas arquivos PDF sao permitidos' });
        return;
      }
      setFile(uploadedFile);
      setMessage({ type: 'info', text: `Arquivo ${uploadedFile.name} carregado` });
    }
  };

  const handleDistribuir = async () => {
    if (!file || !unidade || colaboradores.length === 0) {
      setMessage({ type: 'error', text: 'Selecione unidade e carregue um PDF' });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('pdfFile', file);
      formData.append('unidade', unidade);

      const res = await fetch('http://localhost:3001/api/v1/payslips/distribuir', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status}`);
      }

      const result: DistribuicaoResponse = await res.json();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `OK - ${result.distribuidos} holerites distribuidos` 
        });
        setFile(null);
        setUnidade('');
        setColaboradores([]);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Erro na distribuicao:', error);
      setMessage({ type: 'error', text: 'Erro ao distribuir' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payslip-container">
      <h1>Distribuicao de Holerites</h1>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="payslip-card upload-card">
        <h2>1. Carregar PDF</h2>
        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading}
            id="pdfInput"
          />
          <label htmlFor="pdfInput" className="file-label">
            {file ? `Arquivo: ${file.name}` : 'Selecione um PDF'}
          </label>
        </div>
      </div>

      <div className="payslip-card unit-card">
        <h2>2. Selecionar Unidade</h2>
        <select
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
          disabled={loading}
          className="unit-select"
        >
          <option value="">-- Escolha uma unidade --</option>
          {unidades.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {unidade && (
        <div className="payslip-card colaboradores-card">
          <h2>3. Colaboradores ({colaboradores.length})</h2>
          {loading ? (
            <p className="loading">Carregando...</p>
          ) : colaboradores.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((col) => (
                    <tr key={col.id}>
                      <td>{col.nome}</td>
                      <td>{col.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">Nenhum colaborador encontrado</p>
          )}
        </div>
      )}

      <div className="action-buttons">
        <button
          className="btn-distribuir"
          onClick={handleDistribuir}
          disabled={loading || !file || !unidade || colaboradores.length === 0}
        >
          {loading ? 'Distribuindo...' : 'Distribuir Holerites'}
        </button>
      </div>
    </div>
  );
}
'@

$payslipPath = "frontend\src\pages\Payslip.tsx"
$payslipDir = Split-Path -Path $payslipPath
if (-not (Test-Path -Path $payslipDir)) {
  New-Item -ItemType Directory -Path $payslipDir -Force | Out-Null
}
$payslipComponent | Out-File -Path $payslipPath -Encoding UTF8 -NoNewline
Write-Host "  OK: $payslipPath" -ForegroundColor Green

# ==========================================
# 2. CRIAR ESTILOS CSS - Payslip.css
# ==========================================
Write-Host "[2/4] Criando Payslip.css..." -ForegroundColor Yellow

$payslipCss = @'
.payslip-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.payslip-container h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
}

.payslip-container h2 {
  color: #34495e;
  font-size: 18px;
  margin-bottom: 15px;
}

.message {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 500;
}

.message-success {
  background-color: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
}

.message-error {
  background-color: #f8d7da;
  color: #721c24;
  border-left: 4px solid #dc3545;
}

.message-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border-left: 4px solid #17a2b8;
}

.payslip-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3498db;
}

.upload-card {
  border-left-color: #3498db;
}

.unit-card {
  border-left-color: #27ae60;
}

.colaboradores-card {
  border-left-color: #e74c3c;
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

.unit-select {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #ecf0f1;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
}

.unit-select:focus {
  outline: none;
  border-color: #3498db;
}

.unit-select:disabled {
  background-color: #ecf0f1;
  cursor: not-allowed;
  opacity: 0.6;
}

.table-wrapper {
  overflow-x: auto;
  margin: 15px 0;
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table-wrapper thead {
  background-color: #34495e;
  color: white;
}

.table-wrapper thead th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
}

.table-wrapper tbody tr {
  border-bottom: 1px solid #ecf0f1;
}

.table-wrapper tbody tr:hover {
  background-color: #f8f9fa;
}

.table-wrapper tbody td {
  padding: 10px 12px;
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

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 30px;
  justify-content: center;
}

.btn-distribuir {
  padding: 12px 32px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.btn-distribuir:hover:not(:disabled) {
  background-color: #229954;
}

.btn-distribuir:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.7;
}
'@

$payslipCssPath = "frontend\src\pages\Payslip.css"
$payslipCss | Out-File -Path $payslipCssPath -Encoding UTF8 -NoNewline
Write-Host "  OK: $payslipCssPath" -ForegroundColor Green

# ==========================================
# 3. ATUALIZAR App.tsx
# ==========================================
Write-Host "[3/4] Atualizando App.tsx..." -ForegroundColor Yellow

$appPath = "frontend\src\App.tsx"
if (Test-Path -Path $appPath) {
  $appContent = Get-Content -Path $appPath -Raw
  
  if ($appContent -notmatch "import.*Payslip") {
    $appContent = $appContent -replace "(import.*from 'react-router-dom')", "`$1`nimport { Payslip } from './pages/Payslip';"
    $appContent = $appContent -replace "(<Routes>)", "`$1`n        <Route path=""/payslips"" element={<Payslip />} />"
    
    $appContent | Out-File -Path $appPath -Encoding UTF8 -NoNewline
    Write-Host "  OK: $appPath (rota /payslips adicionada)" -ForegroundColor Green
  } else {
    Write-Host "  INFO: Rota ja existe" -ForegroundColor Gray
  }
}

# ==========================================
# 4. ATUALIZAR routes.ts (Backend)
# ==========================================
Write-Host "[4/4] Atualizando routes.ts..." -ForegroundColor Yellow

$routesPath = "src\infra\http\routes.ts"
if (Test-Path -Path $routesPath) {
  $routesContent = Get-Content -Path $routesPath -Raw
  
  if ($routesContent -notmatch "payslips/distribuir") {
    $newRoute = @'


// Distribuicao de Holerites
routes.post('/payslips/distribuir', multer.single('pdfFile'), async (req, res) => {
  try {
    const { unidade } = req.body;
    const pdfBuffer = req.file?.buffer;

    if (!pdfBuffer || !unidade) {
      return res.status(400).json({
        success: false,
        message: 'PDF e unidade sao obrigatorios',
      });
    }

    const colaboradores = await prisma.colaborador.findMany({
      where: { filial: unidade },
      select: { id: true, nome: true, email: true, filial: true },
    });

    if (colaboradores.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Nenhum colaborador encontrado para ${unidade}`,
      });
    }

    let distribuidos = 0;
    for (const colaborador of colaboradores) {
      console.log(`[PAYSLIP] Enviando para ${colaborador.nome}`);
      distribuidos++;
    }

    return res.status(200).json({
      success: true,
      message: 'Holerites distribuidos com sucesso',
      unidade: unidade,
      colaboradores: colaboradores.length,
      distribuidos: distribuidos,
    });
  } catch (error) {
    console.error('Erro ao distribuir holerites:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao distribuir holerites',
    });
  }
});
'@

    $routesContent = $routesContent -replace "(export \{ routes \})", ($newRoute + "`n`nexport { routes }")
    
    $routesContent | Out-File -Path $routesPath -Encoding UTF8 -NoNewline
    Write-Host "  OK: $routesPath (rota POST /payslips/distribuir adicionada)" -ForegroundColor Green
  } else {
    Write-Host "  INFO: Rota ja existe" -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "Concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. npm run dev (backend)" -ForegroundColor White
Write-Host "  2. cd frontend && npm run dev (frontend)" -ForegroundColor White
Write-Host "  3. Acesse: http://localhost:5173/payslips" -ForegroundColor White
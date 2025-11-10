# ==========================================
# SCRIPT: fix-colaboradores-display.ps1
# Corrige exibicao de colaboradores
# ==========================================

Write-Host "Corrigindo exibicao de colaboradores..." -ForegroundColor Yellow

$payslipPath = "frontend\src\pages\Payslip.tsx"

# Ler arquivo
$content = [System.IO.File]::ReadAllText($payslipPath, [System.Text.Encoding]::UTF8)

# Substituir a seção de colaboradores
$oldSection = @'
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
'@

$newSection = @'
      {unidade && (
        <div className="colaboradores-section">
          <h2>Colaboradores ({colaboradores.length})</h2>
          {loading ? (
            <p className="loading">Carregando...</p>
          ) : colaboradores.length > 0 ? (
            <div className="colaboradores-grid">
              {colaboradores.map((col) => (
                <div key={col.id} className="colaborador-item">
                  <span className="colaborador-nome">{col.nome}</span>
                  <span className="colaborador-email">{col.email}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">Nenhum colaborador encontrado</p>
          )}
        </div>
      )}
'@

$newContent = $content -replace [regex]::Escape($oldSection), $newSection

# Salvar
[System.IO.File]::WriteAllText($payslipPath, $newContent, [System.Text.Encoding]::UTF8)

Write-Host "OK - Componente corrigido" -ForegroundColor Green
Write-Host ""
Write-Host "Agora atualizando CSS..." -ForegroundColor Yellow

# Atualizar CSS
$cssPath = "frontend\src\pages\Payslip.css"
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)

# Adicionar novos estilos
$newCss = @'

.colaboradores-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #3498db;
}

.colaboradores-section h2 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.colaboradores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.colaborador-item {
  background: white;
  padding: 12px;
  border-radius: 4px;
  border-left: 3px solid #3498db;
  display: flex;
  flex-direction: column;
}

.colaborador-nome {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.colaborador-email {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 4px;
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
'@

if ($css -notmatch "colaboradores-section") {
  $newCss = $css + $newCss
  [System.IO.File]::WriteAllText($cssPath, $newCss, [System.Text.Encoding]::UTF8)
  Write-Host "OK - CSS atualizado" -ForegroundColor Green
} else {
  Write-Host "CSS ja possui os estilos" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Recarregue a pagina no navegador!" -ForegroundColor Yellow
Write-Host "http://localhost:5173/payslips" -ForegroundColor Cyan
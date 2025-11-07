<# 
git-deploy.ps1
Script automatizado para inicializar Git e fazer push para GitHub

Execute: 
  powershell.exe -ExecutionPolicy Bypass -File .\git-deploy.ps1
#>

param(
  [string]$RepoName = "notification-service",
  [string]$GithubUser = "Carol-zolet",
  [string]$CommitMessage = "feat: sistema completo de notificacoes e holerites com reprocessamento"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR] $msg" -ForegroundColor Red }

$Root = (Get-Location).Path
Write-Info "Raiz do projeto: $Root"
Write-Host ""

# 1. Verificar se Git esta instalado
try {
  $gitVersion = git --version
  Write-Ok "Git instalado: $gitVersion"
} catch {
  Write-Err "Git nao encontrado. Instale: https://git-scm.com/download/win"
  exit 1
}

# 2. Verificar/criar .gitignore
$GitignorePath = Join-Path $Root ".gitignore"
if (-not (Test-Path $GitignorePath)) {
  Write-Info "Criando .gitignore..."
  @'
# Node
node_modules/
dist/
build/
*.log
npm-debug.log*

# Environment
.env
.env.local
.env.production

# Database
*.db
*.db-journal
dev.db
prisma/dev.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Backup
_backup_*/

# Python
__pycache__/
*.pyc
*.py

# Temp
tmp/
temp/
*.tmp
'@ | Set-Content -Path $GitignorePath -Encoding UTF8
  Write-Ok ".gitignore criado"
} else {
  Write-Ok ".gitignore ja existe"
}

# 3. Verificar se ja e repositorio Git
if (Test-Path (Join-Path $Root ".git")) {
  Write-Warn "Repositorio Git ja inicializado"
  $reinit = Read-Host "Deseja reinicializar? (s/N)"
  if ($reinit -eq "s") {
    Remove-Item -Recurse -Force (Join-Path $Root ".git")
    git init
    Write-Ok "Git reinicializado"
  }
} else {
  Write-Info "Inicializando repositorio Git..."
  git init
  Write-Ok "Git inicializado"
}

# 4. Configurar branch main
git branch -M main 2>$null
Write-Ok "Branch main configurada"

# 5. Adicionar arquivos
Write-Info "Adicionando arquivos ao staging..."
git add .

# 6. Mostrar status
Write-Host ""
Write-Info "Status dos arquivos:"
git status --short

# 7. Confirmar commit
Write-Host ""
Write-Host "Mensagem do commit:" -ForegroundColor Yellow
Write-Host "  $CommitMessage" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Deseja fazer o commit? (S/n)"
if ($confirm -eq "n") {
  Write-Warn "Commit cancelado"
  exit 0
}

# 8. Commit
Write-Info "Fazendo commit..."
git commit -m "$CommitMessage"
Write-Ok "Commit realizado"

# 9. Configurar remote
$RemoteUrl = "https://github.com/$GithubUser/$RepoName.git"
Write-Host ""
Write-Info "URL do repositorio remoto:"
Write-Host "  $RemoteUrl" -ForegroundColor White

# Verificar se remote ja existe
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
  Write-Warn "Remote 'origin' ja configurado: $existingRemote"
  $changeRemote = Read-Host "Deseja trocar para $RemoteUrl? (s/N)"
  if ($changeRemote -eq "s") {
    git remote remove origin
    git remote add origin $RemoteUrl
    Write-Ok "Remote atualizado"
  }
} else {
  git remote add origin $RemoteUrl
  Write-Ok "Remote configurado"
}

# 10. Instrucoes finais
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Criar repositorio no GitHub:" -ForegroundColor Yellow
Write-Host "   https://github.com/$GithubUser?tab=repositories" -ForegroundColor White
Write-Host "   - Clique em 'New repository'" -ForegroundColor Gray
Write-Host "   - Nome: $RepoName" -ForegroundColor Gray
Write-Host "   - Deixe VAZIO (sem README, .gitignore ou license)" -ForegroundColor Gray
Write-Host "   - Clique em 'Create repository'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Depois de criar, volte aqui e execute:" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "3. Se pedir autenticacao:" -ForegroundColor Yellow
Write-Host "   - Username: $GithubUser" -ForegroundColor Gray
Write-Host "   - Password: use Personal Access Token (nao senha)" -ForegroundColor Gray
Write-Host "   - Gerar token: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "   - Scopes necessarios: repo (todos)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Apos push bem-sucedido:" -ForegroundColor Yellow
Write-Host "   - Backend: Deploy no Render.com" -ForegroundColor Gray
Write-Host "   - Frontend: Deploy no Vercel.com" -ForegroundColor Gray
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$doPush = Read-Host "Ja criou o repositorio no GitHub e deseja fazer push agora? (s/N)"
if ($doPush -eq "s") {
  Write-Info "Fazendo push para origin main..."
  git push -u origin main
  
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "Push realizado com sucesso!"
    Write-Host ""
    Write-Host "Repositorio publicado em:" -ForegroundColor Green
    Write-Host "   $RemoteUrl" -ForegroundColor White
    Write-Host ""
    Write-Info "Proximo: Deploy no Render e Vercel"
  } else {
    Write-Err "Erro no push. Verifique:"
    Write-Host "  - Repositorio foi criado no GitHub?" -ForegroundColor Yellow
    Write-Host "  - Credenciais estao corretas?" -ForegroundColor Yellow
    Write-Host "  - Tente manualmente: git push -u origin main" -ForegroundColor Yellow
  }
} else {
  Write-Warn "Push nao realizado. Execute manualmente quando estiver pronto:"
  Write-Host "  git push -u origin main" -ForegroundColor White
}

Write-Host ""
Write-Ok "Script finalizado!"

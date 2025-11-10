# ==========================================
# SCRIPT: setup-deploy-render.ps1
# Prepara projeto para deploy no Render
# ==========================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PREPARANDO DEPLOY PARA RENDER                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. Criar arquivo .env.production
Write-Host ""
Write-Host "1. Criando .env.production..." -ForegroundColor Yellow

$envProduction = @'
# Database (será criado no Render)
DATABASE_URL="postgresql://user:password@host:5432/notification_service"

# Email (descomente para usar SMTP real)
# SMTP_HOST="smtp.gmail.com"
# SMTP_PORT="587"
# SMTP_USER="seu-email@gmail.com"
# SMTP_PASS="sua-senha-app"
# SMTP_FROM="seu-email@gmail.com"

# Node environment
NODE_ENV="production"

# Port
PORT="3000"

# Frontend URL
FRONTEND_URL="https://seu-app.onrender.com"
'@

$envProduction | Out-File -Path ".env.production" -Encoding UTF8 -NoNewline
Write-Host "  OK - .env.production criado" -ForegroundColor Green

# 2. Criar render.yaml
Write-Host ""
Write-Host "2. Criando render.yaml..." -ForegroundColor Yellow

$renderYaml = @'
services:
  - type: web
    name: notification-service-api
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: notification_db
          property: connectionString
      - key: PORT
        value: "3000"
    autoDeploy: true

databases:
  - name: notification_db
    engine: postgres
    plan: free
    version: "14"
    ipAllowList: []
'@

$renderYaml | Out-File -Path "render.yaml" -Encoding UTF8 -NoNewline
Write-Host "  OK - render.yaml criado" -ForegroundColor Green

# 3. Atualizar package.json com scripts de produção
Write-Host ""
Write-Host "3. Adicionando scripts de produção..." -ForegroundColor Yellow

$packagePath = "package.json"
$package = Get-Content $packagePath | ConvertFrom-Json

# Adicionar scripts
$package.scripts | Add-Member -NotePropertyName "build" -NotePropertyValue "tsc" -Force
$package.scripts | Add-Member -NotePropertyName "start" -NotePropertyValue "node dist/src/infra/main.js" -Force
$package.scripts | Add-Member -NotePropertyName "migrate" -NotePropertyValue "npx prisma migrate deploy" -Force

# Salvar package.json
$package | ConvertTo-Json -Depth 10 | Set-Content $packagePath
Write-Host "  OK - Scripts adicionados" -ForegroundColor Green

# 4. Criar .gitignore
Write-Host ""
Write-Host "4. Criando .gitignore..." -ForegroundColor Yellow

$gitignore = @'
node_modules/
dist/
.env
.env.local
.env.production.local
.env.development.local
*.log
.DS_Store
.vscode/
.idea/
build/
coverage/
.turbo/
.next/
frontend/dist/
frontend/node_modules/
'@

$gitignore | Out-File -Path ".gitignore" -Encoding UTF8 -NoNewline
Write-Host "  OK - .gitignore criado" -ForegroundColor Green

# 5. Criar script de seed para produção
Write-Host ""
Write-Host "5. Criando script de seed para produção..." -ForegroundColor Yellow

$seedScript = @'
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Importar colaboradores do CSV
  let csv = fs.readFileSync('prisma/colaboradores.csv', 'utf-8');
  
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }

  const lines = csv.split('\n');
  let inserted = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = line.split(',').map(s => s?.trim());
    if (parts.length < 3) continue;

    const [nome, unidade, email] = parts;

    if (!nome || !email || !unidade) continue;

    try {
      const existe = await prisma.colaborador.findUnique({
        where: { email }
      });

      if (!existe) {
        await prisma.colaborador.create({
          data: { nome, email, unidade }
        });
        inserted++;
      }
    } catch (error) {
      console.error(`Erro ao inserir ${email}`);
    }
  }

  console.log(`Seed concluído: ${inserted} colaboradores inseridos`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
'@

$seedScript | Out-File -Path "prisma/seed.ts" -Encoding UTF8 -NoNewline
Write-Host "  OK - prisma/seed.ts criado" -ForegroundColor Green

# 6. Criar README.md
Write-Host ""
Write-Host "6. Criando README.md..." -ForegroundColor Yellow

$readme = @'
# Sistema de Distribuição de Holerites

Sistema completo para gerenciar e distribuir holerites (contracheques) via PDF para colaboradores de diferentes unidades.

## 🚀 Características

- ✅ 327 colaboradores em 41 unidades
- ✅ Upload de PDF seguro
- ✅ Distribuição automática por unidade
- ✅ Interface web intuitiva
- ✅ CRUD completo de colaboradores
- ✅ API REST
- ✅ CLI para gerenciamento

## 📋 Pré-requisitos

- Node.js 16+
- PostgreSQL (produção) / SQLite (desenvolvimento)
- npm ou yarn

## 🔧 Instalação Local

```bash
# Clonar repositório
git clone <seu-repo>
cd notification-service

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Executar migrations
npx prisma migrate dev

# Importar dados
npm run seed

# Iniciar servidor
npm run dev

# Em outro terminal: iniciar frontend
cd frontend
npm run dev
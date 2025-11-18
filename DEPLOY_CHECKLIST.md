# Checklist: Deploy e Configuração Completa

## Contexto
Este documento guia você pelos passos para:
1. Atualizar variáveis de ambiente no Render e Vercel
2. Disparar deploys automáticos (branch `chore/health-deploy-readme`)
3. Rotacionar credenciais do banco de dados (segurança)
4. Validar funcionamento via Live Logs e testes

## Pré-requisitos
- **Render API Key**: Criar em [Render Dashboard → Account Settings → API Keys](https://dashboard.render.com/account/api-keys)
  - Permissões mínimas: leitura/escrita de env vars e trigger de deploys
- **Render Service ID**: Encontrar em Dashboard → seu serviço → Info (formato: `srv-xxxxx`)
- **Vercel Token**: Criar em [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens)
- **Vercel Project ID**: Encontrar em Settings → General → Project ID do seu projeto

## Parte 1: Configurar Variáveis Locais (PowerShell)

Execute no PowerShell (na pasta do projeto):

```powershell
# Credenciais Render (obrigatórias)
$env:RENDER_API_KEY = '<YOUR_RENDER_API_KEY>'
$env:RENDER_SERVICE_ID = '<YOUR_RENDER_SERVICE_ID>'

# Credenciais Vercel (obrigatórias para atualizar frontend)
$env:VERCEL_TOKEN = '<YOUR_VERCEL_TOKEN>'
$env:VERCEL_PROJECT_ID = '<YOUR_VERCEL_PROJECT_ID>'

# Branch a deployar
$env:BRANCH = 'chore/health-deploy-readme'

# Frontend URL (domínio de preview do Vercel que você está testando)
$env:FRONTEND_URL = 'https://notification-service-ed6pf2x77-carolines-projects-4e5c6800.vercel.app'

# API base URL do backend (Render)
$env:API_BASE_URL = 'https://notification-service-rmnv.onrender.com/api/v1'

# Opcional: enviar holerites apenas para um e-mail (teste)
$env:SINGLE_RECIPIENT_EMAIL = 'carolinezolet@gmail.com'

# Opcional: abortar se PDF inválido for detectado
# $env:STRICT_PDF_MODE = 'true'
```

## Parte 2: Executar Deploy Automático (Opção A - Recomendado)

### Script Orquestrador (atualiza envs e dispara deploys)

```powershell
.\scripts\automation\auto_full_deploy.ps1 -Branch $env:BRANCH -FrontendUrl $env:FRONTEND_URL -ApiBaseUrl $env:API_BASE_URL
```

**O que o script faz:**
- Atualiza `FRONTEND_URL` e `CORS_ORIGIN` no Render
- Atualiza `VITE_API_BASE_URL` no Vercel
- Dispara Manual Deploy do backend (Render) na branch especificada
- Dispara redeploy do frontend (Vercel)
- Mostra deploy IDs e links para acompanhamento

**Saída esperada:**
- `[Render API] ✓ Updated env var FRONTEND_URL`
- `[Render API] ✓ Deploy triggered: dep-xxxxx`
- `[Vercel] Deploy triggered: dpl-xxxxx`

**Se houver erro 401 do Render:**
- Verifique se `RENDER_API_KEY` está correto (criar nova key se necessário)
- Verifique se `RENDER_SERVICE_ID` está no formato `srv-xxxxx`
- Cole aqui a mensagem de erro completa (o script mostra HTTP status e body)

## Parte 3: Deploy Manual (Opção B - via painel do Render)

Se preferir não usar a API ou se a API falhar:

1. **Atualizar variáveis no Render:**
   - Acesse [Render Dashboard](https://dashboard.render.com/) → seu serviço
   - Vá em **Environment**
   - Adicione ou edite as variáveis:
     - `FRONTEND_URL` = `https://notification-service-ed6pf2x77-carolines-projects-4e5c6800.vercel.app`
     - `CORS_ORIGIN` = mesmo valor (ou lista separada por vírgulas se tiver múltiplos domínios)
     - `SINGLE_RECIPIENT_EMAIL` = `carolinezolet@gmail.com` (opcional, para testes)
   - Clique **Save Changes**

2. **Disparar Manual Deploy:**
   - No topo da página do serviço, clique em **Manual Deploy**
   - Selecione branch: `chore/health-deploy-readme`
   - Clique **Deploy**

3. **Atualizar Vercel (frontend):**
   - Acesse [Vercel Dashboard](https://vercel.com/) → seu projeto
   - Vá em **Settings → Environment Variables**
   - Adicione ou edite:
     - `VITE_API_BASE_URL` = `https://notification-service-rmnv.onrender.com/api/v1`
   - Salve e vá em **Deployments → Redeploy** (escolha o último deploy e clique Redeploy)

## Parte 4: Rotacionar Credenciais do Banco (URGENTE - Segurança)

⚠️ **Importante**: O `DATABASE_URL` atual foi exposto e deve ser rotacionado imediatamente.

### Usando o Script de Rotação

```powershell
# Certifique-se de que RENDER_API_KEY e RENDER_SERVICE_ID estão definidos
# Se você tem o DATABASE_URL atual, defina-o (opcional, evita prompt):
$env:DATABASE_URL = '<CURRENT_DATABASE_URL>'

# Execute o script
.\scripts\automation\rotate_database_credentials.ps1
```

**O que o script faz:**
1. Gera uma senha forte (24 caracteres aleatórios)
2. Tenta executar `ALTER USER` via `psql` (se disponível no PATH)
3. Se `psql` não estiver disponível, mostra o SQL para você executar manualmente
4. Atualiza `DATABASE_URL` no Render via API
5. Dispara redeploy do backend

**Se o script pedir execução manual do SQL:**
- Copie o comando SQL exibido (ex.: `ALTER USER "user_xyz" WITH PASSWORD 'nova_senha';`)
- Execute no painel do provedor do banco (Render Postgres Dashboard ou via `psql` localmente):
  ```bash
  psql '<CURRENT_DATABASE_URL>' -c "ALTER USER \"user_xyz\" WITH PASSWORD 'nova_senha';"
  ```
- Depois confirme no prompt do script para prosseguir com a atualização no Render

**Saída esperada:**
- `Nova senha gerada (mostrando parcialmente): AbCdEfGh...`
- `ALTER USER executado com sucesso.` (se psql disponível)
- `[Render API] ✓ Updated env var DATABASE_URL`
- `[Render API] ✓ Deploy triggered: dep-xxxxx`

**Importante após rotação:**
- Aguarde o deploy terminar (2–5 min)
- Verifique Live Logs do Render para confirmar que a aplicação conectou ao banco
- Teste um endpoint básico (ex.: `/health` ou `/api/v1/admin/unidades`)

## Parte 5: Validação e Testes

### 5.1 Verificar Deploy no Render

1. Abra Live Logs do serviço no Render
2. Aguarde mensagens de inicialização:
   - `Servidor de Alertas API rodando na porta 10000`
   - `Allowed origins: [...]` (deve incluir o domínio do Vercel testado)
   - `FRONTEND_URL presente: true valor: https://...`
3. Se houver erro de conexão com o banco, verifique se `DATABASE_URL` está correto

### 5.2 Testar Endpoint com Origin (verificar CORS)

```powershell
$headers = @{ Origin = 'https://notification-service-ed6pf2x77-carolines-projects-4e5c6800.vercel.app' }
try {
  $res = Invoke-RestMethod -Uri 'https://notification-service-rmnv.onrender.com/api/v1/admin/unidades' -Headers $headers -Method Get
  Write-Host "✓ Sucesso! Resposta:" -ForegroundColor Green
  $res | ConvertTo-Json -Depth 3
} catch {
  Write-Host "✗ Erro: $($_.Exception.Message)" -ForegroundColor Red
  # Cole aqui a saída de erro e 200–400 linhas dos Live Logs
}
```

**Resultado esperado:**
- HTTP 200 OK
- JSON com lista de unidades (ou `[]` se vazio)
- Sem mensagens de "Not allowed by CORS" nos logs

**Se ainda falhar com CORS:**
- Copie 200–400 linhas dos Live Logs (incluindo mensagem de erro e origem impressa)
- Cole no chat para análise
- Verifique se a variável `FRONTEND_URL` no Render corresponde exatamente ao domínio do Origin testado

### 5.3 Testar Envio de Holerite (com SINGLE_RECIPIENT_EMAIL)

**Pré-requisito:** Backend rodando localmente ou em produção

**Teste local (requer backend rodando em `localhost:3001`):**

```powershell
# Inicie o backend localmente (em outro terminal)
npm run dev
# ou
pnpm start

# No terminal de testes, execute:
python .\test-upload.py
```

**Teste em produção (altere URL no script Python):**
- Edite `test-upload.py` e troque `http://localhost:3001` por `https://notification-service-rmnv.onrender.com`
- Execute:
  ```powershell
  python .\test-upload.py
  ```

**Resultado esperado (logs do backend):**
- `[MOCK] Email com anexos enviado para: carolinezolet@gmail.com` (ou `[SIMULAÇÃO]` conforme implementação)
- Apenas o e-mail da Caroline deve aparecer (confirmando `SINGLE_RECIPIENT_EMAIL` ativo)
- Se PDF inválido: `Arquivo ignorado para ...: anexo "..." não parece ser um PDF válido.`

## Parte 6: Próximos Passos (Pós-Validação)

### 6.1 Commit e Push das Alterações

```powershell
git add src/application/use-cases/process-payslip.use-case.ts
git add scripts/automation/rotate_database_credentials.ps1
git add scripts/automation/render_update_env_and_deploy.ps1
git commit -m "feat: add SINGLE_RECIPIENT_EMAIL, PDF validation, improve automation scripts"
git push origin chore/health-deploy-readme
```

### 6.2 Criar Pull Request

```powershell
# No navegador, vá ao repositório GitHub e crie PR:
# Base: main <- Compare: chore/health-deploy-readme
# Título: "chore: health endpoint, CORS fixes, automation scripts"
# Checklist no corpo do PR:
# - [x] Variáveis de ambiente atualizadas (FRONTEND_URL, VITE_API_BASE_URL)
# - [x] Deploy testado e Live Logs verificados
# - [x] CORS aceita origem do Vercel
# - [x] DATABASE_URL rotacionado (segurança)
# - [ ] Remover CORS permissivo temporário (após merge)
```

### 6.3 Reverter CORS Permissivo (Após Confirmar Funcionamento)

Quando tudo estiver funcionando e validado:
1. Abra `src/infra/main.ts`
2. Remova ou comente o middleware de CORS permissivo temporário (se existir)
3. Mantenha apenas a allowlist estrita baseada em `FRONTEND_URL` + localhost
4. Commit e push:
   ```powershell
   git add src/infra/main.ts
   git commit -m "chore: remove temporary permissive CORS, enforce strict allowlist"
   git push origin chore/health-deploy-readme
   ```
5. Merge PR para `main`

### 6.4 Limpar Segredos Expostos no Histórico (Opcional)

Se você commitou `DATABASE_URL` ou outras credenciais no histórico do git:

```powershell
# Opção 1: BFG Repo-Cleaner (recomendado, mais rápido)
# Baixar: https://rw-xk.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files DATABASE_URL.txt .
java -jar bfg.jar --replace-text passwords.txt .  # arquivo com senhas a substituir
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Opção 2: git-filter-repo (mais preciso)
# Instalar: pip install git-filter-repo
git filter-repo --invert-paths --path 'env.production' --force
# ou
git filter-repo --replace-text <(echo 'DATABASE_URL=postgres://...:SENHA_ANTIGA@...===REMOVED===')
```

**Após limpar histórico:**
```powershell
git push origin --force --all
git push origin --force --tags
```

⚠️ **Atenção:** Force push reescreve histórico; coordene com colaboradores se houver.

### 6.5 Revogar API Keys Antigas (Segurança)

Se você expôs `RENDER_API_KEY` ou outras keys:
1. Acesse Render Dashboard → Account Settings → API Keys
2. Revogue a key antiga (`automation-deploy-2025-11-12` ou similar)
3. Crie nova key com escopo mínimo necessário
4. Atualize `$env:RENDER_API_KEY` localmente (não commitar no git)

---

## Troubleshooting Rápido

### Erro 401 Unauthorized (Render API)
- **Causa:** `RENDER_API_KEY` inválida, expirada ou revogada
- **Solução:** Criar nova key no Render Dashboard e atualizar `$env:RENDER_API_KEY`

### Erro "Not allowed by CORS" (mesmo após deploy)
- **Causa:** `FRONTEND_URL` no Render não corresponde ao `Origin` do request
- **Solução:**
  1. Verifique o valor exato do `Origin` nos Live Logs (linha: `Origin recebido: ...`)
  2. Atualize `FRONTEND_URL` no Render para corresponder exatamente
  3. Redeploy e teste novamente

### Backend local não inicia (ConnectionRefusedError no teste Python)
- **Causa:** Backend não está rodando em `localhost:3001`
- **Solução:**
  ```powershell
  # Inicie o backend local (novo terminal)
  npm run dev
  # ou verifique a porta configurada (pode ser 3000 ou outra)
  ```

### Erro de parsing no PowerShell (rotate_database_credentials.ps1)
- **Causa:** Interpolação de string com `:` e `$` causando conflito
- **Solução:** Já corrigido no script atualizado; re-execute após aplicar as mudanças

---

## Resumo dos Comandos (Copy-Paste Rápido)

```powershell
# 1. Definir credenciais
$env:RENDER_API_KEY = '<YOUR_KEY>'
$env:RENDER_SERVICE_ID = '<srv-xxxxx>'
$env:VERCEL_TOKEN = '<YOUR_TOKEN>'
$env:VERCEL_PROJECT_ID = '<prj-xxxxx>'
$env:BRANCH = 'chore/health-deploy-readme'
$env:FRONTEND_URL = 'https://notification-service-ed6pf2x77-carolines-projects-4e5c6800.vercel.app'
$env:API_BASE_URL = 'https://notification-service-rmnv.onrender.com/api/v1'
$env:SINGLE_RECIPIENT_EMAIL = 'carolinezolet@gmail.com'

# 2. Deploy automático (atualiza envs + dispara deploys)
.\scripts\automation\auto_full_deploy.ps1 -Branch $env:BRANCH -FrontendUrl $env:FRONTEND_URL -ApiBaseUrl $env:API_BASE_URL

# 3. Rotacionar DATABASE_URL (segurança)
.\scripts\automation\rotate_database_credentials.ps1

# 4. Testar endpoint com CORS
$headers = @{ Origin = $env:FRONTEND_URL }
Invoke-RestMethod -Uri "$($env:API_BASE_URL.Replace('/api/v1',''))/api/v1/admin/unidades" -Headers $headers -Method Get | ConvertTo-Json

# 5. Commit e push
git add .
git commit -m "feat: SINGLE_RECIPIENT_EMAIL, PDF validation, improved automation"
git push origin chore/health-deploy-readme

# 6. Abrir PR no navegador
start "https://github.com/Carol-zolet/notification-service/compare/chore/health-deploy-readme"
```

---

**Última atualização:** 12 de novembro de 2025  
**Autor:** GitHub Copilot (automação de deploys e segurança)

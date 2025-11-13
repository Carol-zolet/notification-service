# 🚀 DEPLOY RÁPIDO - Notification Service

## ✅ Status Atual
- **Git Push**: Completo (branch: chore/health-deploy-readme)
- **Próximo Passo**: Deploy no Render e Vercel

---

## 🎯 Opção 1: Deploy Manual (Mais Simples)

### Backend (Render)

1. Acesse: https://dashboard.render.com/
2. Encontre o serviço: `notification-service`
3. Clique em **"Manual Deploy"**
4. Selecione branch: `chore/health-deploy-readme`
5. Clique em **"Deploy"**
6. Aguarde até ficar "Live" (2-5 min)

### Frontend (Vercel)

1. Acesse: https://vercel.com/dashboard
2. Encontre seu projeto
3. Vá em **Deployments**
4. Clique em **"Redeploy"** no último deploy
5. Aguarde até ficar "Ready" (1-2 min)

---

## 🤖 Opção 2: Deploy Automático via Script

### Pré-requisitos
Obtenha estas credenciais:

1. **RENDER_API_KEY**: https://dashboard.render.com/account/api-keys
2. **RENDER_SERVICE_ID**: Render Dashboard → seu serviço → Settings (formato: srv-xxxxx)
3. **VERCEL_TOKEN**: https://vercel.com/account/tokens
4. **VERCEL_PROJECT_ID**: Vercel → Settings → General

### Configurar variáveis no PowerShell

```powershell
# Credenciais Render
$env:RENDER_API_KEY = '<SUA_RENDER_API_KEY>'
$env:RENDER_SERVICE_ID = '<srv-xxxxx>'

# Credenciais Vercel
$env:VERCEL_TOKEN = '<SEU_VERCEL_TOKEN>'
$env:VERCEL_PROJECT_ID = '<prj-xxxxx>'

# URLs (ajuste conforme sua configuração)
$env:FRONTEND_URL = 'https://seu-app.vercel.app'
$env:API_BASE_URL = 'https://notification-service-rmnv.onrender.com/api/v1'
```

### Executar Deploy

```powershell
cd "c:\Users\TI26Fit\Downloads\notification-service\notification-service"

# Deploy completo (backend + frontend)
.\scripts\automation\auto_full_deploy.ps1 `
  -Branch "chore/health-deploy-readme" `
  -FrontendUrl $env:FRONTEND_URL `
  -ApiBaseUrl $env:API_BASE_URL
```

---

## 🔐 Opção 3: Rotacionar Credenciais do Banco (Segurança)

⚠️ **IMPORTANTE**: O DATABASE_URL no arquivo `env.production` foi exposto e deve ser rotacionado.

```powershell
# Definir credenciais
$env:RENDER_API_KEY = '<SUA_API_KEY>'
$env:RENDER_SERVICE_ID = '<srv-xxxxx>'
$env:DATABASE_URL = '<URL_ATUAL_DO_BANCO>'

# Executar rotação
.\scripts\automation\rotate_database_credentials.ps1
```

---

## ✅ Validação Pós-Deploy

### 1. Testar Health Endpoint

```powershell
$api = "https://notification-service-rmnv.onrender.com"
Invoke-RestMethod -Uri "$api/health" | ConvertTo-Json
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-13T..."
}
```

### 2. Testar API com CORS

```powershell
$headers = @{ Origin = 'https://seu-app.vercel.app' }
$api = "https://notification-service-rmnv.onrender.com/api/v1"

Invoke-RestMethod -Uri "$api/admin/unidades" -Headers $headers
```

### 3. Verificar Logs no Render

1. Render Dashboard → seu serviço → **Logs**
2. Procure por:
   - ✅ `Servidor de Alertas API rodando na porta 10000`
   - ✅ `Allowed origins: [...]`
   - ✅ `FRONTEND_URL presente: true`

---

## 🆘 Troubleshooting

### Deploy falhou no Render
- Verifique se `DATABASE_URL` está configurado
- Verifique os logs de build
- Certifique-se de que `prisma migrate deploy` rodou

### CORS Error no Frontend
- Atualize `FRONTEND_URL` no Render Environment
- Valor deve ser exato (sem barra final): `https://seu-app.vercel.app`
- Após atualizar, faça redeploy

### Frontend não conecta na API
- Verifique `VITE_API_BASE_URL` no Vercel
- Valor correto: `https://notification-service-rmnv.onrender.com/api/v1`
- Após atualizar, faça redeploy

---

## 📊 URLs Finais

Após deploy bem-sucedido:

- **Repositório**: https://github.com/Carol-zolet/notification-service
- **API Backend**: https://notification-service-rmnv.onrender.com
- **Frontend**: https://seu-app.vercel.app
- **Health Check**: https://notification-service-rmnv.onrender.com/health

---

## 📝 Checklist Final

- [ ] Git push completo ✅ (FEITO)
- [ ] Deploy backend no Render
- [ ] Deploy frontend no Vercel
- [ ] CORS configurado corretamente
- [ ] Health endpoint respondendo
- [ ] Frontend carregando lista de unidades
- [ ] DATABASE_URL rotacionado (segurança)
- [ ] Teste end-to-end OK

---

**Última atualização**: 13 de novembro de 2025

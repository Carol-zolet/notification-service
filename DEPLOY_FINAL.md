# 🚀 DEPLOY FINAL - Configurações Específicas

## ✅ Status Atual

### Backend (Render)
- **URL**: https://notification-service-rmnv.onrender.com
- **Status**: ✅ ONLINE (database connected)
- **Branch**: chore/health-deploy-readme

### Frontend (Vercel)  
- **URL**: https://notification-service-a239ihe9r-carolines-projects-4e5c6800.vercel.app
- **Status**: Aguardando configuração

---

## 📋 PASSO A PASSO PARA DEPLOY COMPLETO

### 1️⃣ Configurar Backend (Render)

1. Acesse: https://dashboard.render.com/
2. Encontre o serviço: **notification-service**
3. Clique em **Environment** (na lateral esquerda)
4. Atualize/Adicione estas variáveis:

```plaintext
FRONTEND_URL=https://notification-service-a239ihe9r-carolines-projects-4e5c6800.vercel.app
CORS_ORIGIN=https://notification-service-a239ihe9r-carolines-projects-4e5c6800.vercel.app
```

5. Clique em **Save Changes**
6. Clique em **Manual Deploy** (no topo)
7. Selecione branch: **chore/health-deploy-readme**
8. Aguarde 2-5 minutos

---

### 2️⃣ Configurar Frontend (Vercel)

1. Acesse: https://vercel.com/dashboard
2. Encontre seu projeto: **notification-service**
3. Vá em **Settings** → **Environment Variables**
4. Adicione ou atualize:

```plaintext
Name: VITE_API_BASE_URL
Value: https://notification-service-rmnv.onrender.com/api/v1
Target: Production
```

5. Clique em **Save**
6. Vá em **Deployments**
7. Clique em **Redeploy** no último deployment
8. Aguarde 1-2 minutos

---

## 🧪 Validação Pós-Deploy

### Teste 1: Backend Health

```powershell
Invoke-RestMethod -Uri "https://notification-service-rmnv.onrender.com/health"
```

**Resultado esperado:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Teste 2: API com CORS

```powershell
$headers = @{ Origin = 'https://notification-service-a239ihe9r-carolines-projects-4e5c6800.vercel.app' }
Invoke-RestMethod -Uri "https://notification-service-rmnv.onrender.com/api/v1/admin/unidades" -Headers $headers
```

**Resultado esperado:** Lista de unidades (ou array vazio `[]`)

### Teste 3: Frontend

Abra no navegador:
```
https://notification-service-a239ihe9r-carolines-projects-4e5c6800.vercel.app
```

**Verificar:**
- ✅ Página carrega sem erros
- ✅ Select de unidades aparece
- ✅ Console não mostra erros de CORS
- ✅ Consegue enviar formulários

---

## 🎯 Script Automatizado (Opcional)

Se você tiver as API keys, execute:

```powershell
.\quick-deploy.ps1
```

Escolha a opção desejada:
1. **Deploy Manual** (mostra instruções)
2. **Deploy Automático** (via API)
3. **Apenas configurações** (lista variáveis)
4. **Validar deployment** (testa tudo)

---

## 📊 Monitoramento

### Logs do Render
https://dashboard.render.com/ → seu serviço → **Logs**

**Procure por:**
- `Servidor de Alertas API rodando na porta 10000`
- `Allowed origins: [...]`
- `FRONTEND_URL presente: true`

### Logs do Vercel
https://vercel.com/dashboard → seu projeto → **Deployments** → clique no deploy → **View Function Logs**

---

## 🔐 Segurança Importante

⚠️ **APÓS O DEPLOY FUNCIONAR**, você deve:

1. **Rotacionar DATABASE_URL** (credenciais expostas no git):
   ```powershell
   .\scripts\automation\rotate_database_credentials.ps1
   ```

2. **Remover CORS permissivo temporário**:
   - Editar `src/infra/main.ts`
   - Remover `callback(null, true)` temporário
   - Manter apenas allowlist estrita

---

## ✅ Checklist Final

- [ ] FRONTEND_URL configurado no Render
- [ ] Deploy backend realizado (branch: chore/health-deploy-readme)
- [ ] VITE_API_BASE_URL configurado no Vercel
- [ ] Redeploy frontend realizado
- [ ] Health endpoint respondendo OK
- [ ] API aceita requisições do frontend (sem erro CORS)
- [ ] Frontend carrega e lista unidades
- [ ] Formulário de envio funciona
- [ ] DATABASE_URL rotacionado
- [ ] CORS permissivo removido

---

## 🆘 Problemas Comuns

### CORS Error
- Verifique se `FRONTEND_URL` está **exatamente** igual à URL do Vercel
- Não deve ter barra final: ❌ `.../app/` ✅ `.../app`
- Faça redeploy do backend após alterar

### Frontend não conecta
- Verifique `VITE_API_BASE_URL` no Vercel
- Deve terminar com `/api/v1`
- Faça redeploy do frontend após alterar

### Backend não inicia
- Verifique `DATABASE_URL` no Render
- Verifique logs: pode ser erro de migração
- Execute: `npx prisma migrate deploy` no Shell do Render

---

## 📞 URLs Rápidas

- **Backend**: https://notification-service-rmnv.onrender.com
- **API**: https://notification-service-rmnv.onrender.com/api/v1
- **Frontend**: https://notification-service-a239ihe9r-carolines-projects-4e5c6800.vercel.app
- **Health**: https://notification-service-rmnv.onrender.com/health
- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard

---

**Criado em**: 13 de novembro de 2025  
**Status**: ✅ Backend Online | ⏳ Aguardando configuração do frontend
